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
        <span>AI</span>
        <h2>Results will appear here</h2>
        <p>Disease detection and fertilizer guidance are shown after a successful scan.</p>
      </section>
    );
  }

  const { prediction, recommendation } = result;

  return (
    <section className="result-card">
      <div className="result-header">
        <span className="eyebrow">Analysis complete</span>
        <h2>{prediction?.disease || "Disease unavailable"}</h2>
        <div className="confidence-ring">
          <strong>{asPercent(prediction?.confidence)}</strong>
          <span>Confidence</span>
        </div>
      </div>

      <div className="report-actions">
        {onDownloadReport && (
          <button type="button" className="secondary-button" onClick={onDownloadReport} disabled={downloadingReport}>
            {downloadingReport ? "Preparing report..." : "Download Report"}
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
        <section className="prescription-panel">
          <h3>Suggested next steps</h3>
          <ul>{result.diseaseInformation.actionableTreatment.actions?.map((action) => <li key={action}>{action}</li>)}</ul>
          <p>{result.diseaseInformation.actionableTreatment.labelNotice}</p>
          {result.diseaseInformation.actionableTreatment.productSearchUrl && <a className="secondary-button" href={result.diseaseInformation.actionableTreatment.productSearchUrl} target="_blank" rel="noreferrer">Find crop treatment products</a>}
        </section>
      )}

      <div className="recommendation-grid">
        <article>
          <span>Fertilizer</span>
          <strong>{recommendation?.fertilizer || "Not available"}</strong>
        </article>
        <article>
          <span>Dosage</span>
          <strong>{recommendation?.dosage || "Not available"}</strong>
        </article>
        <article>
          <span>Application Method</span>
          <strong>{recommendation?.application_method || "Not available"}</strong>
        </article>
        <article>
          <span>Frequency</span>
          <strong>{recommendation?.frequency || "Not available"}</strong>
        </article>
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
