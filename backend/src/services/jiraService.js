const axios = require("axios");

/**
 * Jira Cloud REST API Integration Service for SAMRUDDHI
 * Supports automated ticket creation for:
 * 1. Human-In-The-Loop Expert Review triage alerts
 * 2. System incident and unhandled exception logging
 */

const getJiraConfig = () => {
  const host = (process.env.JIRA_HOST || "").trim().replace(/\/$/, "");
  const email = (process.env.JIRA_EMAIL || "").trim();
  const apiToken = (process.env.JIRA_API_TOKEN || "").trim();
  const projectKey = (process.env.JIRA_PROJECT_KEY || "SAM").trim().toUpperCase();
  const issueType = (process.env.JIRA_ISSUE_TYPE || "Task").trim();
  const isConfigured = Boolean(host && email && apiToken);
  const isEnabled = process.env.JIRA_ENABLED === "false" ? false : isConfigured;

  return { host, email, apiToken, projectKey, issueType, isConfigured, isEnabled };
};

const getAuthHeaders = (email, apiToken) => {
  const token = Buffer.from(`${email}:${apiToken}`).toString("base64");
  return {
    Authorization: `Basic ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
};

/**
 * Create a Jira Issue using Jira Cloud REST API v2
 */
const createIssue = async ({ summary, description, issueType, labels = [], priority = null }) => {
  const config = getJiraConfig();

  if (!config.isEnabled) {
    console.log(`[Jira] Ticket creation skipped (not configured or disabled): "${summary}"`);
    return {
      success: false,
      skipped: true,
      reason: config.isConfigured ? "JIRA_ENABLED is false" : "Missing JIRA_HOST, JIRA_EMAIL, or JIRA_API_TOKEN in .env",
    };
  }

  const payload = {
    fields: {
      project: { key: config.projectKey },
      summary: summary.slice(0, 250),
      description,
      issuetype: { name: issueType || config.issueType },
      labels: [...new Set(["samruddhi", ...labels])].map((lbl) => lbl.replace(/[^a-zA-Z0-9_\-]/g, "-")),
    },
  };

  if (priority) {
    payload.fields.priority = { name: priority };
  }

  try {
    const url = `${config.host}/rest/api/2/issue`;
    const response = await axios.post(url, payload, {
      headers: getAuthHeaders(config.email, config.apiToken),
      timeout: 10000,
    });

    const issueKey = response.data?.key;
    const issueUrl = `${config.host}/browse/${issueKey}`;
    console.log(`[Jira] Issue created successfully: ${issueKey} (${issueUrl})`);

    return {
      success: true,
      key: issueKey,
      id: response.data?.id,
      url: issueUrl,
    };
  } catch (error) {
    const errorDetails = error.response?.data?.errors || error.response?.data?.errorMessages || error.message;
    console.error("[Jira] Failed to create issue:", JSON.stringify(errorDetails));
    return {
      success: false,
      error: errorDetails,
      status: error.response?.status,
    };
  }
};

/**
 * Auto-creates a ticket when an AI diagnosis is flagged for expert review
 */
const createExpertReviewTicket = async ({
  diagnosisId,
  reviewId,
  predictedDisease,
  confidence,
  entropy,
  flagReason,
  magicUrl,
  imageUrl,
}) => {
  const confPercent = Number.isFinite(Number(confidence)) ? (Number(confidence) * 100).toFixed(1) : "N/A";
  const entropyVal = Number.isFinite(Number(entropy)) ? Number(entropy).toFixed(4) : "N/A";
  const summary = `[EXPERT REVIEW] ${flagReason || "FLAGGED"}: ${predictedDisease || "Unknown Pathogen"} (Conf: ${confPercent}%)`;

  const description = [
    "h2. SAMRUDDHI Agronomist Triage Alert",
    "A leaf diagnosis was quarantined by the uncertainty gate and requires pathologist verification.",
    "",
    `* *Diagnosis ID:* {color:#15803d}${diagnosisId}{color}`,
    `* *Review ID:* ${reviewId || "N/A"}`,
    `* *Predicted Pathogen:* *${predictedDisease || "Unknown"}*`,
    `* *Model Confidence:* *${confPercent}%* (Threshold: < 70%)`,
    `* *Shannon Entropy:* *${entropyVal} bits* (Threshold: > 1.20)`,
    `* *Trigger Reason:* {color:#b91c1c}*${flagReason || "UNCERTAIN"}*{color}`,
    imageUrl ? `* *Leaf Image:* [View Leaf Photo|${imageUrl}]` : null,
    magicUrl ? `* *Pathologist Canvas Link:* [Open Review Canvas|${magicUrl}]` : null,
    "",
    "h3. Action Required:",
    "1. Open the pathologist review canvas via the link above.",
    "2. Inspect the Grad-CAM heatmap to ensure lesions are localized on leaf tissue.",
    "3. Confirm or override the diagnosis and certify the commercial fertilizer dosage.",
    "",
    "_Automated incident created by SAMRUDDHI Uncertainty Gate Engine._",
  ]
    .filter(Boolean)
    .join("\n");

  const labels = ["expert-review", "uncertainty-gate", (flagReason || "flagged").toLowerCase().replace(/_/g, "-")];

  return createIssue({
    summary,
    description,
    issueType: "Task",
    priority: flagReason === "LOW_CONFIDENCE" || flagReason === "HIGH_ENTROPY" ? "High" : "Medium",
    labels,
  });
};

/**
 * Auto-creates a bug ticket when an unhandled system error occurs
 */
const createSystemIncidentTicket = async ({ errorType, message, stack, endpoint, method }) => {
  const summary = `[INCIDENT] ${errorType || "Unhandled Server Error"} on ${method || "API"} ${endpoint || ""}`.slice(0, 250);

  const description = [
    "h2. SAMRUDDHI System Incident Alert",
    "An unhandled operational error occurred in the backend application pipeline.",
    "",
    `* *Timestamp:* ${new Date().toISOString()}`,
    `* *Endpoint:* \`${method || "UNKNOWN"} ${endpoint || "/api"}\``,
    `* *Error Type:* *${errorType || "Error"}*`,
    `* *Message:* {color:#b91c1c}${message || "No error message"}{color}`,
    "",
    "h3. Stack Trace:",
    "{code}",
    stack ? stack.slice(0, 3000) : "No stack trace provided",
    "{code}",
    "",
    "_Automated operational telemetry created by SAMRUDDHI Error Middleware._",
  ].join("\n");

  return createIssue({
    summary,
    description,
    issueType: "Bug",
    priority: "High",
    labels: ["system-incident", "backend-error", "bug"],
  });
};

/**
 * Test Jira connection and verify Atlassian credentials
 */
const testConnection = async () => {
  const config = getJiraConfig();

  if (!config.isConfigured) {
    return {
      connected: false,
      configured: false,
      message: "Jira integration is not yet configured in .env (requires JIRA_HOST, JIRA_EMAIL, JIRA_API_TOKEN)",
      config: {
        host: config.host || "(empty)",
        email: config.email || "(empty)",
        projectKey: config.projectKey,
      },
    };
  }

  try {
    const url = `${config.host}/rest/api/2/myself`;
    const response = await axios.get(url, {
      headers: getAuthHeaders(config.email, config.apiToken),
      timeout: 8000,
    });

    return {
      connected: true,
      configured: true,
      user: {
        displayName: response.data?.displayName,
        emailAddress: response.data?.emailAddress,
        timeZone: response.data?.timeZone,
      },
      projectKey: config.projectKey,
      host: config.host,
      message: `Successfully connected to Jira Cloud as ${response.data?.displayName} (${response.data?.emailAddress})`,
    };
  } catch (error) {
    return {
      connected: false,
      configured: true,
      error: error.response?.data || error.message,
      statusCode: error.response?.status,
      message: `Failed to authenticate with Jira Cloud: ${error.message}`,
    };
  }
};

module.exports = {
  getJiraConfig,
  createIssue,
  createExpertReviewTicket,
  createSystemIncidentTicket,
  testConnection,
};
