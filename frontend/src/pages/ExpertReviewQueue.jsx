import { useEffect, useState } from "react";
import api, { getApiError } from "../services/api";
import ExpertReviewCanvas from "../components/ExpertReviewCanvas";

export default function ExpertReviewQueue() {
  const [reviews, setReviews] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadQueue = async () => {
    setLoading(true); setError("");
    try {
      const { data } = await api.get("/reviews/queue");
      setReviews(data.reviews || []);
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to load expert review queue."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadQueue(); }, []);

  if (selected) {
    const diagnosis = selected.diagnosisId;
    return <div className="page-content expert-page">
      <button type="button" className="secondary-button" onClick={() => { setSelected(null); loadQueue(); }}>← Back to review queue</button>
      <ExpertReviewCanvas diagnosis={diagnosis} reviewId={selected.reviewId} onSubmitted={() => setTimeout(() => { setSelected(null); loadQueue(); }, 800)} />
    </div>;
  }

  return <div className="page-content expert-page">
    <span className="eyebrow">Agronomist workspace</span>
    <h1>Pending disease reviews</h1>
    {loading && <p>Loading review queue…</p>}
    {error && <p className="review-status-error" role="alert">{error}</p>}
    {!loading && !error && reviews.length === 0 && <p>No diagnoses are waiting for review.</p>}
    <div className="expert-queue-list">{reviews.map((review) => (
      <article className="expert-queue-card" key={review.reviewId}>
        <div>
          <strong>{review.diagnosisId?.modelPrediction?.predictedClass || "Unknown disease"}</strong>
          <span>Confidence: {(Number(review.diagnosisId?.modelPrediction?.confidence || 0) * 100).toFixed(1)}%</span>
          <span>Flag: {review.diagnosisId?.flagReason}</span>
          <span>Farmer: {review.farmerId?.name || "Farmer"}</span>
        </div>
        <button type="button" className="primary-button" onClick={() => setSelected(review)}>Review diagnosis</button>
      </article>
    ))}</div>
  </div>;
}
