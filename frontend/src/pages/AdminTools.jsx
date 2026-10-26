import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { getApiError } from "../services/api";

export default function AdminTools() {
  const [loadingExport, setLoadingExport] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [exportError, setExportError] = useState("");

  const [jiraState, setJiraState] = useState({
    loading: false,
    status: null,
    testResult: null,
    error: "",
  });

  const [telemetry, setTelemetry] = useState({
    backend: { status: "checking", latency: null, details: null },
    ml: { status: "checking", latency: null, details: null },
    queue: { count: 0, loading: true },
    scans: { total: 0, loading: true },
  });

  const checkTelemetry = async () => {
    // 1. Check Backend Health
    const t0 = performance.now();
    try {
      const { data } = await api.get("/health");
      const latency = Math.round(performance.now() - t0);
      setTelemetry((prev) => ({
        ...prev,
        backend: { status: "online", latency, details: data },
      }));
    } catch (err) {
      setTelemetry((prev) => ({
        ...prev,
        backend: { status: "offline", latency: null, details: err.message },
      }));
    }

    // 2. Check ML Health
    const t1 = performance.now();
    try {
      const { data } = await api.get("/health/ml");
      const latency = Math.round(performance.now() - t1);
      setTelemetry((prev) => ({
        ...prev,
        ml: { status: data.success ? "online" : "degraded", latency, details: data },
      }));
    } catch (err) {
      setTelemetry((prev) => ({
        ...prev,
        ml: { status: "offline", latency: null, details: err.message },
      }));
    }

    // 3. Check Pending Reviews Queue
    try {
      const { data } = await api.get("/reviews/queue");
      setTelemetry((prev) => ({
        ...prev,
        queue: { count: data.reviews?.length || 0, loading: false },
      }));
    } catch {
      setTelemetry((prev) => ({
        ...prev,
        queue: { count: 0, loading: false },
      }));
    }

    // 4. Check Scans / Map Data
    try {
      const { data } = await api.get("/predictions/map");
      setTelemetry((prev) => ({
        ...prev,
        scans: { total: data.predictions?.length || 0, loading: false },
      }));
    } catch {
      setTelemetry((prev) => ({
        ...prev,
        scans: { total: 0, loading: false },
      }));
    }

    // 5. Fetch Jira Integration Status
    try {
      const { data } = await api.get("/admin/jira/status");
      setJiraState((prev) => ({ ...prev, status: data.jira }));
    } catch {
      // Ignored if not configured
    }
  };

  const handleTestJira = async () => {
    setJiraState((prev) => ({ ...prev, loading: true, testResult: null, error: "" }));
    try {
      const { data } = await api.post("/admin/jira/test");
      setJiraState((prev) => ({ ...prev, loading: false, testResult: data }));
    } catch (err) {
      setJiraState((prev) => ({
        ...prev,
        loading: false,
        error: getApiError(err, "Failed to connect to Jira"),
      }));
    }
  };

  const handleCreateSampleTicket = async () => {
    setJiraState((prev) => ({ ...prev, loading: true, testResult: null, error: "" }));
    try {
      const { data } = await api.post("/admin/jira/sample-ticket");
      setJiraState((prev) => ({
        ...prev,
        loading: false,
        testResult: {
          success: data.success,
          message: data.result?.skipped
            ? `Ticket skipped: ${data.result.reason}`
            : data.result?.url
              ? `Ticket created successfully: ${data.result.key}`
              : "Ticket operation processed",
          key: data.result?.key,
          url: data.result?.url,
        },
      }));
    } catch (err) {
      setJiraState((prev) => ({
        ...prev,
        loading: false,
        error: getApiError(err, "Failed to trigger sample ticket"),
      }));
    }
  };

  useEffect(() => {
    checkTelemetry();
  }, []);

  const downloadDataset = async () => {
    setLoadingExport(true);
    setExportMessage("");
    setExportError("");
    try {
      const { data } = await api.get("/reviews/active-learning/export", { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ldfrs-active-learning-coco-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setExportMessage("COCO Active-Learning dataset exported and downloaded successfully.");
    } catch (requestError) {
      setExportError(getApiError(requestError, "Unable to export active-learning dataset."));
    } finally {
      setLoadingExport(false);
    }
  };

  return (
    <div className="page-content admin-tools-page">
      {/* Admin Executive Header */}
      <header className="admin-header-card">
        <div className="admin-header-text">
          <div className="admin-badge-strip">
            <span className="admin-core-chip">
              <span className="admin-pulse-dot" /> SYSTEM COMMAND CENTER
            </span>
            <span className="admin-env-pill">Node Express + FastAPI PyTorch</span>
          </div>
          <h1>Platform Operations &amp; Intelligence</h1>
          <p>
            Oversee real-time microservice infrastructure, monitor Human-In-The-Loop active learning
            pipelines, and regulate role-based diagnostic permissions.
          </p>
        </div>

        <div className="admin-header-actions">
          <button type="button" className="admin-ping-btn" onClick={checkTelemetry}>
            ⚡ Ping Infrastructure
          </button>
        </div>
      </header>

      {/* Real-Time Microservice Telemetry Cards */}
      <section className="admin-telemetry-grid" aria-label="System telemetry">
        {/* Backend Node Express */}
        <div className={`telemetry-card ${telemetry.backend.status}`}>
          <div className="card-top-row">
            <span className="service-tag">EXPRESS API GATEWAY</span>
            <span className={`status-bubble ${telemetry.backend.status}`}>
              {telemetry.backend.status.toUpperCase()}
            </span>
          </div>
          <div className="service-metric">
            <strong className="metric-primary">
              {telemetry.backend.latency !== null ? `${telemetry.backend.latency} ms` : "---"}
            </strong>
            <span className="metric-sub">Port 5000 • /api/health</span>
          </div>
          <div className="card-foot">
            <small>
              {telemetry.backend.status === "online"
                ? "MongoDB connection & routing operational"
                : "Unable to reach Express backend"}
            </small>
          </div>
        </div>

        {/* FastAPI ML Inference */}
        <div className={`telemetry-card ${telemetry.ml.status}`}>
          <div className="card-top-row">
            <span className="service-tag">PYTORCH ML INFERENCE</span>
            <span className={`status-bubble ${telemetry.ml.status}`}>
              {telemetry.ml.status.toUpperCase()}
            </span>
          </div>
          <div className="service-metric">
            <strong className="metric-primary">
              {telemetry.ml.details?.mlHealth?.num_classes || 38} Classes
            </strong>
            <span className="metric-sub">EfficientNet-B0 • Port 8001</span>
          </div>
          <div className="card-foot">
            <small>
              {telemetry.ml.status === "online"
                ? `Latency: ${telemetry.ml.latency} ms • Grad-CAM active`
                : "FastAPI inference service unreachable"}
            </small>
          </div>
        </div>

        {/* HITL Review Triage Queue */}
        <div className="telemetry-card queue-card">
          <div className="card-top-row">
            <span className="service-tag">HITL REVIEW QUEUE</span>
            <span className="status-bubble queue-active">ACTIVE</span>
          </div>
          <div className="service-metric">
            <strong className="metric-primary">
              {telemetry.queue.loading ? "…" : telemetry.queue.count}
            </strong>
            <span className="metric-sub">Pending Pathologist Reviews</span>
          </div>
          <div className="card-foot">
            <Link to="/expert/reviews" className="admin-card-link">
              Open Review Queue →
            </Link>
          </div>
        </div>

        {/* Geospatial Scans Recorded */}
        <div className="telemetry-card scans-card">
          <div className="card-top-row">
            <span className="service-tag">EPIDEMIOLOGY SCANS</span>
            <span className="status-bubble telemetry-online">RECORDED</span>
          </div>
          <div className="service-metric">
            <strong className="metric-primary">
              {telemetry.scans.loading ? "…" : telemetry.scans.total}
            </strong>
            <span className="metric-sub">Geo-located Crop Diagnoses</span>
          </div>
          <div className="card-foot">
            <small>Available in disease map dashboard</small>
          </div>
        </div>
      </section>

      {/* Main Admin Modules */}
      <div className="admin-sections-grid">
        {/* Module 1: Active Learning Pipeline */}
        <section className="admin-panel-card active-learning-panel">
          <div className="panel-header">
            <div className="panel-icon-wrap">📦</div>
            <div>
              <h2>Human-In-The-Loop Active Learning Pipeline</h2>
              <p>
                Continuous model retraining dataset export with verified ground-truth labels and
                lesion segmentation polygons.
              </p>
            </div>
          </div>

          <div className="pipeline-explain-box">
            <div className="explain-step">
              <span className="step-num">1</span>
              <div>
                <strong>Farmer Scans Leaf</strong>
                <p>Confidence &lt; 70% or entropy &gt; 1.2 triggers automatic expert routing.</p>
              </div>
            </div>
            <div className="explain-arrow">➔</div>
            <div className="explain-step">
              <span className="step-num">2</span>
              <div>
                <strong>Agronomist Annotates</strong>
                <p>Certified expert verifies diagnosis and draws lesion bounding boxes.</p>
              </div>
            </div>
            <div className="explain-arrow">➔</div>
            <div className="explain-step">
              <span className="step-num">3</span>
              <div>
                <strong>COCO Dataset Export</strong>
                <p>Standardized computer vision dataset ready for PyTorch fine-tuning.</p>
              </div>
            </div>
          </div>

          <div className="export-action-box">
            <div>
              <strong>Export Annotated Dataset (COCO JSON)</strong>
              <p>Includes images, category IDs, bounding boxes, and agronomist annotations.</p>
            </div>
            <button
              type="button"
              className="admin-primary-btn"
              disabled={loadingExport}
              onClick={downloadDataset}
            >
              {loadingExport ? "Preparing COCO Dataset…" : "⬇ Download COCO Dataset"}
            </button>
          </div>

          {exportMessage && (
            <div className="admin-feedback-alert success" role="status">
              ✓ {exportMessage}
            </div>
          )}

          {exportError && (
            <div className="admin-feedback-alert error" role="alert">
              ✕ {exportError}
            </div>
          )}
        </section>

        {/* Module 2: System Security & Role Management */}
        <section className="admin-panel-card security-panel">
          <div className="panel-header">
            <div className="panel-icon-wrap">🛡️</div>
            <div>
              <h2>Role Matrix &amp; Privileged Access</h2>
              <p>Security specifications and permission tiers across the SAMRUDDHI platform.</p>
            </div>
          </div>

          <div className="roles-table-wrap">
            <table className="admin-roles-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Onboarding</th>
                  <th>Capabilities</th>
                  <th>Verification</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <span className="role-tag-farmer">FARMER</span>
                  </td>
                  <td>Public Registration</td>
                  <td>Image inference, PDF reports, disease history, weather risk</td>
                  <td>Email verification</td>
                </tr>
                <tr>
                  <td>
                    <span className="role-tag-expert">EXPERT</span>
                  </td>
                  <td>Admin Assignment</td>
                  <td>Triage queue, Grad-CAM inspection, lesion annotation, certified prescriptions</td>
                  <td>
                    <code>role: &quot;expert&quot;</code>, <code>isVerified: true</code>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span className="role-tag-admin">ADMIN</span>
                  </td>
                  <td>DB Provisioning</td>
                  <td>Full telemetry, COCO dataset export, queue management, infrastructure audit</td>
                  <td>
                    <code>role: &quot;admin&quot;</code>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="security-notice-box">
            <span className="notice-icon">ℹ️</span>
            <div>
              <strong>Database Administration Note:</strong>
              <p>
                To promote an account to expert, assign <code>role: &quot;expert&quot;</code> and{" "}
                <code>expertProfile.isVerified: true</code> in MongoDB. Public registration is
                restricted to farmer accounts to ensure diagnostic integrity.
              </p>
            </div>
          </div>
        </section>

        {/* Module 3: Atlassian Jira Cloud Integration */}
        <section className="admin-panel-card jira-panel">
          <div className="panel-header">
            <div className="panel-icon-wrap">📋</div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
                <h2 style={{ margin: 0 }}>Atlassian Jira Cloud Integration</h2>
                <span
                  className={`status-bubble ${
                    jiraState.status?.configured && jiraState.status?.enabled
                      ? "telemetry-online"
                      : "telemetry-degraded"
                  }`}
                  style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem" }}
                >
                  {jiraState.status?.configured && jiraState.status?.enabled
                    ? "SYNC ACTIVE"
                    : jiraState.status?.configured
                      ? "CONFIGURED (DISABLED)"
                      : "STANDBY / ENV PENDING"}
                </span>
              </div>
              <p>
                Automated Agile issue tracking for low-confidence pathologist triage and operational incident management.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              background: "#f8fafc",
              padding: "1rem",
              borderRadius: "0.75rem",
              border: "1px solid #e2e8f0",
              marginBottom: "1.25rem",
            }}
          >
            <div>
              <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                Target Project Key
              </span>
              <p style={{ margin: "0.25rem 0 0", fontFamily: "monospace", fontWeight: 700, fontSize: "1rem" }}>
                {jiraState.status?.projectKey || "SAM"}
              </p>
            </div>
            <div>
              <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                Default Issue Type
              </span>
              <p style={{ margin: "0.25rem 0 0", fontWeight: 600 }}>
                {jiraState.status?.issueType || "Task / Bug"}
              </p>
            </div>
            <div>
              <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                Jira Cloud Host
              </span>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#334155" }}>
                {jiraState.status?.host || "Configure in backend/.env"}
              </p>
            </div>
          </div>

          <div style={{ marginBottom: "1.25rem", fontSize: "0.88rem", color: "#475569", lineHeight: 1.5 }}>
            <strong style={{ color: "#0f172a" }}>Automated Jira Trigger Rules:</strong>
            <ul style={{ margin: "0.4rem 0 0 1.25rem", padding: 0 }}>
              <li>
                <strong>Uncertainty Gating:</strong> Scans with Confidence &lt; 70% or Shannon Entropy &gt; 1.20 auto-create a high-priority <code>Task</code> linked to the pathologist canvas.
              </li>
              <li>
                <strong>Operational Incident Watchdog:</strong> Unhandled 500 server errors or ML failovers auto-log an incident <code>Bug</code> with stack trace telemetry.
              </li>
            </ul>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              className="admin-ping-btn"
              onClick={handleTestJira}
              disabled={jiraState.loading}
            >
              {jiraState.loading ? "Connecting to Jira…" : "🔌 Test Jira Connection"}
            </button>
            <button
              type="button"
              className="admin-primary-btn"
              onClick={handleCreateSampleTicket}
              disabled={jiraState.loading}
              style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
            >
              ⚡ Simulate Triage Ticket
            </button>
          </div>

          {jiraState.testResult && (
            <div
              className={`admin-feedback-alert ${jiraState.testResult.connected || jiraState.testResult.success ? "success" : "info"}`}
              style={{ marginTop: "1rem" }}
            >
              {jiraState.testResult.message}
              {jiraState.testResult.url && (
                <div style={{ marginTop: "0.4rem" }}>
                  <a
                    href={jiraState.testResult.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontWeight: 700, color: "#15803d", textDecoration: "underline" }}
                  >
                    Open Ticket in Jira ({jiraState.testResult.key}) ↗
                  </a>
                </div>
              )}
            </div>
          )}

          {jiraState.error && (
            <div className="admin-feedback-alert error" style={{ marginTop: "1rem" }}>
              ✕ {jiraState.error}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
