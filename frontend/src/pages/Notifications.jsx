import { useEffect, useState } from "react";
import api, { getApiError } from "../services/api";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data.notifications || []);
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to load your notifications."));
    } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const refreshNotifications = () => {
      api.get("/notifications")
        .then(({ data }) => setNotifications(data.notifications || []))
        .catch((requestError) => setError(getApiError(requestError, "Unable to refresh notifications.")));
    };
    window.addEventListener("farmer:review-updated", refreshNotifications);
    const fallbackTimer = window.setInterval(refreshNotifications, 15000);
    return () => {
      window.removeEventListener("farmer:review-updated", refreshNotifications);
      window.clearInterval(fallbackTimer);
    };
  }, []);

  const markRead = async (diagnosisId) => {
    try {
      await api.patch(`/notifications/${diagnosisId}/read`);
      setNotifications((current) => current.map((item) => item.diagnosisId === diagnosisId ? { ...item, read: true } : item));
      window.dispatchEvent(new Event("notifications-refresh"));
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to update this notification."));
    }
  };

  const downloadReport = async (item) => {
    try {
      const { data } = await api.get(item.pdfReportUrl, { responseType: "blob" });
      if (!data.type.includes("application/pdf")) {
        const body = await data.text();
        let message = "The server did not return a PDF report.";
        try { message = JSON.parse(body).message || message; } catch { /* response was not JSON */ }
        throw new Error(message);
      }
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url; link.download = `certified-diagnosis-${item.diagnosisId}.pdf`;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) {
      const responseData = requestError.response?.data;
      if (responseData instanceof Blob) {
        try {
          const body = await responseData.text();
          const parsed = JSON.parse(body);
          setError(parsed.message || "The certified report could not be downloaded.");
          return;
        } catch { /* use the request error below */ }
      }
      setError(getApiError(requestError, requestError.message || "The certified report could not be downloaded."));
    }
  };

  return <div className="page-content farmer-notifications-page">
    <span className="eyebrow">Farmer updates</span>
    <h1>Notifications</h1>
    <p>Expert review results and certified reports for your crop diagnoses appear here.</p>
    {loading && <p>Loading notifications…</p>}
    {error && <p className="review-status-error" role="alert">{error}</p>}
    {!loading && !error && notifications.length === 0 && <p className="empty-state">No expert review notifications yet.</p>}
    <div className="farmer-notification-list">{notifications.map((item) => (
      <article className={`farmer-notification-card ${item.read ? "read" : "unread"}`} key={item.reviewId}>
        <div>
          <span className={`review-status-chip ${item.status === "REJECTED" ? "pending_expert_review" : "expert_verified"}`}>
            {item.status === "REJECTED" ? "Expert could not verify" : "Expert review complete"}
          </span>
          <h2>{item.confirmedDisease || "Diagnosis reviewed"}</h2>
          <p>Reviewed by {item.expertName} · {item.reviewedAt ? new Date(item.reviewedAt).toLocaleString() : "Recently"}</p>
        </div>
        <div className="farmer-notification-actions">
          {item.pdfReportUrl && <button type="button" className="primary-button" onClick={() => downloadReport(item)}>Download certificate</button>}
          {!item.read && <button type="button" className="secondary-button" onClick={() => markRead(item.diagnosisId)}>Mark as read</button>}
        </div>
      </article>
    ))}</div>
  </div>;
}
