import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import api, { getApiError } from "../services/api";
import Loading from "../components/Loading";

const getCropEmoji = (cropName) => {
  const name = String(cropName || "").toLowerCase();
  if (name.includes("tomato")) return "🍅";
  if (name.includes("potato")) return "🥔";
  if (name.includes("pepper") || name.includes("bell")) return "🫑";
  if (name.includes("apple")) return "🍎";
  if (name.includes("corn") || name.includes("maize")) return "🌽";
  if (name.includes("grape")) return "🍇";
  if (name.includes("rice") || name.includes("paddy")) return "🌾";
  if (name.includes("cotton")) return "🌱";
  return "🌿";
};

export default function RecoveryTracker() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const startPredictionId = searchParams.get("start");

  const [trackers, setTrackers] = useState([]);
  const [selectedTracker, setSelectedTracker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [newTrackerModalOpen, setNewTrackerModalOpen] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Upload follow-up form state
  const [followUpFile, setFollowUpFile] = useState(null);
  const [followUpPreview, setFollowUpPreview] = useState("");
  const [dayOffset, setDayOffset] = useState(7);
  const [checkpointLabel, setCheckpointLabel] = useState("Day 7 Follow-up");
  const [notes, setNotes] = useState("");
  const [submittingCheckpoint, setSubmittingCheckpoint] = useState(false);
  const fileInputRef = useRef(null);

  // New tracker from history form state
  const [selectedHistoryId, setSelectedHistoryId] = useState("");
  const [treatmentInput, setTreatmentInput] = useState("");
  const [initializingTracker, setInitializingTracker] = useState(false);

  // Fetch trackers
  const fetchTrackers = async (autoSelectId = null) => {
    try {
      const res = await api.get("/recovery/trackers");
      if (res.data?.success) {
        const list = res.data.trackers || [];
        setTrackers(list);

        if (autoSelectId) {
          const found = list.find((t) => t._id === autoSelectId);
          if (found) setSelectedTracker(found);
          else if (list.length > 0) setSelectedTracker(list[0]);
        } else if (list.length > 0) {
          setSelectedTracker((prev) => {
            if (!prev) return list[0];
            const updated = list.find((t) => t._id === prev._id);
            return updated || list[0];
          });
        }
      }
    } catch (err) {
      console.error("Failed to load recovery trackers:", err);
      setError(getApiError(err, "Unable to load crop recovery trackers."));
    } finally {
      setLoading(false);
    }
  };

  // Auto-initialize tracker if `?start=predictionId` is provided
  useEffect(() => {
    const handleInitialStart = async () => {
      if (startPredictionId) {
        try {
          setLoading(true);
          const res = await api.post("/recovery/trackers", {
            predictionId: startPredictionId,
          });
          if (res.data?.success && res.data.tracker) {
            setSuccessMsg("Crop recovery tracker started! Day 0 baseline recorded.");
            await fetchTrackers(res.data.tracker._id);
            return;
          }
        } catch (err) {
          console.error("Auto-start tracker failed:", err);
          setError(getApiError(err, "Could not initialize recovery tracker for this scan."));
        }
      }
      fetchTrackers();
    };

    handleInitialStart();
  }, [startPredictionId]);

  // Load history list for "Start New Tracker" modal
  const openNewTrackerModal = async () => {
    setNewTrackerModalOpen(true);
    setLoadingHistory(true);
    try {
      const res = await api.get("/predictions/history");
      if (res.data?.success) {
        setHistoryList(res.data.predictions || []);
        if (res.data.predictions?.length > 0) {
          setSelectedHistoryId(res.data.predictions[0]._id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch past scans:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCreateNewTracker = async (e) => {
    e.preventDefault();
    if (!selectedHistoryId) return;

    setInitializingTracker(true);
    setError("");
    try {
      const res = await api.post("/recovery/trackers", {
        predictionId: selectedHistoryId,
        treatmentApplied: treatmentInput,
      });

      if (res.data?.success) {
        setSuccessMsg("New Crop Recovery Tracker activated!");
        setNewTrackerModalOpen(false);
        setTreatmentInput("");
        await fetchTrackers(res.data.tracker?._id);
      }
    } catch (err) {
      setError(getApiError(err, "Failed to initialize recovery tracker."));
    } finally {
      setInitializingTracker(false);
    }
  };

  // Follow-up file handler
  const handleFollowUpFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (followUpPreview) URL.revokeObjectURL(followUpPreview);
      setFollowUpFile(file);
      setFollowUpPreview(URL.createObjectURL(file));
    }
  };

  const handleSelectDay = (day) => {
    setDayOffset(day);
    setCheckpointLabel(`Day ${day} Follow-up`);
  };

  const handleUploadCheckpoint = async (e) => {
    e.preventDefault();
    if (!followUpFile || !selectedTracker) {
      setError("Please select or take a photo of the leaf for follow-up evaluation.");
      return;
    }

    setSubmittingCheckpoint(true);
    setError("");

    const formData = new FormData();
    formData.append("image", followUpFile);
    formData.append("dayOffset", String(dayOffset));
    formData.append("checkpointLabel", checkpointLabel);
    if (notes) formData.append("notes", notes);

    try {
      const res = await api.post(
        `/recovery/trackers/${selectedTracker._id}/checkpoints`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (res.data?.success) {
        const evalStatus = res.data.evaluation?.status || "EVALUATED";
        const cleanStatus = evalStatus === "RECOVERING" ? "Significant Healing Detected" : evalStatus.replace("_", " ");
        setSuccessMsg(`Day ${dayOffset} photo evaluated! Result: ${cleanStatus}.`);
        setUploadModalOpen(false);
        setFollowUpFile(null);
        if (followUpPreview) URL.revokeObjectURL(followUpPreview);
        setFollowUpPreview("");
        setNotes("");
        await fetchTrackers(selectedTracker._id);
      }
    } catch (err) {
      console.error("Failed to add follow-up checkpoint:", err);
      setError(getApiError(err, "Unable to analyze follow-up photo. Please try again."));
    } finally {
      setSubmittingCheckpoint(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "RECOVERING":
        return {
          label: "Plant is Healing (Lesion Shrinking)",
          color: "#15803d",
          bg: "#dcfce7",
          border: "#86efac",
          icon: "🌿",
        };
      case "MODERATE_IMPROVEMENT":
        return {
          label: "Moderate Improvement",
          color: "#0e7490",
          bg: "#cffafe",
          border: "#67e8f9",
          icon: "🌱",
        };
      case "STABLE":
        return {
          label: "Infection Contained (Stable)",
          color: "#b45309",
          bg: "#fef3c7",
          border: "#fde68a",
          icon: "⚖️",
        };
      case "WORSENING":
        return {
          label: "Alert: Infection Spreading",
          color: "#b91c1c",
          bg: "#fee2e2",
          border: "#fca5a5",
          icon: "⚠️",
        };
      default:
        return {
          label: "Day 0 Baseline Diagnosis",
          color: "#4338ca",
          bg: "#e0e7ff",
          border: "#c7d2fe",
          icon: "📍",
        };
    }
  };

  if (loading) {
    return <Loading label="Loading your crop recovery trackers..." fullPage />;
  }

  const baselineCheckpoint = selectedTracker?.checkpoints?.[0];
  const latestCheckpoint = selectedTracker?.checkpoints?.[selectedTracker.checkpoints.length - 1];
  const hasFollowUps = selectedTracker?.checkpoints?.length > 1;
  const statusInfo = getStatusBadge(selectedTracker?.overallStatus);
  const cropEmoji = getCropEmoji(selectedTracker?.crop);

  return (
    <div className="recovery-tracker-page">
      {/* Page Header with Nature Green Theme */}
      <div className="recovery-header">
        <div className="header-text">
          <div className="recovery-eyebrow">
            <span>🌿 Time-Lapse Healing & Follow-up</span>
          </div>
          <h1>Crop Recovery Tracker</h1>
          <p>
            Verify whether your treatments are healing your crops. Upload follow-up photos of the same plant at Day 7 and Day 14. The system calculates leaf lesion shrinkage and tells you if the disease is clearing up.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="primary-button new-tracker-btn"
            onClick={openNewTrackerModal}
          >
            <span>+</span> Track New Plant
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {error && (
        <div className="recovery-alert recovery-alert-error">
          <span>⚠️</span>
          <div>{error}</div>
          <button type="button" onClick={() => setError("")} className="close-alert">×</button>
        </div>
      )}

      {successMsg && (
        <div className="recovery-alert recovery-alert-success">
          <span>✅</span>
          <div>{successMsg}</div>
          <button type="button" onClick={() => setSuccessMsg("")} className="close-alert">×</button>
        </div>
      )}

      {/* Helpful Farmer Guidance Tip */}
      <div
        style={{
          background: "rgba(240, 248, 241, 0.9)",
          border: "1px solid #cce5cf",
          borderRadius: "0.85rem",
          padding: "0.85rem 1.25rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          color: "#1b4d29",
          fontSize: "0.92rem",
          fontWeight: "500",
        }}
      >
        <span style={{ fontSize: "1.4rem" }}>💡</span>
        <div>
          <strong>Tip for Farmers:</strong> Take follow-up photos in natural daylight at the same angle as your Day 0 scan for the most accurate healing calculation.
        </div>
      </div>

      {/* If no trackers yet */}
      {trackers.length === 0 ? (
        <div className="recovery-empty-state">
          <div className="empty-icon">🌱</div>
          <h2>No Plant Trackers Active Yet</h2>
          <p>
            Start tracking treatment progress for any previously scanned crop leaf. Compare baseline scans with Day 7 and Day 14 follow-up photos to verify disease healing.
          </p>
          <div className="empty-actions">
            <button
              type="button"
              className="primary-button"
              onClick={openNewTrackerModal}
            >
              🌱 Select from Past Scans
            </button>
            <Link to="/dashboard" className="secondary-button">
              🌾 Scan a New Crop Leaf First
            </Link>
          </div>
        </div>
      ) : (
        <div className="recovery-workspace">
          {/* Tracker Carousel / Selector */}
          <div className="tracker-selector-bar">
            <span className="selector-label">Your Monitored Plants:</span>
            <div className="tracker-tabs">
              {trackers.map((tracker) => {
                const isSelected = selectedTracker?._id === tracker._id;
                const badge = getStatusBadge(tracker.overallStatus);
                const emoji = getCropEmoji(tracker.crop);
                return (
                  <button
                    key={tracker._id}
                    type="button"
                    className={`tracker-tab-pill ${isSelected ? "active" : ""}`}
                    onClick={() => setSelectedTracker(tracker)}
                  >
                    <span className="tab-crop-mark">{emoji}</span>
                    <div className="tab-info">
                      <strong>{tracker.crop}</strong>
                      <small>{tracker.initialDisease.replace(/_/g, " ")}</small>
                    </div>
                    <span
                      className="tab-status-dot"
                      style={{ backgroundColor: badge.color }}
                      title={badge.label}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Tracker Overview Card */}
          {selectedTracker && (
            <div className="tracker-overview-card">
              <div className="overview-main">
                <div className="crop-badge-row">
                  <span className="crop-tag">
                    {cropEmoji} {selectedTracker.crop}
                  </span>
                  <span
                    className="status-pill"
                    style={{
                      color: statusInfo.color,
                      backgroundColor: statusInfo.bg,
                      borderColor: statusInfo.border,
                    }}
                  >
                    <span>{statusInfo.icon}</span> {statusInfo.label}
                  </span>
                  <span className="checkpoint-count">
                    {selectedTracker.checkpoints?.length || 1} Photo Checkpoint{(selectedTracker.checkpoints?.length || 1) > 1 ? "s" : ""}
                  </span>
                </div>

                <h2 className="disease-title">{selectedTracker.initialDisease.replace(/_/g, " ")}</h2>
                <div className="treatment-note">
                  <strong>Recommended Remedy:</strong>{" "}
                  <span>{selectedTracker.treatmentApplied || "Standard Agronomic Protocol"}</span>
                </div>
              </div>

              {/* Lesion Healing Meter */}
              <div className="healing-metric-box">
                <div className="metric-header">
                  <span>Leaf Healing Rate</span>
                  <strong style={{ color: statusInfo.color }}>
                    {selectedTracker.overallHealingPercentage > 0
                      ? `+${selectedTracker.overallHealingPercentage}% Lesion Shrinkage`
                      : selectedTracker.overallStatus === "WORSENING"
                      ? "Infection Expanding"
                      : "Awaiting Day 7 Follow-up"}
                  </strong>
                </div>

                <div className="meter-track">
                  <div
                    className="meter-fill"
                    style={{
                      width: `${Math.min(100, Math.max(10, selectedTracker.overallHealingPercentage))}%`,
                      backgroundColor: statusInfo.color,
                    }}
                  />
                </div>

                <div className="meter-labels">
                  <span>Day 0 Baseline ({selectedTracker.baselineSeverity}% spots)</span>
                  <span>Latest Status ({selectedTracker.currentSeverity}% spots)</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="overview-actions">
                <button
                  type="button"
                  className="primary-button upload-followup-cta"
                  onClick={() => setUploadModalOpen(true)}
                >
                  <span>📷</span> Upload Day 7 / 14 Photo
                </button>

                {selectedTracker.overallStatus === "WORSENING" && (
                  <button
                    type="button"
                    className="alert-expert-btn"
                    onClick={() => navigate(`/history`)}
                    title="Pathogen resistance suspected - ask an agronomist"
                  >
                    <span>🚨</span> Request Agronomist Advice
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Side-by-Side Visual Time-Lapse Comparison (Baseline vs Latest) */}
          {selectedTracker && hasFollowUps && (
            <div className="time-lapse-comparison-card">
              <div className="section-header">
                <div>
                  <h3>Side-by-Side Leaf Comparison</h3>
                  <p>Direct before-and-after photo comparison between the initial scan and your latest follow-up.</p>
                </div>
                <div
                  className="reduction-delta-pill"
                  style={{
                    color: statusInfo.color,
                    backgroundColor: statusInfo.bg,
                    borderColor: statusInfo.border,
                  }}
                >
                  <span>{statusInfo.icon}</span>
                  <strong>{selectedTracker.overallHealingPercentage}% Lesion Area Shrinkage</strong>
                </div>
              </div>

              <div className="comparison-grid">
                {/* Day 0 Baseline */}
                <div className="comparison-frame">
                  <div className="frame-header">
                    <span className="frame-tag baseline">Day 0 (Initial Scan)</span>
                    <span className="frame-date">
                      {new Date(baselineCheckpoint.capturedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="frame-image-wrapper">
                    <img
                      src={`/api/recovery/checkpoints/${baselineCheckpoint._id}/image`}
                      alt="Baseline Leaf"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24'%3E%3Cpath fill='%23666' d='M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z'/%3E%3C/svg%3E";
                      }}
                    />
                  </div>
                  <div className="frame-footer">
                    <div className="frame-metric">
                      <span>Initial Infection Area:</span>
                      <strong>{baselineCheckpoint.lesionSeverity}%</strong>
                    </div>
                    <div className="frame-condition">
                      <span>Diagnosis:</span>
                      <strong>{baselineCheckpoint.predictedDisease.replace(/_/g, " ")}</strong>
                    </div>
                  </div>
                </div>

                {/* Arrow / Delta Indicator */}
                <div className="comparison-divider">
                  <div className="divider-circle">
                    <span>➔</span>
                  </div>
                  <span className="divider-label">
                    {latestCheckpoint.dayOffset} Days Healing
                  </span>
                </div>

                {/* Latest Checkpoint */}
                <div className="comparison-frame">
                  <div className="frame-header">
                    <span className="frame-tag follow-up">{latestCheckpoint.checkpointLabel}</span>
                    <span className="frame-date">
                      {new Date(latestCheckpoint.capturedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="frame-image-wrapper">
                    <img
                      src={`/api/recovery/checkpoints/${latestCheckpoint._id}/image`}
                      alt="Follow-up Leaf"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24'%3E%3Cpath fill='%23666' d='M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z'/%3E%3C/svg%3E";
                      }}
                    />
                  </div>
                  <div className="frame-footer">
                    <div className="frame-metric">
                      <span>Current Infection Area:</span>
                      <strong style={{ color: statusInfo.color }}>
                        {latestCheckpoint.lesionSeverity}% ({latestCheckpoint.lesionReductionPct > 0 ? `-${latestCheckpoint.lesionReductionPct}% Area` : `+${Math.abs(latestCheckpoint.lesionReductionPct)}% Area`})
                      </strong>
                    </div>
                    <div className="frame-condition">
                      <span>Re-evaluation:</span>
                      <strong>{latestCheckpoint.predictedDisease.replace(/_/g, " ")}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Progression Timeline */}
          {selectedTracker && (
            <div className="recovery-timeline-section">
              <div className="section-header">
                <div>
                  <h3>Plant Care Timeline & Agronomist Advice</h3>
                  <p>Step-by-step photos and treatment directions for each milestone.</p>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setUploadModalOpen(true)}
                >
                  + Add Checkpoint Photo
                </button>
              </div>

              <div className="timeline-track">
                {selectedTracker.checkpoints?.map((cp, idx) => {
                  const cpBadge = getStatusBadge(cp.status);
                  return (
                    <div key={cp._id || idx} className="timeline-checkpoint-card">
                      <div className="checkpoint-header">
                        <div className="checkpoint-title-group">
                          <span className="checkpoint-marker-number">{idx + 1}</span>
                          <div>
                            <h4>{cp.checkpointLabel}</h4>
                            <span className="cp-timestamp">
                              {new Date(cp.capturedAt).toLocaleString(undefined, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </span>
                          </div>
                        </div>

                        <span
                          className="status-pill mini"
                          style={{
                            color: cpBadge.color,
                            backgroundColor: cpBadge.bg,
                            borderColor: cpBadge.border,
                          }}
                        >
                          {cpBadge.icon} {cpBadge.label}
                        </span>
                      </div>

                      <div className="checkpoint-body">
                        <div className="checkpoint-thumb">
                          <img
                            src={`/api/recovery/checkpoints/${cp._id}/image`}
                            alt={cp.checkpointLabel}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24'%3E%3Cpath fill='%23666' d='M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z'/%3E%3C/svg%3E";
                            }}
                          />
                        </div>

                        <div className="checkpoint-metrics">
                          <div className="metric-row">
                            <span className="m-label">AI Diagnosis:</span>
                            <span className="m-value">
                              {cp.predictedDisease.replace(/_/g, " ")} ({Math.round(cp.confidence * 100)}% accuracy)
                            </span>
                          </div>

                          <div className="metric-row">
                            <span className="m-label">Lesion Severity:</span>
                            <span className="m-value severity-val">
                              {cp.lesionSeverity}% Area
                              <div className="mini-meter">
                                <div
                                  className="mini-meter-fill"
                                  style={{
                                    width: `${cp.lesionSeverity}%`,
                                    backgroundColor: cp.lesionSeverity > 50 ? "#dc2626" : "#16a34a",
                                  }}
                                />
                              </div>
                            </span>
                          </div>

                          {idx > 0 && (
                            <div className="metric-row">
                              <span className="m-label">Healing Progress:</span>
                              <span
                                className="m-value delta-val"
                                style={{ color: cp.lesionReductionPct >= 0 ? "#15803d" : "#b91c1c" }}
                              >
                                {cp.lesionReductionPct >= 0
                                  ? `-${cp.lesionReductionPct}% Spots (Healing)`
                                  : `+${Math.abs(cp.lesionReductionPct)}% Spots (Spreading)`}
                              </span>
                            </div>
                          )}

                          {cp.notes && (
                            <div className="metric-row notes-row">
                              <span className="m-label">Farmer Log:</span>
                              <span className="m-value notes-text">{cp.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Agronomist Directive */}
                      {cp.guidance && (
                        <div className="agronomist-directive-box">
                          <div className="directive-tag">
                            <span>🌱 Agronomist Care Directive:</span>
                          </div>
                          <p>{cp.guidance}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Upload Follow-up Leaf Photo */}
      {uploadModalOpen && (
        <div className="recovery-modal-backdrop" onClick={() => !submittingCheckpoint && setUploadModalOpen(false)}>
          <div className="recovery-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Upload Follow-up Leaf Photo</h3>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setUploadModalOpen(false)}
                disabled={submittingCheckpoint}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadCheckpoint} className="modal-form">
              {/* Day Selection */}
              <div className="form-group">
                <label>How many days since first scan?</label>
                <div className="day-button-group">
                  {[7, 14, 21].map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`day-btn ${dayOffset === d ? "active" : ""}`}
                      onClick={() => handleSelectDay(d)}
                      disabled={submittingCheckpoint}
                    >
                      Day {d}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`day-btn ${![7, 14, 21].includes(dayOffset) ? "active" : ""}`}
                    onClick={() => handleSelectDay(10)}
                    disabled={submittingCheckpoint}
                  >
                    Custom Day
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="checkpointLabel">Milestone Title:</label>
                <input
                  id="checkpointLabel"
                  type="text"
                  value={checkpointLabel}
                  onChange={(e) => setCheckpointLabel(e.target.value)}
                  placeholder="e.g. Day 7 Follow-up"
                  required
                  disabled={submittingCheckpoint}
                />
              </div>

              {/* Photo Upload Dropzone */}
              <div className="form-group">
                <label>Leaf Photo:</label>
                <div
                  className={`modal-dropzone ${followUpPreview ? "has-preview" : ""}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: "none" }}
                    onChange={handleFollowUpFileChange}
                    disabled={submittingCheckpoint}
                  />

                  {followUpPreview ? (
                    <div className="preview-container">
                      <img src={followUpPreview} alt="Follow-up preview" />
                      <div className="change-overlay">
                        <span>Tap to change leaf photo</span>
                      </div>
                    </div>
                  ) : (
                    <div className="dropzone-prompt">
                      <span className="camera-icon">📷</span>
                      <strong>Tap here to take or choose photo</strong>
                      <p>Take a clear picture of the same infected leaf area in natural light.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="form-group">
                <label htmlFor="notes">Treatment / Observations Applied:</label>
                <textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Sprayed recommended fungicide 4 days ago. Yellow spots look dried out."
                  disabled={submittingCheckpoint}
                />
              </div>

              {/* Action buttons */}
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setUploadModalOpen(false)}
                  disabled={submittingCheckpoint}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={!followUpFile || submittingCheckpoint}
                >
                  {submittingCheckpoint ? "Calculating Healing Rate..." : "Analyze & Save Follow-up"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Start Tracker From History */}
      {newTrackerModalOpen && (
        <div className="recovery-modal-backdrop" onClick={() => !initializingTracker && setNewTrackerModalOpen(false)}>
          <div className="recovery-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Track a Plant From Your Past Scans</h3>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setNewTrackerModalOpen(false)}
                disabled={initializingTracker}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewTracker} className="modal-form">
              <p className="modal-description">
                Select a previously scanned leaf to start monitoring its recovery over Day 7 and Day 14.
              </p>

              {loadingHistory ? (
                <Loading label="Loading your scan records..." />
              ) : historyList.length === 0 ? (
                <div className="empty-history-notice">
                  <p>No past scans found. Please scan a crop leaf on the dashboard first.</p>
                  <Link to="/dashboard" className="primary-button" onClick={() => setNewTrackerModalOpen(false)}>
                    Go to Scanner
                  </Link>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label htmlFor="historySelect">Choose Scanned Leaf (Day 0 Baseline):</label>
                    <select
                      id="historySelect"
                      value={selectedHistoryId}
                      onChange={(e) => setSelectedHistoryId(e.target.value)}
                      disabled={initializingTracker}
                    >
                      {historyList.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.disease.replace(/_/g, " ")} — {new Date(item.createdAt).toLocaleDateString()} ({Math.round(item.confidence * 100)}% accuracy)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="treatmentInput">Pesticide / Remedy You Plan to Apply:</label>
                    <input
                      id="treatmentInput"
                      type="text"
                      value={treatmentInput}
                      onChange={(e) => setTreatmentInput(e.target.value)}
                      placeholder="e.g. Copper Oxychloride spray or Neem oil"
                      disabled={initializingTracker}
                    />
                  </div>

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setNewTrackerModalOpen(false)}
                      disabled={initializingTracker}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="primary-button"
                      disabled={!selectedHistoryId || initializingTracker}
                    >
                      {initializingTracker ? "Starting Tracker..." : "Start Tracking Plant"}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
