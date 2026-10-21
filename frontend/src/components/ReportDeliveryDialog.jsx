import { useState } from "react";
import api, { getApiError } from "../services/api";

export default function ReportDeliveryDialog({ predictionId, onClose }) {
  const [recipient, setRecipient] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");

  const send = async (event) => {
    event.preventDefault();
    setSending(true);
    setStatus("");
    try {
      const { data } = await api.post(`/predictions/${predictionId}/send-report`, { recipient: recipient.trim() });
      setStatus(data.message || "Report sent successfully.");
    } catch (error) {
      setStatus(getApiError(error, "Unable to send the PDF. Check the destination and try again."));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="delivery-modal-backdrop" role="presentation">
      <section className="delivery-modal" role="dialog" aria-modal="true" aria-labelledby="delivery-title">
        <button type="button" className="delivery-close" onClick={onClose} aria-label="Close delivery options">×</button>
        <span className="eyebrow">Report downloaded</span>
        <h2 id="delivery-title">Send this PDF to your phone</h2>
        <p>Enter a WhatsApp number and we will send the diagnosis report as a PDF.</p>
        <form className="delivery-form" onSubmit={send}>
          <label>WhatsApp phone number
            <input
              type="tel"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="+919876543210"
              required
            />
          </label>
          <small>Use international format. WhatsApp delivery requires the configured Twilio sender.</small>
          {status && <p className="delivery-status" role="status">{status}</p>}
          <div className="delivery-actions">
            <button type="button" className="ghost-button" onClick={onClose}>Maybe later</button>
            <button type="submit" className="primary-button" disabled={sending || !recipient.trim()}>{sending ? "Sending PDF..." : "Send PDF"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
