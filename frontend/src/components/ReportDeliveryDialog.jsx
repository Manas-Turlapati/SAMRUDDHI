import { useEffect, useState } from "react";
import api, { getApiError } from "../services/api";

export default function ReportDeliveryDialog({ predictionId, onClose }) {
  const [reportFile, setReportFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let active = true;
    api.get(`/predictions/${predictionId}/report`, { responseType: "blob" })
      .then(({ data }) => {
        if (active) {
          setReportFile(new File([data], `samruddhi-report-${predictionId}.pdf`, { type: "application/pdf" }));
        }
      })
      .catch((error) => {
        if (active) setStatus(getApiError(error, "Unable to prepare the PDF for sharing. You can still download it from the report page."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [predictionId]);

  const share = async () => {
    setStatus("");
    if (!reportFile) {
      setStatus("The PDF is not ready yet. Please wait a moment and try again.");
      return;
    }
    if (!navigator.share || !navigator.canShare?.({ files: [reportFile] })) {
      setStatus("This browser cannot share PDF files. Download the report and attach it in WhatsApp instead.");
      return;
    }

    setSharing(true);
    try {
      await navigator.share({
        files: [reportFile],
        title: "SAMRUDDHI Farmer Advisory Report",
        text: "Your crop diagnosis report",
      });
      setStatus("Report shared.");
    } catch (error) {
      if (error.name !== "AbortError") {
        setStatus("Unable to open the share menu. Download the report and attach it in WhatsApp instead.");
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="delivery-modal-backdrop" role="presentation">
      <section className="delivery-modal" role="dialog" aria-modal="true" aria-labelledby="delivery-title">
        <button type="button" className="delivery-close" onClick={onClose} aria-label="Close delivery options">×</button>
        <span className="eyebrow">Report downloaded</span>
        <h2 id="delivery-title">Share this PDF</h2>
        <p>Open your device’s share menu, choose WhatsApp, then confirm the recipient and send.</p>
        <div className="delivery-form">
          <small>{loading ? "Preparing your report…" : "On supported phones, you can share the PDF directly from this menu."}</small>
          {status && <p className="delivery-status" role="status">{status}</p>}
          <div className="delivery-actions">
            <button type="button" className="ghost-button" onClick={onClose}>Maybe later</button>
            <button type="button" className="primary-button" onClick={share} disabled={loading || sharing || !reportFile}>
              {loading ? "Preparing PDF…" : sharing ? "Opening share menu…" : "Share PDF"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
