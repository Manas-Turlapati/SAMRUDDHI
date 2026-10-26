import { useEffect, useState } from "react";
import ImageUpload from "../components/ImageUpload";
import Loading from "../components/Loading";
import NearbyShops from "../components/NearbyShops";
import PredictionResult from "../components/PredictionResult";
import DiagnosisReviewStatus from "../components/DiagnosisReviewStatus";
import ReportDeliveryDialog from "../components/ReportDeliveryDialog";
import { useAuth } from "../context/AuthContext";
import api, { getApiError } from "../services/api";

export default function Dashboard() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState(null);
  const [predictionId, setPredictionId] = useState("");
  const [diagnosisId, setDiagnosisId] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [loadingShops, setLoadingShops] = useState(false);
  const [shops, setShops] = useState([]);
  const [shopRadiusKm, setShopRadiusKm] = useState(10);
  const [shopRadiusExpanded, setShopRadiusExpanded] = useState(false);
  const [shopLocation, setShopLocation] = useState(null);
  const [googleMapsSearchUrl, setGoogleMapsSearchUrl] = useState("");
  const [embedMapUrl, setEmbedMapUrl] = useState("");
  const [userCoords, setUserCoords] = useState(null);
  const [searchedShops, setSearchedShops] = useState(false);
  const [shopError, setShopError] = useState("");
  const [message, setMessage] = useState("");
  const [weatherRisk, setWeatherRisk] = useState(null);
  const [weatherRiskLoading, setWeatherRiskLoading] = useState(false);
  const [weatherRiskError, setWeatherRiskError] = useState("");
  const [shareLocation, setShareLocation] = useState(false);

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
    setDiagnosisId("");
    setDeliveryOpen(false);
    setShops([]);
    setShopRadiusKm(10);
    setShopRadiusExpanded(false);
    setShopLocation(null);
    setGoogleMapsSearchUrl("");
    setEmbedMapUrl("");
    setUserCoords(null);
    setSearchedShops(false);
    setShopError("");
    setWeatherRisk(null);
    setWeatherRiskError("");
  };

  const handleRemove = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setFile(null);
    setPreview("");
    setResult(null);
    setPredictionId("");
    setDiagnosisId("");
    setShops([]);
    setShopRadiusKm(10);
    setShopRadiusExpanded(false);
    setShopLocation(null);
    setGoogleMapsSearchUrl("");
    setEmbedMapUrl("");
    setUserCoords(null);
    setSearchedShops(false);
    setShopError("");
    setWeatherRisk(null);
    setWeatherRiskError("");
    setMessage("");
  };

  const analyzeWeatherRisk = async (event, diseaseOverride) => {
    event?.preventDefault();

    const disease = diseaseOverride || result?.prediction?.disease;

    if (!disease) {
      setWeatherRiskError("Run disease prediction before checking weather risk.");
      return;
    }

    setWeatherRiskLoading(true);
    setWeatherRiskError("");

    try {
      const position = await getCurrentLocation();
      const { latitude, longitude } = position.coords;
      setUserCoords({ latitude, longitude });
      const { data } = await api.post("/weather-risk/analyze", {
        latitude,
        longitude,
        disease,
      });

      setWeatherRisk(data);
    } catch (error) {
      if (error.code === 1) {
        setWeatherRiskError("Location permission was denied. Allow location access to check weather disease risk.");
      } else if (error.code === 2 || error.code === 3) {
        setWeatherRiskError("Unable to detect your current location for weather risk.");
      } else {
        setWeatherRiskError(getApiError(error, "Unable to analyze weather risk. Please try again."));
      }
    } finally {
      setWeatherRiskLoading(false);
    }
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
      setDeliveryOpen(true);
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
      if (shareLocation) {
        try {
          const position = await getCurrentLocation();
          formData.append("latitude", String(position.coords.latitude));
          formData.append("longitude", String(position.coords.longitude));
        } catch {
          setMessage("Location was not available; analysis will continue without adding this scan to the map.");
        }
      }
      const { data } = await api.post("/predictions/predict", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const nextResult = {
        prediction: data.prediction,
        recommendation: data.recommendation,
        diseaseInformation: data.disease_information,
      };
      setMessage("Analysis completed. Your diagnosis and treatment plan are ready below.");
      setResult(nextResult);
      setWeatherRisk(null);
      setWeatherRiskError("");
      setPredictionId(data.predictionId || "");
      setDiagnosisId(data.diagnosisId || "");
      setShops([]);
      setShopRadiusKm(10);
      setShopRadiusExpanded(false);
      setShopLocation(null);
      setGoogleMapsSearchUrl("");
      setEmbedMapUrl("");
    setUserCoords(null);
      setSearchedShops(false);
      setShopError("");

      analyzeWeatherRisk(null, data.prediction?.disease);
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
      setUserCoords({ latitude, longitude });
      const { data } = await api.get("/shops/nearby", {
        params: {
          latitude,
          longitude,
          fertilizer,
          radiusKm: 10,
        },
      });

      setShops(data.shops || []);
      setShopRadiusKm(data.radiusKm || 10);
      setShopRadiusExpanded(Boolean(data.radiusExpanded));
      setShopLocation(data.detectedLocation || null);
      setGoogleMapsSearchUrl(data.googleMapsSearchUrl || "");
      setEmbedMapUrl(data.embedMapUrl || "");
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
          <span className="eyebrow">🌱 AI Crop Doctor & Prescription</span>
          <h1>Hello, {user?.name || "Farmer"}</h1>
          <p>
            Upload a crop leaf photo to identify diseases, get certified fertilizer dosage, and locate real suppliers on Google Maps.
          </p>
        </div>
        <div className="dashboard-controls">
          {result ? (
            <button type="button" className="secondary-button" onClick={handleRemove}>
              🔄 Scan Another Leaf
            </button>
          ) : (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.55rem 1rem",
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "2rem",
                color: "#065f46",
                fontSize: "0.88rem",
                fontWeight: 700,
              }}
            >
              <span>🌾</span>
              <span>Farmer Diagnostic Portal</span>
            </div>
          )}
        </div>
      </section>

      <section className="farmer-steps" aria-label="How to use disease analysis">
        <article className={!result && !loading ? "is-active" : ""}>
          <span>1</span>
          <div>
            <h2>Upload leaf photo</h2>
            <p>Select or snap a photo of the affected crop leaf.</p>
          </div>
        </article>
        <article className={loading || (result && !searchedShops) ? "is-active" : ""}>
          <span>2</span>
          <div>
            <h2>AI diagnosis & dosage</h2>
            <p>Get instant disease detection and fertilizer prescription.</p>
          </div>
        </article>
        <article className={searchedShops ? "is-active" : ""}>
          <span>3</span>
          <div>
            <h2>Nearby shops on Maps</h2>
            <p>Locate fertilizer dealers and RBK cooperatives on live maps.</p>
          </div>
        </article>
      </section>

      {message && <div className="error-message dashboard-message">{message}</div>}
      {loading && <Loading label="Analyzing leaf with AI models..." />}

      <div className="dashboard-grid">
        <ImageUpload
          file={file}
          preview={preview}
          onSelect={handleSelect}
          onRemove={handleRemove}
          disabled={loading}
          onPredict={handlePredict}
          loading={loading}
          shareLocation={shareLocation}
          onToggleShareLocation={setShareLocation}
          hasResult={Boolean(result)}
        />
        <PredictionResult
          result={result}
          predictionId={predictionId}
          onDownloadReport={predictionId ? downloadReport : undefined}
          downloadingReport={downloadingReport}
          onAnalyzeWeatherRisk={analyzeWeatherRisk}
          weatherRisk={weatherRisk}
          weatherRiskLoading={weatherRiskLoading}
          weatherRiskError={weatherRiskError}
        />
      </div>

      {diagnosisId && <DiagnosisReviewStatus diagnosisId={diagnosisId} />}

      {deliveryOpen && <ReportDeliveryDialog predictionId={predictionId} onClose={() => setDeliveryOpen(false)} />}

      {result && (
        <NearbyShops
          shops={shops}
          loading={loadingShops}
          error={shopError}
          searched={searchedShops}
          fertilizer={result.recommendation?.fertilizer}
          radiusKm={shopRadiusKm}
          radiusExpanded={shopRadiusExpanded}
          detectedLocation={shopLocation}
          googleMapsSearchUrl={googleMapsSearchUrl}
          embedMapUrl={embedMapUrl}
          userCoords={userCoords}
          onFindShops={findNearbyShops}
        />
      )}
    </div>
  );
}
