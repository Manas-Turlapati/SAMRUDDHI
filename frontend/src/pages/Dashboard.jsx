import { useEffect, useState } from "react";
import ImageUpload from "../components/ImageUpload";
import Loading from "../components/Loading";
import NearbyShops from "../components/NearbyShops";
import PredictionResult from "../components/PredictionResult";
import { useAuth } from "../context/AuthContext";
import api, { getApiError } from "../services/api";

export default function Dashboard() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState(null);
  const [predictionId, setPredictionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [loadingShops, setLoadingShops] = useState(false);
  const [shops, setShops] = useState([]);
  const [searchedShops, setSearchedShops] = useState(false);
  const [shopError, setShopError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleSelect = (selectedFile, error) => {
    setMessage(error || "");

    if (!selectedFile) {
      return;
    }

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setResult(null);
    setPredictionId("");
    setShops([]);
    setSearchedShops(false);
    setShopError("");
  };

  const handleRemove = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setFile(null);
    setPreview("");
    setResult(null);
    setPredictionId("");
    setShops([]);
    setSearchedShops(false);
    setShopError("");
    setMessage("");
  };

  const getCurrentLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Location is not supported by this browser."));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      });
    });

  const downloadReport = async () => {
    if (!predictionId) return;

    setDownloadingReport(true);
    setMessage("");

    try {
      const response = await api.get(`/predictions/${predictionId}/report`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");

      link.href = url;
      link.download = `samruddhi-report-${predictionId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(getApiError(error, "Unable to download report. Please try again."));
    } finally {
      setDownloadingReport(false);
    }
  };

  const handlePredict = async () => {
    setMessage("");

    if (!file) {
      setMessage("Please select a leaf image first.");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    setLoading(true);
    try {
      const { data } = await api.post("/predictions/predict", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const nextResult = {
        prediction: data.prediction,
        recommendation: data.recommendation,
      };
      setResult(nextResult);
      setPredictionId(data.predictionId || "");
      setShops([]);
      setSearchedShops(false);
      setShopError("");
    } catch (error) {
      setMessage(getApiError(error, "Unable to analyze the image. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const findNearbyShops = async () => {
    const fertilizer = result?.recommendation?.fertilizer;

    if (!fertilizer) {
      setShopError("Fertilizer recommendation is required before finding shops.");
      return;
    }

    setLoadingShops(true);
    setShopError("");
    setSearchedShops(false);

    try {
      const position = await getCurrentLocation();
      const { latitude, longitude } = position.coords;
      const { data } = await api.get("/shops/nearby", {
        params: {
          latitude,
          longitude,
          fertilizer,
          radiusKm: 10,
        },
      });

      setShops(data.shops || []);
      setSearchedShops(true);
    } catch (error) {
      if (error.code === 1) {
        setShopError("Location permission was denied. Allow location access to find nearby shops.");
      } else if (error.code === 2 || error.code === 3) {
        setShopError("Unable to detect your current location. Please try again.");
      } else {
        setShopError(getApiError(error, error.message || "Unable to find nearby shops."));
      }
    } finally {
      setLoadingShops(false);
    }
  };

  return (
    <div className="page-content">
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">Dashboard</span>
          <h1>Hello, {user?.name || "farmer"}</h1>
          <p>Upload a leaf image and get disease detection with fertilizer recommendation from the backend.</p>
        </div>
        <div className="dashboard-controls">
          <button type="button" className="primary-button" onClick={handlePredict} disabled={loading}>
            {loading ? "Analyzing leaf..." : "Predict Disease"}
          </button>
        </div>
      </section>

      {message && <div className="error-message dashboard-message">{message}</div>}
      {loading && <Loading label="Analyzing leaf..." />}

      <div className="dashboard-grid">
        <ImageUpload file={file} preview={preview} onSelect={handleSelect} onRemove={handleRemove} disabled={loading} />
        <PredictionResult
          result={result}
          onDownloadReport={predictionId ? downloadReport : undefined}
          downloadingReport={downloadingReport}
        />
      </div>

      {result && (
        <NearbyShops
          shops={shops}
          loading={loadingShops}
          error={shopError}
          searched={searchedShops}
          fertilizer={result.recommendation?.fertilizer}
          onFindShops={findNearbyShops}
        />
      )}
    </div>
  );
}
