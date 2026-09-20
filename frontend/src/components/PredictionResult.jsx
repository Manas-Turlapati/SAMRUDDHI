const asPercent = (confidence) => {
  const numeric = Number(confidence);
  if (Number.isNaN(numeric)) return "Not available";
  return `${Math.round((numeric <= 1 ? numeric * 100 : numeric) * 10) / 10}%`;
};

export default function PredictionResult({
  result,
  onDownloadReport,
  downloadingReport = false,
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
    </section>
  );
}
