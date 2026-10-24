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
    if (!token) {
      setError("The expert review link is missing its secure authentication token.");
      return undefined;
    }
    api
      .get(`/reviews/magic-access/${encodeURIComponent(token)}`)
      .then(({ data }) => {
        if (active) {
          setReview(data);
          window.history.replaceState({}, "", window.location.pathname);
        }
      })
      .catch((requestError) => {
        if (active)
          setError(
            getApiError(requestError, "This review link is invalid, expired, or already used."),
          );
      });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <main className="magic-review-page role-expert">
      <header className="magic-review-header">
        <div className="magic-header-content">
          <span className="expert-chip">
            <span className="live-dot" /> SECURE AGRONOMIST ACCESS
          </span>
          <h1>Clinical Diagnosis Verification</h1>
          <p>
            Authenticate specimen pathology, review Grad-CAM machine learning attention, and certify
            the diagnostic report for the farmer.
          </p>
        </div>
      </header>

      {error && (
        <div className="expert-error-alert" role="alert">
          {error}
        </div>
      )}

      {submitted && (
        <div className="magic-success-card">
          <div className="success-icon">✓</div>
          <h2>Diagnostic Review Certified</h2>
          <p>
            Your agronomist review and treatment guidance have been recorded. The farmer has been
            notified and can now download the certified PDF report.
          </p>
        </div>
      )}

      {review && !submitted && (
        <ExpertReviewCanvas
          diagnosis={review.diagnosis}
          reviewId={review.reviewId}
          accessToken={review.accessToken}
          onSubmitted={() => setSubmitted(true)}
        />
      )}
    </main>
  );
}
