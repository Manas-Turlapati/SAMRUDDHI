import React, { useEffect, useState } from "react";
import api, { getApiError } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Loading from "../components/Loading";

export default function History() {
  const { isAuthenticated } = useAuth();
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get("/predictions/history");

        if (response.data.success) {
          setHistoryData(response.data.predictions);
        }
      } catch (err) {
        console.error("History fetch error:", err);
        setError(getApiError(err, "Failed to load diagnostic records."));
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchHistory();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const handleDownloadReport = async (predictionId) => {
    try {
      const response = await api.get(`/predictions/${predictionId}/report`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `samruddhi-report-${predictionId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failure:", err);
      alert("Error generating PDF download.");
    }
  };

  if (loading) {
    return <Loading label="Retrieving your scan history..." fullPage />;
  }

  return (
    <div
      className="history-container"
      style={{ padding: "30px", color: "#fff" }}
    >
      <div className="history-header" style={{ marginBottom: "25px" }}>
        <h2 style={{ fontSize: "24px", color: "#22c55e", marginBottom: "8px" }}>
          Diagnostic Scan History
        </h2>
        <p style={{ color: "#aaa" }}>
          Review, analyze, and download full PDF documentation for your
          previously scanned crop leaves.
        </p>
      </div>

      {error && (
        <div
          className="error-banner"
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid #ef4444",
            color: "#ef4444",
            padding: "12px",
            borderRadius: "6px",
            marginBottom: "20px",
          }}
        >
          {error}
        </div>
      )}

      {historyData.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            background: "#1e1e1e",
            borderRadius: "8px",
            border: "1px solid #333",
          }}
        >
          <p style={{ color: "#aaa" }}>
            No historical crop scans found for this account profile.
          </p>
        </div>
      ) : (
        <div
          style={{
            overflowX: "auto",
            background: "#1e1e1e",
            borderRadius: "8px",
            border: "1px solid #333",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
            }}
          >
            <thead>
              <tr
                style={{ borderBottom: "2px solid #333", background: "#111" }}
              >
                <th
                  style={{
                    padding: "14px",
                    color: "#22c55e",
                    fontWeight: "600",
                  }}
                >
                  Date
                </th>
                <th
                  style={{
                    padding: "14px",
                    color: "#22c55e",
                    fontWeight: "600",
                  }}
                >
                  Disease Target
                </th>
                <th
                  style={{
                    padding: "14px",
                    color: "#22c55e",
                    fontWeight: "600",
                  }}
                >
                  Confidence Rating
                </th>
                <th
                  style={{
                    padding: "14px",
                    color: "#22c55e",
                    fontWeight: "600",
                    textAlign: "center",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {historyData.map((item) => (
                <tr
                  key={item._id}
                  style={{ borderBottom: "1px solid #2a2a2a" }}
                >
                  <td style={{ padding: "14px", color: "#ddd" }}>
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </td>
                  <td
                    style={{
                      padding: "14px",
                      fontWeight: "500",
                      textTransform: "capitalize",
                      color: "#fff",
                    }}
                  >
                    {item.disease || "Healthy Leaf"}
                  </td>
                  <td style={{ padding: "14px" }}>
                    <span
                      style={{
                        color: item.confidence > 0.8 ? "#22c55e" : "#eab308",
                        fontWeight: "500",
                      }}
                    >
                      {(item.confidence * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td style={{ padding: "14px", textAlign: "center" }}>
                    <button
                      onClick={() => handleDownloadReport(item._id)}
                      style={{
                        background: "#22c55e",
                        color: "#fff",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "6px",
                        fontWeight: "500",
                        cursor: "pointer",
                        transition: "background 0.2s",
                      }}
                      onMouseOver={(e) =>
                        (e.target.style.background = "#16a34a")
                      }
                      onMouseOut={(e) =>
                        (e.target.style.background = "#22c55e")
                      }
                    >
                      Download PDF Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
