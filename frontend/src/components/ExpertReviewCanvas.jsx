import { useEffect, useMemo, useRef, useState } from "react";
import api, { getApiError } from "../services/api";

const DISEASE_OPTIONS = [
  "Early Blight",
  "Late Blight",
  "Septoria Leaf Spot",
  "Leaf Mold",
  "Bacterial Spot",
  "Powdery Mildew",
  "Cedar Apple Rust",
  "Black Rot",
  "Common Rust",
  "Northern Leaf Blight",
  "Nutrient Deficiency",
  "Healthy",
  "Other / Unlisted",
];

const SEVERITY_LEVELS = [
  { level: 1, label: "Mild / Early", desc: "Isolated lesions (<10% leaf area)" },
  { level: 2, label: "Moderate", desc: "Clustered lesions (10-25% leaf area)" },
  { level: 3, label: "Significant", desc: "Spreading necrosis (25-50% leaf area)" },
  { level: 4, label: "Severe", desc: "Widespread tissue death (>50% leaf area)" },
  { level: 5, label: "Terminal", desc: "Total defoliation / necrosis" },
];

export default function ExpertReviewCanvas({ diagnosis, reviewId, accessToken = "", onSubmitted }) {
  const canvasRef = useRef(null);
  const [rawImage, setRawImage] = useState(diagnosis.rawImageDataUrl || "");
  const [gradCamImage, setGradCamImage] = useState(diagnosis.gradCamDataUrl || "");
  const [imageError, setImageError] = useState("");
  const [imageReady, setImageReady] = useState(false);
  const [view, setView] = useState("raw");
  const [opacity, setOpacity] = useState(60);
  const [features, setFeatures] = useState([]);
  const [drawing, setDrawing] = useState(null);
  const [confirmedDisease, setConfirmedDisease] = useState(
    diagnosis.modelPrediction?.predictedClass || "",
  );
  const [severityScore, setSeverityScore] = useState(1);
  const [prescription, setPrescription] = useState({
    chemicalName: "",
    activeIngredient: "",
    dosagePerLiter: "",
    applicationInterval: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  useEffect(() => {
    let active = true;
    const objectUrls = [];
    const loadImage = async (variant) => {
      const existing = variant === "gradcam" ? diagnosis.gradCamDataUrl : diagnosis.rawImageDataUrl;
      const external = variant === "gradcam" ? diagnosis.gradCamUrl : diagnosis.rawImageUrl;
      if (existing) return existing;
      if (external?.startsWith("https://")) return external;
      if (variant === "gradcam" && !diagnosis.gradCamUrl) return "";
      const response = await api.get(`/diagnoses/${diagnosis._id}/image`, {
        params: variant === "gradcam" ? { variant: "gradcam" } : {},
        responseType: "blob",
      });
      const objectUrl = URL.createObjectURL(response.data);
      objectUrls.push(objectUrl);
      return objectUrl;
    };

    Promise.all([loadImage("raw"), loadImage("gradcam")])
      .then(([raw, gradcam]) => {
        if (active) {
          setRawImage(raw);
          setGradCamImage(gradcam);
        } else {
          objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
        }
      })
      .catch((error) => {
        if (active) setImageError(getApiError(error, "Unable to load the diagnosis images."));
      });

    return () => {
      active = false;
      objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    };
  }, [diagnosis._id]);

  const probabilityRows = useMemo(() => {
    const probabilities = diagnosis.modelPrediction?.probabilities;
    const entries =
      probabilities instanceof Map
        ? [...probabilities.entries()]
        : Object.entries(probabilities || {});
    return entries.sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 5);
  }, [diagnosis.modelPrediction?.probabilities]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    const shapes = [...features];
    if (drawing) {
      const [x1, y1] = drawing.start;
      const [x2, y2] = drawing.current;
      shapes.push({
        geometry: { coordinates: [[[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]]] },
      });
    }
    shapes.forEach((feature) => {
      const ring = feature.geometry?.coordinates?.[0];
      if (!ring?.length) return;
      context.beginPath();
      context.moveTo(ring[0][0], ring[0][1]);
      ring.slice(1).forEach(([x, y]) => context.lineTo(x, y));
      context.closePath();
      context.fillStyle = "rgba(239, 68, 68, 0.25)";
      context.strokeStyle = "#ef4444";
      context.lineWidth = Math.max(2, canvas.width / 400);
      context.fill();
      context.stroke();
    });
  }, [features, drawing, imageReady]);

  const canvasPoint = (event) => {
    const canvas = canvasRef.current;
    const bounds = canvas.getBoundingClientRect();
    return [
      ((event.clientX - bounds.left) * canvas.width) / bounds.width,
      ((event.clientY - bounds.top) * canvas.height) / bounds.height,
    ];
  };

  const startDrawing = (event) => {
    if (view !== "annotate") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = canvasPoint(event);
    setDrawing({ start: point, current: point });
  };

  const moveDrawing = (event) => {
    if (drawing) setDrawing((current) => ({ ...current, current: canvasPoint(event) }));
  };

  const finishDrawing = (event) => {
    if (!drawing) return;
    const end = canvasPoint(event);
    if (Math.abs(end[0] - drawing.start[0]) > 4 && Math.abs(end[1] - drawing.start[1]) > 4) {
      const [x1, y1] = drawing.start;
      const [x2, y2] = end;
      setFeatures((current) => [
        ...current,
        {
          type: "Feature",
          properties: { label: "lesion" },
          geometry: {
            type: "Polygon",
            coordinates: [[[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]]],
          },
        },
      ]);
    }
    setDrawing(null);
  };

  const undoLastFeature = () => {
    setFeatures((current) => current.slice(0, -1));
  };

  const submit = async (statusOverride) => {
    setSubmitting(true);
    setMessage("");
    const isOverride = confirmedDisease !== diagnosis.modelPrediction?.predictedClass;
    const status =
      statusOverride ||
      (isOverride ? "OVERRIDDEN" : "CONFIRMED");
    const canvas = canvasRef.current;
    const annotationGeoJson = {
      type: "FeatureCollection",
      imageWidth: canvas?.width || 0,
      imageHeight: canvas?.height || 0,
      features,
    };

    try {
      await api.post(
        `/reviews/submit/${reviewId}`,
        {
          status,
          confirmedDisease,
          severityScore,
          customPrescription: prescription,
          annotationGeoJson,
        },
        accessToken ? { headers: { "x-review-access": accessToken } } : undefined,
      );
      setMessageType("success");
      setMessage(
        `Review certified as ${status}. Farmer report and notification dispatched successfully.`,
      );
      onSubmitted?.();
    } catch (error) {
      setMessageType("error");
      setMessage(getApiError(error, "Unable to submit this review."));
    } finally {
      setSubmitting(false);
    }
  };

  const confidence = Number(diagnosis.modelPrediction?.confidence || 0);

  return (
    <section className="expert-review-workspace">
      {/* Specimen Visual Inspection Station */}
      <div className="expert-review-image-column">
        <div className="image-column-header">
          <div className="specimen-title-row">
            <span className="specimen-tag">SPECIMEN INSPECTION</span>
            <span className="specimen-id">Ref: #{diagnosis._id?.slice(-8) || "000"}</span>
          </div>

          <div className="review-image-toolbar">
            <div className="view-mode-buttons">
              <button
                type="button"
                className={`mode-btn ${view === "raw" ? "active" : ""}`}
                onClick={() => setView("raw")}
              >
                RGB Specimen
              </button>
              <button
                type="button"
                className={`mode-btn ${view === "gradcam" ? "active" : ""}`}
                disabled={!gradCamImage}
                onClick={() => setView("gradcam")}
              >
                Grad-CAM Heatmap
              </button>
              <button
                type="button"
                className={`mode-btn ${view === "annotate" ? "active" : ""}`}
                onClick={() => setView("annotate")}
              >
                Annotate Lesions
              </button>
            </div>

            {view === "gradcam" && (
              <div className="gradcam-slider-wrap">
                <label htmlFor="cam-opacity">
                  Heatmap Blend: <strong>{opacity}%</strong>
                </label>
                <input
                  id="cam-opacity"
                  type="range"
                  min="10"
                  max="100"
                  value={opacity}
                  onChange={(event) => setOpacity(Number(event.target.value))}
                />
              </div>
            )}

            {view === "annotate" && (
              <div className="annotation-action-bar">
                <button
                  type="button"
                  className="canvas-tool-btn"
                  onClick={undoLastFeature}
                  disabled={features.length === 0}
                >
                  ↩ Undo Box
                </button>
                <button
                  type="button"
                  className="canvas-tool-btn danger"
                  onClick={() => setFeatures([])}
                  disabled={features.length === 0}
                >
                  ✕ Clear All ({features.length})
                </button>
              </div>
            )}
          </div>
        </div>

        {imageError && (
          <div className="expert-image-error" role="alert">
            {imageError}
          </div>
        )}

        <div className={`review-canvas-stage ${view === "annotate" ? "drawing-enabled" : ""}`}>
          {rawImage ? (
            <img
              src={rawImage}
              alt="Leaf specimen under expert review"
              onLoad={(event) => {
                const canvas = canvasRef.current;
                if (canvas) {
                  canvas.width = event.currentTarget.naturalWidth;
                  canvas.height = event.currentTarget.naturalHeight;
                }
                setImageReady(true);
              }}
            />
          ) : (
            <div className="review-image-empty">
              <span className="loading-spinner" />
              <span>Loading high-resolution leaf specimen…</span>
            </div>
          )}

          {view === "gradcam" && gradCamImage && (
            <img
              className="gradcam-layer"
              src={gradCamImage}
              alt="Grad-CAM saliency overlay"
              style={{ opacity: opacity / 100 }}
            />
          )}

          <canvas
            ref={canvasRef}
            onPointerDown={startDrawing}
            onPointerMove={moveDrawing}
            onPointerUp={finishDrawing}
          />
        </div>

        <div className="canvas-footer-hints">
          <div className="feature-counter">
            <span className="dot-indicator" />
            <span>
              <strong>{features.length}</strong> lesion region{features.length === 1 ? "" : "s"} annotated
            </span>
          </div>
          <small className="hint-text">
            {view === "annotate"
              ? "Drag on image to enclose fungal/bacterial lesion bounding boxes for active learning."
              : "Grad-CAM reveals which leaf regions triggered the deep neural network prediction."}
          </small>
        </div>
      </div>

      {/* Clinical Pathology Assessment Panel */}
      <div className="expert-review-form-column">
        <div className="form-column-header">
          <span className="form-eyebrow">PATHOLOGICAL EVALUATION</span>
          <h2>Diagnostic Assessment</h2>
        </div>

        {/* AI Telemetry Card */}
        <div className="expert-telemetry-box">
          <div className="telemetry-row main-pred">
            <div>
              <span className="telemetry-label">AI PREDICTED CLASS</span>
              <strong className="telemetry-value highlight">
                {diagnosis.modelPrediction?.predictedClass || "Unknown"}
              </strong>
            </div>
            <div className="telemetry-conf-pill">
              <span>{(confidence * 100).toFixed(1)}%</span>
            </div>
          </div>

          <div className="telemetry-meta-grid">
            <div className="telemetry-cell">
              <span className="cell-label">Shannon Entropy</span>
              <strong className="cell-val">
                {Number(diagnosis.modelPrediction?.entropy || 0).toFixed(3)}
              </strong>
            </div>
            <div className="telemetry-cell">
              <span className="cell-label">Flag Reason</span>
              <strong className="cell-val text-amber">{diagnosis.flagReason || "None"}</strong>
            </div>
          </div>

          {probabilityRows.length > 0 && (
            <div className="telemetry-prob-distribution">
              <span className="prob-header">Neural Network Top Candidates</span>
              <div className="prob-bars-list">
                {probabilityRows.map(([name, value]) => {
                  const percent = (Number(value) * 100).toFixed(1);
                  return (
                    <div className="prob-item" key={name}>
                      <div className="prob-label-row">
                        <span>{name}</span>
                        <strong>{percent}%</strong>
                      </div>
                      <div className="prob-track">
                        <div className="prob-bar" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Confirmed Disease Input */}
        <div className="expert-field-group">
          <label htmlFor="confirmed-disease">
            <strong>Certified Pathology Diagnosis:</strong>
          </label>
          <div className="disease-input-row">
            <select
              id="confirmed-disease"
              value={confirmedDisease}
              onChange={(event) => setConfirmedDisease(event.target.value)}
              className="expert-select"
            >
              {!DISEASE_OPTIONS.includes(confirmedDisease) && (
                <option value={confirmedDisease}>{confirmedDisease}</option>
              )}
              {DISEASE_OPTIONS.map((disease) => (
                <option key={disease} value={disease}>
                  {disease}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Visual Severity Level Picker */}
        <div className="expert-field-group">
          <label>
            <strong>Severity Grading (Level {severityScore}/5):</strong>
          </label>
          <div className="severity-levels-grid">
            {SEVERITY_LEVELS.map((item) => (
              <button
                type="button"
                key={item.level}
                className={`severity-level-btn severity-${item.level} ${severityScore === item.level ? "active" : ""}`}
                onClick={() => setSeverityScore(item.level)}
              >
                <div className="level-number">{item.level}</div>
                <div className="level-text">
                  <strong>{item.label}</strong>
                  <small>{item.desc}</small>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Agronomist Prescription Box */}
        <fieldset className="review-prescription-fields">
          <legend className="prescription-legend">
            <span>💊 Agronomist Treatment Prescription</span>
          </legend>

          <div className="prescription-inputs-grid">
            <label>
              <span>Recommended Chemical / Fungicide</span>
              <input
                placeholder="e.g. Mancozeb 75% WP or Copper Hydroxide"
                value={prescription.chemicalName}
                onChange={(event) =>
                  setPrescription({ ...prescription, chemicalName: event.target.value })
                }
              />
            </label>

            <label>
              <span>Active Ingredient</span>
              <input
                placeholder="e.g. Mancozeb, Dithiocarbamate"
                value={prescription.activeIngredient}
                onChange={(event) =>
                  setPrescription({ ...prescription, activeIngredient: event.target.value })
                }
              />
            </label>

            <label>
              <span>Dosage (per liter of water)</span>
              <input
                placeholder="e.g. 2.0 - 2.5 g / Liter"
                value={prescription.dosagePerLiter}
                onChange={(event) =>
                  setPrescription({ ...prescription, dosagePerLiter: event.target.value })
                }
              />
            </label>

            <label>
              <span>Application Interval</span>
              <input
                placeholder="e.g. Every 7 - 10 days, max 3 sprays"
                value={prescription.applicationInterval}
                onChange={(event) =>
                  setPrescription({ ...prescription, applicationInterval: event.target.value })
                }
              />
            </label>
          </div>
        </fieldset>

        {message && (
          <div className={`expert-message-alert ${messageType}`} role="status">
            {message}
          </div>
        )}

        {/* Decision Actions */}
        <div className="review-submit-actions">
          <button
            type="button"
            className="expert-action-btn btn-confirm"
            disabled={submitting || !confirmedDisease}
            onClick={() => submit()}
          >
            {submitting ? "Signing Report…" : "✓ Certify Diagnosis & Issue Prescription"}
          </button>

          <button
            type="button"
            className="expert-action-btn btn-reject"
            disabled={submitting}
            onClick={() => submit("REJECTED")}
          >
            ✕ Inconclusive Specimen (Reject)
          </button>
        </div>
      </div>
    </section>
  );
}
