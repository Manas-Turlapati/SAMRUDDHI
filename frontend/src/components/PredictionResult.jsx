import WeatherRiskPanel from "./WeatherRiskPanel";

const asPercent = (confidence) => {
  const numeric = Number(confidence);
  if (Number.isNaN(numeric)) return "Not available";
  return `${Math.round((numeric <= 1 ? numeric * 100 : numeric) * 10) / 10}%`;
};

export default function PredictionResult({
  result,
  onDownloadReport,
  downloadingReport = false,
  onAnalyzeWeatherRisk,
  weatherRisk,
  weatherRiskLoading = false,
  weatherRiskError = "",
  onConsultExpert,
  phone,
  setPhone,
  expertStatus,
  expertLoading = false,
}) {
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

      {onDownloadReport && (
        <div className="report-actions">
          <button type="button" className="secondary-button" onClick={onDownloadReport} disabled={downloadingReport}>
            {downloadingReport ? "Preparing report..." : "Download Report"}
          </button>
        </div>
      )}

      {result.diseaseInformation?.actionableTreatment && (
        <section className="prescription-panel">
          <h3>Suggested next steps</h3>
          <ul>{result.diseaseInformation.actionableTreatment.actions?.map((action) => <li key={action}>{action}</li>)}</ul>
          <p>{result.diseaseInformation.actionableTreatment.labelNotice}</p>
          {result.diseaseInformation.actionableTreatment.productSearchUrl && <a className="secondary-button" href={result.diseaseInformation.actionableTreatment.productSearchUrl} target="_blank" rel="noreferrer">Find crop treatment products</a>}
        </section>
      )}

      {onConsultExpert && (
        <form className="expert-panel" onSubmit={(event) => { event.preventDefault(); onConsultExpert(); }}>
          <h3>Consult an agriculture expert</h3>
          <p>Send the diagnosis PDF and leaf photo for manual review.</p>
          <label>Phone number<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Include country code" required /></label>
          <button type="submit" className="secondary-button" disabled={expertLoading}>{expertLoading ? "Sending..." : "Send for expert review"}</button>
          {expertStatus && <p role="status">{expertStatus}</p>}
        </form>
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
