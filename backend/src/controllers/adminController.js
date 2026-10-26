const asyncHandler = require("express-async-handler");
const jiraService = require("../services/jiraService");

/**
 * @desc Get Jira integration status & configuration
 * @route GET /api/admin/jira/status
 * @access Private (Admin)
 */
const getJiraStatus = asyncHandler(async (req, res) => {
  const config = jiraService.getJiraConfig();
  res.json({
    success: true,
    jira: {
      configured: config.isConfigured,
      enabled: config.isEnabled,
      host: config.host || null,
      email: config.email ? `${config.email.slice(0, 3)}***@${config.email.split("@")[1] || ""}` : null,
      projectKey: config.projectKey,
      issueType: config.issueType,
    },
  });
});

/**
 * @desc Test Jira connection / Ping Atlassian Cloud
 * @route POST /api/admin/jira/test
 * @access Private (Admin)
 */
const testJiraConnection = asyncHandler(async (req, res) => {
  const result = await jiraService.testConnection();
  res.json({
    success: result.connected,
    ...result,
  });
});

/**
 * @desc Create a sample test ticket in Jira
 * @route POST /api/admin/jira/sample-ticket
 * @access Private (Admin)
 */
const createSampleJiraTicket = asyncHandler(async (req, res) => {
  const sampleData = {
    diagnosisId: "671da" + Math.random().toString(16).slice(2, 8),
    reviewId: "rev_" + Math.random().toString(36).slice(2, 7),
    predictedDisease: "Tomato Early Blight",
    confidence: 0.642,
    entropy: 1.3412,
    flagReason: "LOW_CONFIDENCE",
    magicUrl: "http://localhost:5173/expert/review/sample",
    imageUrl: "https://samruddhi.app/sample-leaf.jpg",
  };

  const result = await jiraService.createExpertReviewTicket(sampleData);
  res.json({
    success: result.success,
    result,
  });
});

module.exports = {
  getJiraStatus,
  testJiraConnection,
  createSampleJiraTicket,
};
