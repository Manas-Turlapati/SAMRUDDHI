import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { getApiError } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Loading from "../components/Loading";
import ScanMap from "../components/ScanMap";
import ReportDeliveryDialog from "../components/ReportDeliveryDialog";

export default function History() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [historyData, setHistoryData] = useState([]);
  const [mapData, setMapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deliveryPredictionId, setDeliveryPredictionId] = useState("");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const [response, mapResponse] = await Promise.all([
          api.get("/predictions/history"),
          api.get("/predictions/map"),
        ]);

        if (response.data.success) {
          setHistoryData(response.data.predictions);
          setMapData(mapResponse.data.predictions || []);
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
      setDeliveryPredictionId(predictionId);
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
      style={{
        padding: "1.75rem 1.25rem 3.5rem",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <div
        className="history-header"
        style={{
          marginBottom: "1.75rem",
          background: "rgba(255, 255, 255, 0.88)",
          padding: "1.5rem 1.75rem",
          borderRadius: "1.25rem",
          border: "1px solid var(--line, #dde4d8)",
          boxShadow: "0 14px 36px rgba(24, 59, 37, 0.08)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.82rem",
            fontWeight: "800",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "var(--green-700, #24683b)",
            background: "var(--green-100, #dcebdd)",
            padding: "0.35rem 0.85rem",
            borderRadius: "999px",
            marginBottom: "0.5rem",
          }}
        >
          📋 Diagnostic Records
        </span>
        <h2
          style={{
            fontSize: "2rem",
            fontWeight: "800",
            color: "var(--green-900, #183b25)",
            margin: "0.25rem 0 0.5rem",
            letterSpacing: "-0.02em",
          }}
        >
          Diagnostic Scan History
        </h2>
        <p style={{ color: "var(--muted, #4b5563)", margin: 0, fontSize: "0.95rem" }}>
          Review past plant diagnoses, download official PDF advisory reports, and track crop recovery.
        </p>
      </div>

      {error && (
        <div
          className="error-banner"
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            padding: "1rem 1.25rem",
            borderRadius: "0.85rem",
            marginBottom: "1.5rem",
            fontWeight: "600",
          }}
        >
          {error}
        </div>
      )}

      {deliveryPredictionId && (
        <ReportDeliveryDialog
          predictionId={deliveryPredictionId}
          onClose={() => setDeliveryPredictionId("")}
        />
      )}

      <ScanMap predictions={mapData} />

      {historyData.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            background: "rgba(255, 255, 255, 0.9)",
            borderRadius: "1.25rem",
            border: "2px dashed rgba(36, 104, 59, 0.25)",
            marginTop: "1.5rem",
            boxShadow: "0 14px 36px rgba(24, 59, 37, 0.08)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🌾</div>
          <h3 style={{ color: "var(--green-900, #183b25)", margin: "0.25rem 0" }}>No Scans Yet</h3>
          <p style={{ color: "var(--muted, #4b5563)", margin: 0 }}>
            You haven't scanned any crop leaves yet. Upload a leaf picture on your Dashboard to get started.
          </p>
        </div>
      ) : (
        <div
          style={{
            overflowX: "auto",
            background: "rgba(255, 255, 255, 0.92)",
            borderRadius: "1.25rem",
            border: "1px solid var(--line, #dde4d8)",
            boxShadow: "0 18px 50px rgba(24, 59, 37, 0.08)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            marginTop: "1.5rem",
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
              <tr style={{ background: "#f4f8f3", borderBottom: "1px solid #dde4d8" }}>
                <th style={{ padding: "14px 18px", color: "var(--green-900, #183b25)", fontWeight: "800", fontSize: "0.88rem" }}>
                  Date
                </th>
                <th style={{ padding: "14px 18px", color: "var(--green-900, #183b25)", fontWeight: "800", fontSize: "0.88rem" }}>
                  Detected Diagnosis
                </th>
                <th style={{ padding: "14px 18px", color: "var(--green-900, #183b25)", fontWeight: "800", fontSize: "0.88rem" }}>
                  AI Confidence
                </th>
                <th style={{ padding: "14px 18px", color: "var(--green-900, #183b25)", fontWeight: "800", fontSize: "0.88rem", textAlign: "center" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {historyData.map((item) => (
                <tr
                  key={item._id}
                  style={{ borderBottom: "1px solid #eef2ec" }}
                >
                  <td style={{ padding: "14px 18px", color: "var(--muted, #4b5563)", fontSize: "0.92rem", fontWeight: "600" }}>
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td
                    style={{
                      padding: "14px 18px",
                      fontWeight: "700",
                      textTransform: "capitalize",
                      color: "var(--green-900, #183b25)",
                      fontSize: "0.95rem",
                    }}
                  >
                    {item.disease ? item.disease.replace(/_/g, " ") : "Healthy Leaf"}
                  </td>
                  <td style={{ padding: "14px 18px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.25rem 0.65rem",
                        borderRadius: "999px",
                        fontWeight: "700",
                        fontSize: "0.85rem",
                        background: item.confidence > 0.7 ? "#dcfce7" : "#fef3c7",
                        color: item.confidence > 0.7 ? "#15803d" : "#b45309",
                        border: item.confidence > 0.7 ? "1px solid #86efac" : "1px solid #fde68a",
                      }}
                    >
                      {(item.confidence * 100).toFixed(1)}% Accuracy
                    </span>
                  </td>
                  <td style={{ padding: "14px 18px", textAlign: "center" }}>
                    <div style={{ display: "inline-flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
                      <button
                        onClick={() => handleDownloadReport(item._id)}
                        style={{
                          background: "#ffffff",
                          color: "var(--green-900, #183b25)",
                          border: "1px solid #dde4d8",
                          padding: "8px 14px",
                          borderRadius: "0.6rem",
                          fontWeight: "700",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          transition: "all 0.15s",
                          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
                        }}
                        onMouseOver={(e) => {
                          e.target.style.background = "#f4f8f3";
                          e.target.style.borderColor = "#24683b";
                        }}
                        onMouseOut={(e) => {
                          e.target.style.background = "#ffffff";
                          e.target.style.borderColor = "#dde4d8";
                        }}
                      >
                        📄 Download PDF
                      </button>
                      <button
                        onClick={() => navigate(`/recovery?start=${item._id}`)}
                        style={{
                          background: "var(--green-700, #24683b)",
                          color: "#ffffff",
                          border: "none",
                          padding: "8px 14px",
                          borderRadius: "0.6rem",
                          fontWeight: "700",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          boxShadow: "0 4px 12px rgba(36, 104, 59, 0.2)",
                          transition: "all 0.15s",
                        }}
                        onMouseOver={(e) => {
                          e.target.style.background = "var(--green-900, #183b25)";
                          e.target.style.transform = "translateY(-1px)";
                        }}
                        onMouseOut={(e) => {
                          e.target.style.background = "var(--green-700, #24683b)";
                          e.target.style.transform = "translateY(0)";
                        }}
                        title="Track healing progress over Day 7 and Day 14"
                      >
                        🌱 Track Healing
                      </button>
                    </div>
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
