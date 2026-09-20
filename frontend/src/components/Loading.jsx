export default function Loading({ label = "Loading...", fullPage = false }) {
  return (
    <div className={fullPage ? "loading-page" : "loading-inline"} role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
