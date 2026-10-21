import { useState } from "react";
import api, { getApiError } from "../services/api";

export default function ReportDeliveryDialog({ predictionId, onClose }) {
  const [channel, setChannel] = useState("telegram");
  const [recipient, setRecipient] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");

  const send = async (event) => {
    event.preventDefault();
    setSending(true);
    setStatus("");
    try {
      const { data } = await api.post(`/predictions/${predictionId}/send-report`, { channel, recipient: recipient.trim() });
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
        <p>Choose a messaging app and enter the destination. We will send the diagnosis summary with the full report attached.</p>
        <form className="delivery-form" onSubmit={send}>
          <label>Send using
            <select value={channel} onChange={(event) => { setChannel(event.target.value); setRecipient(""); setStatus(""); }}>
              <option value="telegram">Telegram</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </label>
          <label>{channel === "telegram" ? "Telegram chat ID" : "WhatsApp phone number"}
            <input
              type={channel === "whatsapp" ? "tel" : "text"}
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder={channel === "telegram" ? "Numeric chat ID" : "+919876543210"}
              required
            />
          </label>
          <small>{channel === "telegram" ? "Open the SAMRUDDHI bot and press Start first. Telegram uses a chat ID, not an email address." : "Use international format. WhatsApp delivery requires the configured Twilio sender."}</small>
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
