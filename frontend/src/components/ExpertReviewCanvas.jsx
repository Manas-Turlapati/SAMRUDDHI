import { useEffect, useMemo, useRef, useState } from "react";
import api, { getApiError } from "../services/api";

const DISEASE_OPTIONS = ["Early Blight", "Late Blight", "Septoria Leaf Spot", "Leaf Mold", "Bacterial Spot", "Nutrient Deficiency", "Healthy", "Other"];

export default function ExpertReviewCanvas({ diagnosis, reviewId, accessToken = "", onSubmitted }) {
  const canvasRef = useRef(null);
  const [rawImage, setRawImage] = useState(diagnosis.rawImageDataUrl || "");
  const [gradCamImage, setGradCamImage] = useState(diagnosis.gradCamDataUrl || "");
  const [imageError, setImageError] = useState("");
  const [imageReady, setImageReady] = useState(false);
  const [view, setView] = useState("raw");
  const [opacity, setOpacity] = useState(55);
  const [features, setFeatures] = useState([]);
  const [drawing, setDrawing] = useState(null);
  const [confirmedDisease, setConfirmedDisease] = useState(diagnosis.modelPrediction?.predictedClass || "");
  const [severityScore, setSeverityScore] = useState(1);
  const [prescription, setPrescription] = useState({ chemicalName: "", activeIngredient: "", dosagePerLiter: "", applicationInterval: "" });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

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
    Promise.all([loadImage("raw"), loadImage("gradcam")]).then(([raw, gradcam]) => {
      if (active) { setRawImage(raw); setGradCamImage(gradcam); }
      else objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    }).catch((error) => {
      if (active) setImageError(getApiError(error, "Unable to load the diagnosis images."));
    });
    return () => {
      active = false;
      objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    };
  }, [diagnosis._id]);

  const probabilityRows = useMemo(() => {
    const probabilities = diagnosis.modelPrediction?.probabilities;
    const entries = probabilities instanceof Map ? [...probabilities.entries()] : Object.entries(probabilities || {});
    return entries.sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 5);
  }, [diagnosis.modelPrediction?.probabilities]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    const shapes = [...features];
    if (drawing) {
      const [x1, y1] = drawing.start; const [x2, y2] = drawing.current;
      shapes.push({ geometry: { coordinates: [[[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]]] } });
    }
    shapes.forEach((feature) => {
      const ring = feature.geometry?.coordinates?.[0];
      if (!ring?.length) return;
      context.beginPath();
      context.moveTo(ring[0][0], ring[0][1]);
      ring.slice(1).forEach(([x, y]) => context.lineTo(x, y));
      context.closePath();
      context.fillStyle = "rgba(239, 68, 68, 0.2)";
      context.strokeStyle = "#ef4444";
      context.lineWidth = Math.max(2, canvas.width / 450);
      context.fill(); context.stroke();
    });
  }, [features, drawing, imageReady]);

  const canvasPoint = (event) => {
    const canvas = canvasRef.current;
    const bounds = canvas.getBoundingClientRect();
    return [
      (event.clientX - bounds.left) * canvas.width / bounds.width,
      (event.clientY - bounds.top) * canvas.height / bounds.height,
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
      const [x1, y1] = drawing.start; const [x2, y2] = end;
      setFeatures((current) => [...current, {
        type: "Feature",
        properties: { label: "lesion" },
        geometry: { type: "Polygon", coordinates: [[[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]]] },
      }]);
    }
    setDrawing(null);
  };

  const submit = async (statusOverride) => {
    setSubmitting(true); setMessage("");
    const status = statusOverride || (confirmedDisease === diagnosis.modelPrediction?.predictedClass ? "CONFIRMED" : "OVERRIDDEN");
    const canvas = canvasRef.current;
    const annotationGeoJson = { type: "FeatureCollection", imageWidth: canvas?.width || 0, imageHeight: canvas?.height || 0, features };
    try {
      await api.post(`/reviews/submit/${reviewId}`, {
        status, confirmedDisease, severityScore,
        customPrescription: prescription,
        annotationGeoJson,
      }, accessToken ? { headers: { "x-review-access": accessToken } } : undefined);
      setMessage("Review submitted and the farmer has been notified.");
      onSubmitted?.();
    } catch (error) {
      setMessage(getApiError(error, "Unable to submit this review."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="expert-review-workspace">
      <div className="expert-review-image-column">
        <div className="review-image-toolbar">
          <button type="button" className={view === "raw" ? "active" : ""} onClick={() => setView("raw")}>Original</button>
          <button type="button" className={view === "gradcam" ? "active" : ""} disabled={!gradCamImage} onClick={() => setView("gradcam")}>Grad-CAM</button>
          <button type="button" className={view === "annotate" ? "active" : ""} onClick={() => setView("annotate")}>Draw lesions</button>
          {view === "gradcam" && <label>Opacity <input type="range" min="10" max="100" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} /></label>}
          {view === "annotate" && <button type="button" onClick={() => setFeatures([])}>Clear boxes</button>}
        </div>
        {imageError && <p role="alert">{imageError}</p>}
        <div className={`review-canvas-stage ${view === "annotate" ? "drawing-enabled" : ""}`}>
          {rawImage ? <img src={rawImage} alt="Leaf under expert review" onLoad={(event) => {
            const canvas = canvasRef.current;
            if (canvas) { canvas.width = event.currentTarget.naturalWidth; canvas.height = event.currentTarget.naturalHeight; }
            setImageReady(true);
          }} /> : <div className="review-image-empty">Loading leaf image…</div>}
          {view === "gradcam" && gradCamImage && <img className="gradcam-layer" src={gradCamImage} alt="Grad-CAM heatmap overlay" style={{ opacity: opacity / 100 }} />}
          <canvas ref={canvasRef} onPointerDown={startDrawing} onPointerMove={moveDrawing} onPointerUp={finishDrawing} />
        </div>
        <p className="review-canvas-hint">{features.length} lesion region{features.length === 1 ? "" : "s"} marked</p>
      </div>

      <div className="expert-review-form-column">
        <h2>AI prediction and expert finding</h2>
        <dl className="review-metrics">
          <div><dt>AI prediction</dt><dd>{diagnosis.modelPrediction?.predictedClass}</dd></div>
          <div><dt>Confidence</dt><dd>{(Number(diagnosis.modelPrediction?.confidence || 0) * 100).toFixed(1)}%</dd></div>
          <div><dt>Shannon entropy</dt><dd>{Number(diagnosis.modelPrediction?.entropy || 0).toFixed(3)}</dd></div>
          <div><dt>Flag reason</dt><dd>{diagnosis.flagReason}</dd></div>
        </dl>
        {probabilityRows.length > 0 && <div className="review-probabilities"><strong>Top model probabilities</strong>{probabilityRows.map(([name, value]) => <span key={name}>{name}: {(Number(value) * 100).toFixed(1)}%</span>)}</div>}
        <label>Confirmed disease
          <select value={confirmedDisease} onChange={(event) => setConfirmedDisease(event.target.value)}>
            {!DISEASE_OPTIONS.includes(confirmedDisease) && <option>{confirmedDisease}</option>}
            {DISEASE_OPTIONS.map((disease) => <option key={disease}>{disease}</option>)}
          </select>
        </label>
        <label>Severity <span>{severityScore}: {severityScore === 5 ? "Defoliation" : severityScore === 1 ? "Mild" : "Moderate"}</span>
          <input type="range" min="1" max="5" value={severityScore} onChange={(event) => setSeverityScore(Number(event.target.value))} />
        </label>
        <fieldset className="review-prescription-fields">
          <legend>Prescription</legend>
          <label>Chemical name<input value={prescription.chemicalName} onChange={(event) => setPrescription({ ...prescription, chemicalName: event.target.value })} /></label>
          <label>Active ingredient<input value={prescription.activeIngredient} onChange={(event) => setPrescription({ ...prescription, activeIngredient: event.target.value })} /></label>
          <label>Dosage per liter<input value={prescription.dosagePerLiter} onChange={(event) => setPrescription({ ...prescription, dosagePerLiter: event.target.value })} /></label>
          <label>Application interval<input value={prescription.applicationInterval} onChange={(event) => setPrescription({ ...prescription, applicationInterval: event.target.value })} /></label>
        </fieldset>
        {message && <p role="status">{message}</p>}
        <div className="review-submit-actions">
          <button type="button" className="primary-button" disabled={submitting || !confirmedDisease} onClick={() => submit()}>{submitting ? "Submitting review…" : "Sign and issue certified report"}</button>
          <button type="button" className="secondary-button" disabled={submitting} onClick={() => submit("REJECTED")}>Unable to verify</button>
        </div>
      </div>
    </section>
  );
}
