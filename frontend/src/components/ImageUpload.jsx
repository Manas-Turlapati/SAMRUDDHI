import { useRef, useState } from "react";

const validTypes = ["image/jpeg", "image/jpg", "image/png"];
const maxSize = 5 * 1024 * 1024;

export default function ImageUpload({
  file,
  preview,
  onSelect,
  onRemove,
  disabled,
  onPredict,
  loading = false,
  shareLocation = false,
  onToggleShareLocation,
  hasResult = false,
}) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const processFile = (candidate) => {
    if (!candidate) return;

    if (!validTypes.includes(candidate.type)) {
      onSelect(null, "Only JPG, JPEG, and PNG leaf images are supported.");
      return;
    }

    if (candidate.size > maxSize) {
      onSelect(null, "Image size must be 5 MB or smaller.");
      return;
    }

    onSelect(candidate);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    processFile(event.dataTransfer.files?.[0]);
  };

  return (
    <section className="upload-card">
      <div className="section-heading">
        <span className="eyebrow">Step 1: Leaf Scan</span>
        <h2>Upload Crop Leaf Photo</h2>
        <p>Take a clear close-up photo of an affected leaf with visible symptoms.</p>
      </div>

      <button
        type="button"
        className={`dropzone ${dragActive ? "is-dragging" : ""} ${preview ? "has-preview" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        disabled={disabled}
      >
        {preview ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
            <img src={preview} alt="Selected leaf preview" />
            <span style={{ marginTop: "0.5rem", fontSize: "0.82rem", color: "#065f46", fontWeight: 700 }}>
              ✓ Photo ready for AI diagnosis (Click to change)
            </span>
          </div>
        ) : (
          <span>
            <span style={{ fontSize: "2.5rem", marginBottom: "0.25rem" }}>🍃</span>
            <strong>Drop leaf image here or click to browse</strong>
            <small>JPG, JPEG, PNG up to 5 MB</small>
          </span>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        className="sr-only"
        onChange={(event) => processFile(event.target.files?.[0])}
        disabled={disabled}
      />

      <div className="upload-controls-stack">
        <div className="upload-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            style={{ flex: 1 }}
          >
            {file ? "Change Photo" : "Choose Image"}
          </button>
          {file && (
            <button
              type="button"
              className="ghost-button"
              onClick={onRemove}
              disabled={disabled}
            >
              Remove
            </button>
          )}
        </div>

        {onToggleShareLocation && (
          <label className="location-consent-inline">
            <input
              type="checkbox"
              checked={shareLocation}
              onChange={(e) => onToggleShareLocation(e.target.checked)}
              disabled={disabled}
            />
            <span>📍 Include GPS location for local weather risk & nearby shop finder</span>
          </label>
        )}

        {onPredict && (
          <button
            type="button"
            className="primary-button predict-action-button"
            onClick={onPredict}
            disabled={disabled || !file || loading}
          >
            {loading ? "Analyzing leaf with ML model..." : "🔍 Predict Disease & Recommend Treatment"}
          </button>
        )}
      </div>
    </section>
  );
}
