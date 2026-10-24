import { useEffect, useMemo, useState } from "react";
import api, { getApiError } from "../services/api";
import ExpertReviewCanvas from "../components/ExpertReviewCanvas";

export default function ExpertReviewQueue() {
  const [reviews, setReviews] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("urgent");

  const loadQueue = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/reviews/queue");
      setReviews(data.reviews || []);
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to load expert review queue."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const metrics = useMemo(() => {
    const total = reviews.length;
    const lowConfidence = reviews.filter(
      (r) => Number(r.diagnosisId?.modelPrediction?.confidence || 0) < 0.7,
    ).length;
    const highEntropy = reviews.filter(
      (r) =>
        r.diagnosisId?.flagReason === "HIGH_ENTROPY" ||
        Number(r.diagnosisId?.modelPrediction?.entropy || 0) > 1.2,
    ).length;
    const manualRequests = reviews.filter(
      (r) => r.diagnosisId?.flagReason === "MANUAL_REQUEST",
    ).length;

    return { total, lowConfidence, highEntropy, manualRequests };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    let result = [...reviews];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((r) => {
        const disease = (r.diagnosisId?.modelPrediction?.predictedClass || "").toLowerCase();
        const farmer = (r.farmerId?.name || "").toLowerCase();
        const email = (r.farmerId?.email || "").toLowerCase();
        return disease.includes(query) || farmer.includes(query) || email.includes(query);
      });
    }

    if (activeFilter === "low_confidence") {
      result = result.filter(
        (r) => Number(r.diagnosisId?.modelPrediction?.confidence || 0) < 0.7,
      );
    } else if (activeFilter === "high_entropy") {
      result = result.filter(
        (r) =>
          r.diagnosisId?.flagReason === "HIGH_ENTROPY" ||
          Number(r.diagnosisId?.modelPrediction?.entropy || 0) > 1.2,
      );
    } else if (activeFilter === "manual_request") {
      result = result.filter((r) => r.diagnosisId?.flagReason === "MANUAL_REQUEST");
    }

    if (sortBy === "urgent") {
      result.sort(
        (a, b) =>
          Number(a.diagnosisId?.modelPrediction?.confidence || 0) -
          Number(b.diagnosisId?.modelPrediction?.confidence || 0),
      );
    } else if (sortBy === "newest") {
      result.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
      );
    } else if (sortBy === "oldest") {
      result.sort(
        (a, b) =>
          new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(),
      );
    }

    return result;
  }, [reviews, searchQuery, activeFilter, sortBy]);

  const getFlagDetails = (reason) => {
    switch (reason) {
      case "LOW_CONFIDENCE":
        return { label: "Low Confidence (< 70%)", color: "flag-amber", icon: "⚠️" };
      case "HIGH_ENTROPY":
        return { label: "High Ambiguity (Entropy)", color: "flag-purple", icon: "📊" };
      case "MANUAL_REQUEST":
        return { label: "Farmer Escalation", color: "flag-blue", icon: "🙋" };
      default:
        return { label: reason || "Flagged for Review", color: "flag-slate", icon: "🔍" };
    }
  };

  const parseCrop = (className = "") => {
    const [crop] = className.split("___");
    return crop ? crop.replace(/_/g, " ").trim() : "Unknown Crop";
  };

  const parseDisease = (className = "") => {
    const parts = className.split("___");
    const raw = parts[1] || parts[0];
    return raw ? raw.replace(/_/g, " ").trim() : "Leaf Diagnosis";
  };

  if (selected) {
    const diagnosis = selected.diagnosisId;
    return (
      <div className="page-content expert-page">
        <div className="expert-canvas-nav">
          <button
            type="button"
            className="expert-back-btn"
            onClick={() => {
              setSelected(null);
              loadQueue();
            }}
          >
            ← Back to Triage Queue
          </button>
          <div className="expert-active-case-tag">
            <span>Case ID:</span>
            <strong>{selected.reviewId.slice(0, 12)}…</strong>
            <span className="case-farmer-tag">Farmer: {selected.farmerId?.name || "Farmer"}</span>
          </div>
        </div>

        <ExpertReviewCanvas
          diagnosis={diagnosis}
          reviewId={selected.reviewId}
          onSubmitted={() => {
            setTimeout(() => {
              setSelected(null);
              loadQueue();
            }, 800);
          }}
        />
      </div>
    );
  }

  return (
    <div className="page-content expert-page">
      {/* Agronomist Workspace Header */}
      <header className="expert-header-card">
        <div className="expert-header-titles">
          <div className="expert-badge-row">
            <span className="expert-chip">
              <span className="live-dot" /> PATHOLOGY TRIAGE CONSOLE
            </span>
            <span className="license-chip">Licensed Agronomist Portal</span>
          </div>
          <h1>Clinical Diagnosis Queue</h1>
          <p>
            Examine unresolved crop pathology specimens, inspect Grad-CAM attention heatmaps,
            annotate active lesions, and sign certified agronomist prescriptions.
          </p>
        </div>
        <div className="expert-header-actions">
          <button
            type="button"
            className="expert-refresh-btn"
            onClick={loadQueue}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "↻ Refresh Queue"}
          </button>
        </div>
      </header>

      {/* KPI Triage Metrics */}
      <section className="expert-kpi-grid" aria-label="Triage metrics">
        <div className="expert-kpi-card">
          <div className="kpi-icon-wrap kpi-blue">🔬</div>
          <div className="kpi-info">
            <span className="kpi-label">Active Triage Cases</span>
            <strong className="kpi-val">{metrics.total}</strong>
          </div>
        </div>

        <div className="expert-kpi-card">
          <div className="kpi-icon-wrap kpi-amber">⚠️</div>
          <div className="kpi-info">
            <span className="kpi-label">Low AI Confidence (&lt;70%)</span>
            <strong className="kpi-val">{metrics.lowConfidence}</strong>
          </div>
        </div>

        <div className="expert-kpi-card">
          <div className="kpi-icon-wrap kpi-purple">📊</div>
          <div className="kpi-info">
            <span className="kpi-label">High Entropy / Ambiguity</span>
            <strong className="kpi-val">{metrics.highEntropy}</strong>
          </div>
        </div>

        <div className="expert-kpi-card">
          <div className="kpi-icon-wrap kpi-teal">🙋</div>
          <div className="kpi-info">
            <span className="kpi-label">Farmer Escalations</span>
            <strong className="kpi-val">{metrics.manualRequests}</strong>
          </div>
        </div>
      </section>

      {/* Filter and Search Controls */}
      <section className="expert-controls-bar">
        <div className="expert-search-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="search"
            placeholder="Search by suspected disease, farmer, or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="expert-search-input"
          />
        </div>

        <div className="expert-filters-row">
          <div className="filter-pills" role="tablist" aria-label="Filter queue">
            <button
              type="button"
              className={`filter-pill ${activeFilter === "all" ? "active" : ""}`}
              onClick={() => setActiveFilter("all")}
            >
              All Cases ({metrics.total})
            </button>
            <button
              type="button"
              className={`filter-pill ${activeFilter === "low_confidence" ? "active" : ""}`}
              onClick={() => setActiveFilter("low_confidence")}
            >
              Low Confidence ({metrics.lowConfidence})
            </button>
            <button
              type="button"
              className={`filter-pill ${activeFilter === "high_entropy" ? "active" : ""}`}
              onClick={() => setActiveFilter("high_entropy")}
            >
              High Entropy ({metrics.highEntropy})
            </button>
            <button
              type="button"
              className={`filter-pill ${activeFilter === "manual_request" ? "active" : ""}`}
              onClick={() => setActiveFilter("manual_request")}
            >
              Escalations ({metrics.manualRequests})
            </button>
          </div>

          <div className="expert-sort-select">
            <label htmlFor="expert-sort">Sort:</label>
            <select
              id="expert-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="urgent">Urgent First (Lowest Confidence)</option>
              <option value="newest">Newest Cases First</option>
              <option value="oldest">Oldest Cases First</option>
            </select>
          </div>
        </div>
      </section>

      {/* Queue Listing State */}
      {loading && (
        <div className="expert-loading-state">
          <div className="expert-spinner" />
          <p>Connecting to diagnostic laboratory database…</p>
        </div>
      )}

      {error && (
        <div className="expert-error-alert" role="alert">
          <strong>Connection Error:</strong> {error}
        </div>
      )}

      {!loading && !error && filteredReviews.length === 0 && (
        <div className="expert-empty-card">
          <div className="empty-symbol">✓</div>
          <h3>Pathology Queue Clear</h3>
          <p>
            {searchQuery || activeFilter !== "all"
              ? "No cases matched your selected search or filter criteria."
              : "All farmer leaf specimens have been reviewed and certified. No pending reviews at this time."}
          </p>
          {(searchQuery || activeFilter !== "all") && (
            <button
              type="button"
              className="expert-reset-filter-btn"
              onClick={() => {
                setSearchQuery("");
                setActiveFilter("all");
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* Case Grid */}
      <div className="expert-cases-grid">
        {filteredReviews.map((review) => {
          const pred = review.diagnosisId?.modelPrediction || {};
          const confidence = Number(pred.confidence || 0);
          const confPercent = (confidence * 100).toFixed(1);
          const flag = getFlagDetails(review.diagnosisId?.flagReason);
          const crop = parseCrop(pred.predictedClass);
          const disease = parseDisease(pred.predictedClass);
          const createdAt = review.createdAt
            ? new Date(review.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Recent";

          return (
            <article className="expert-case-card" key={review.reviewId}>
              <div className="case-header">
                <span className={`case-flag-chip ${flag.color}`}>
                  {flag.icon} {flag.label}
                </span>
                <span className="case-time">{createdAt}</span>
              </div>

              <div className="case-body">
                <div className="case-specimen-crop">
                  <span className="crop-tag">{crop}</span>
                </div>
                <h3 className="case-disease-title">{disease}</h3>

                <div className="case-meter-block">
                  <div className="meter-label-row">
                    <span>AI Model Confidence</span>
                    <strong className={confidence < 0.7 ? "text-amber" : "text-green"}>
                      {confPercent}%
                    </strong>
                  </div>
                  <div className="case-progress-track">
                    <div
                      className={`case-progress-fill ${confidence < 0.6 ? "fill-red" : confidence < 0.8 ? "fill-amber" : "fill-green"}`}
                      style={{ width: `${Math.min(100, Math.max(5, confidence * 100))}%` }}
                    />
                  </div>
                  {Number.isFinite(pred.entropy) && (
                    <small className="case-entropy-hint">
                      Prediction Entropy: {Number(pred.entropy).toFixed(2)} (Threshold: 1.2)
                    </small>
                  )}
                </div>

                <div className="case-farmer-info">
                  <div className="farmer-avatar">
                    {(review.farmerId?.name || "F").charAt(0).toUpperCase()}
                  </div>
                  <div className="farmer-meta">
                    <strong>{review.farmerId?.name || "Farmer"}</strong>
                    <small>{review.farmerId?.email || "No email"}</small>
                  </div>
                </div>
              </div>

              <div className="case-footer">
                <button
                  type="button"
                  className="expert-triage-btn"
                  onClick={() => setSelected(review)}
                >
                  Examine &amp; Certify →
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
