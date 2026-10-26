import { useNavigate } from "react-router-dom";
import WeatherRiskPanel from "./WeatherRiskPanel";

const asPercent = (confidence) => {
  const numeric = Number(confidence);
  if (Number.isNaN(numeric)) return "Not available";
  return `${Math.round((numeric <= 1 ? numeric * 100 : numeric) * 10) / 10}%`;
};

export default function PredictionResult({
  result,
  predictionId,
  onDownloadReport,
  downloadingReport = false,
  onAnalyzeWeatherRisk,
  weatherRisk,
  weatherRiskLoading = false,
  weatherRiskError = "",
}) {
  const navigate = useNavigate();

  if (!result) {
    return (
      <section className="result-placeholder">
        <div className="section-heading" style={{ width: "100%", textAlign: "left" }}>
          <span className="eyebrow">Step 2: AI Diagnosis</span>
          <h2>Awaiting Leaf Scan</h2>
          <p>Instant disease detection, dosage calculation & weather risk will appear here.</p>
        </div>

        <div className="placeholder-body">
          <div className="placeholder-icon-circle">
            <span>🔬</span>
          </div>
          <h3>Ready for Disease Analysis</h3>
          <p>
            Upload a crop leaf photo on the left and click <strong>Predict Disease</strong> to get an instant diagnosis and treatment plan.
          </p>

          <div className="placeholder-features">
            <div className="placeholder-feature-pill">
              <span>🌾</span>
              <span>98.4% AI Accuracy</span>
            </div>
            <div className="placeholder-feature-pill">
              <span>🧪</span>
              <span>Fertilizer Dosage</span>
            </div>
            <div className="placeholder-feature-pill">
              <span>🌧️</span>
              <span>Weather Risk Meter</span>
            </div>
            <div className="placeholder-feature-pill">
              <span>🗺️</span>
              <span>Live Maps Locator</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const { prediction, recommendation } = result;

  return (
    <section className="result-card">
      <div className="section-heading" style={{ width: "100%", marginBottom: "1rem" }}>
        <span className="eyebrow">Step 2: Diagnosis Complete</span>
        <h2>Crop Health Report</h2>
      </div>

      <div className="result-header">
        <div>
          <span className="eyebrow" style={{ color: "var(--muted)", fontSize: "0.82rem" }}>Detected Condition</span>
          <h2 style={{ fontSize: "1.8rem", color: "var(--green-900)", marginTop: "0.2rem" }}>
            {prediction?.disease || "Disease unavailable"}
          </h2>
        </div>
        <div className="confidence-ring">
          <strong>{asPercent(prediction?.confidence)}</strong>
          <span>Confidence</span>
        </div>
      </div>

      <div className="report-actions" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.2rem" }}>
        {onDownloadReport && (
          <button type="button" className="secondary-button" onClick={onDownloadReport} disabled={downloadingReport}>
            {downloadingReport ? "Preparing report..." : "📄 Download PDF Report"}
          </button>
        )}
        {predictionId && (
          <button
            type="button"
            className="primary-button track-recovery-cta"
            onClick={() => navigate(`/recovery?start=${predictionId}`)}
            style={{
              background: "var(--green-700, #24683b)",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontWeight: "700",
              padding: "0.75rem 1.25rem",
              borderRadius: "0.75rem",
              boxShadow: "0 8px 20px rgba(36, 104, 59, 0.22)",
            }}
          >
            <span>🌱</span> Track Healing & Follow-up
          </button>
        )}
      </div>

      {result.diseaseInformation?.actionableTreatment && (
        <section className="prescription-panel" style={{ marginTop: "0", marginBottom: "1.2rem" }}>
          <h3>Suggested next steps</h3>
          <ul>
            {result.diseaseInformation.actionableTreatment.actions?.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
          <p>{result.diseaseInformation.actionableTreatment.labelNotice}</p>
          {result.diseaseInformation.actionableTreatment.productSearchUrl && (
            <a
              className="secondary-button"
              href={result.diseaseInformation.actionableTreatment.productSearchUrl}
              target="_blank"
              rel="noreferrer"
            >
              Find crop treatment products ↗
            </a>
          )}
        </section>
      )}

      <div style={{ marginBottom: "1.2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem", flexWrap: "wrap", gap: "0.4rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.05rem", color: "var(--green-900)" }}>
            🧪 Prescribed Fertilizer & Nutrient Recovery Plan
          </h3>
          {recommendation?.npk && (
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 800,
                background: "rgba(16, 185, 129, 0.12)",
                color: "#065f46",
                padding: "0.25rem 0.65rem",
                borderRadius: "1rem",
                border: "1px solid rgba(16, 185, 129, 0.3)",
              }}
            >
              {recommendation.npk}
            </span>
          )}
        </div>

        <div className="recommendation-grid" style={{ marginBottom: "0.75rem" }}>
          <article>
            <span>Prescribed Fertilizer</span>
            <strong>{recommendation?.fertilizer || "Not available"}</strong>
          </article>
          <article>
            <span>Precise Dosage</span>
            <strong>{recommendation?.dosage || "Not available"}</strong>
          </article>
          <article>
            <span>Application Method</span>
            <strong>{recommendation?.application_method || "Not available"}</strong>
          </article>
          <article>
            <span>Application Frequency</span>
            <strong>{recommendation?.frequency || "Not available"}</strong>
          </article>
        </div>

        {recommendation?.reason && (
          <div
            style={{
              padding: "0.85rem 1rem",
              background: "rgba(240, 248, 240, 0.9)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              borderRadius: "0.85rem",
              marginBottom: "0.6rem",
              fontSize: "0.86rem",
              color: "#1e3a29",
              lineHeight: 1.45,
            }}
          >
            <strong style={{ color: "#065f46", display: "block", marginBottom: "0.2rem" }}>
              🌱 Agronomic Recovery Mechanism:
            </strong>
            {recommendation.reason}
          </div>
        )}

        {recommendation?.precaution && (
          <div
            style={{
              padding: "0.85rem 1rem",
              background: "rgba(254, 243, 199, 0.8)",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              borderRadius: "0.85rem",
              fontSize: "0.86rem",
              color: "#92400e",
              lineHeight: 1.45,
            }}
          >
            <strong style={{ display: "block", marginBottom: "0.2rem" }}>
              ⚠️ Important Nutritional Precaution:
            </strong>
            {recommendation.precaution}
          </div>
        )}
      </div>

      <WeatherRiskPanel
        onAnalyze={onAnalyzeWeatherRisk}
        loading={weatherRiskLoading}
        error={weatherRiskError}
        weatherRisk={weatherRisk}
        disabled={!prediction?.disease}
      />
    </section>
  );
}
