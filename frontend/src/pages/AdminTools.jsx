import { useState } from "react";
import { Link } from "react-router-dom";
import api, { getApiError } from "../services/api";

export default function AdminTools() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const downloadDataset = async () => {
    setLoading(true); setMessage(""); setError("");
    try {
      const { data } = await api.get("/reviews/active-learning/export", { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url; link.download = "ldfrs-active-learning-coco.json";
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
      setMessage("Active-learning dataset downloaded.");
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to export the active-learning dataset."));
    } finally { setLoading(false); }
  };

  return <div className="page-content admin-tools-page">
    <span className="eyebrow">Administrator workspace</span>
    <h1>Admin tools</h1>
    <p>Review access and export samples verified by an expert.</p>
    <section className="admin-tool-card">
      <div><h2>Active-learning dataset</h2><p>Export expert-verified crop images, labels, and lesion annotations as COCO-style JSON.</p></div>
      <button type="button" className="primary-button" disabled={loading} onClick={downloadDataset}>{loading ? "Preparing export…" : "Download dataset"}</button>
      {message && <p role="status">{message}</p>}{error && <p className="review-status-error" role="alert">{error}</p>}
    </section>
    <section className="admin-tool-card"><div><h2>Expert review queue</h2><p>Admins can also review pending diagnoses.</p></div><Link className="secondary-button" to="/expert/reviews">Open review queue</Link></section>
  </div>;
}
