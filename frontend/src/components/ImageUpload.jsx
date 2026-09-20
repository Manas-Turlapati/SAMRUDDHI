import { useRef, useState } from "react";

const validTypes = ["image/jpeg", "image/jpg", "image/png"];
const maxSize = 5 * 1024 * 1024;

export default function ImageUpload({ file, preview, onSelect, onRemove, disabled }) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const processFile = (candidate) => {
    if (!candidate) {
      return;
    }

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
        <span className="eyebrow">Leaf scan</span>
        <h2>Upload a clear leaf image</h2>
        <p>Use a single leaf photo with visible symptoms for the best recommendation.</p>
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
          <img src={preview} alt="Selected leaf preview" />
        ) : (
          <span>
            <strong>Drop image here or browse</strong>
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

      <div className="upload-actions">
        <button type="button" className="secondary-button" onClick={() => inputRef.current?.click()} disabled={disabled}>
          Choose image
        </button>
        {file && (
          <button type="button" className="ghost-button" onClick={onRemove} disabled={disabled}>
            Remove
          </button>
        )}
      </div>
    </section>
  );
}
