import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api, { getApiError } from "../services/api";
import ExpertReviewCanvas from "../components/ExpertReviewCanvas";

export default function MagicReview() {
  const [searchParams] = useSearchParams();
  const [review, setReview] = useState(null);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const token = searchParams.get("token");

  useEffect(() => {
    let active = true;
    if (!token) { setError("The expert review link is missing its token."); return undefined; }
    api.get(`/reviews/magic-access/${encodeURIComponent(token)}`).then(({ data }) => {
      if (active) {
        setReview(data);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }).catch((requestError) => {
      if (active) setError(getApiError(requestError, "This review link is invalid, expired, or already used."));
    });
    return () => { active = false; };
  }, [token]);

  return <main className="magic-review-page">
    <header><span className="eyebrow">SAMRUDDHI expert review</span><h1>Verify this crop diagnosis</h1></header>
    {error && <p className="review-status-error" role="alert">{error}</p>}
    {submitted && <p className="review-status-chip expert_verified">Review submitted. The farmer will see the update and can download the certified report.</p>}
    {review && !submitted && <ExpertReviewCanvas diagnosis={review.diagnosis} reviewId={review.reviewId} accessToken={review.accessToken} onSubmitted={() => setSubmitted(true)} />}
  </main>;
}
