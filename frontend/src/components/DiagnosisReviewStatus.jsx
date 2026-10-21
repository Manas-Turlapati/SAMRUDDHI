import { useEffect, useState } from "react";
import api, { getApiError } from "../services/api";

const LABELS = {
  AUTOMATED_REVIEW: "Under Automated Review",
  PENDING_EXPERT_REVIEW: "Flagged for Senior Agronomist Verification",
  EXPERT_VERIFIED: "Expert Verified",
  REVIEW_REJECTED: "Expert could not verify this diagnosis",
};

export default function DiagnosisReviewStatus({ diagnosisId }) {
  const [diagnosis, setDiagnosis] = useState(null);
  const [error, setError] = useState("");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    let active = true;
    api.get(`/diagnoses/${diagnosisId}/status`).then(({ data }) => {
      if (active) setDiagnosis(data.diagnosis);
    }).catch((requestError) => {
      if (active) setError(getApiError(requestError, "Unable to load review status."));
    });

    const handleUpdate = (event) => {
      const update = event.detail;
      if (!active || String(update?.diagnosisId) !== String(diagnosisId)) return;
      setDiagnosis((current) => ({
        ...current,
        reviewStatus: update.diagnosisStatus,
        flaggedForReview: true,
        pdfReportUrl: update.pdfReportUrl,
      }));
    };
    window.addEventListener("farmer:review-updated", handleUpdate);
    return () => {
      active = false;
      window.removeEventListener("farmer:review-updated", handleUpdate);
    };
  }, [diagnosisId]);

  const requestReview = async () => {
    setRequesting(true);
    setError("");
    try {
      await api.post(`/diagnoses/${diagnosisId}/request-review`);
      setDiagnosis((current) => ({ ...current, reviewStatus: "PENDING_EXPERT_REVIEW", flaggedForReview: true }));
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to request an expert review."));
    } finally {
      setRequesting(false);
    }
  };

  const downloadCertifiedReport = async () => {
    try {
      const response = await api.get(diagnosis.pdfReportUrl, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `certified-diagnosis-${diagnosisId}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to download the certified report."));
    }
  };

  if (!diagnosis && !error) return <p className="review-status-loading">Checking expert review status…</p>;
  return (
    <section className="diagnosis-review-status" aria-live="polite">
      <span className={`review-status-chip ${diagnosis?.reviewStatus?.toLowerCase() || ""}`}>
        {LABELS[diagnosis?.reviewStatus] || "Review status unavailable"}
      </span>
      {diagnosis?.reviewStatus === "AUTOMATED_REVIEW" && (
        <button type="button" className="secondary-button" disabled={requesting} onClick={requestReview}>
          {requesting ? "Requesting…" : "Request expert review"}
        </button>
      )}
      {diagnosis?.reviewStatus === "EXPERT_VERIFIED" && diagnosis.pdfReportUrl && (
        <button type="button" className="secondary-button" onClick={downloadCertifiedReport}>Download certified report</button>
      )}
      {error && <p className="review-status-error">{error}</p>}
    </section>
  );
}
