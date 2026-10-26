const jiraService = require("../services/jiraService");

// Throttle identical errors within 5 minutes to prevent spamming Jira
const lastErrorTimestamps = new Map();

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : err.statusCode || 500;

  console.error(`[Server Error ${statusCode}]`, err.message);

  // Auto-log severe 500+ server errors to Jira
  if (statusCode >= 500) {
    const errorKey = `${req.method}_${req.originalUrl || req.url}_${err.message}`;
    const now = Date.now();
    const lastTime = lastErrorTimestamps.get(errorKey) || 0;

    if (now - lastTime > 5 * 60 * 1000) {
      lastErrorTimestamps.set(errorKey, now);
      setImmediate(() => {
        jiraService
          .createSystemIncidentTicket({
            errorType: err.name || "InternalServerError",
            message: err.message,
            stack: err.stack,
            endpoint: req.originalUrl || req.url,
            method: req.method,
          })
          .catch((jiraErr) => console.error("Jira incident logging failed:", jiraErr.message));
      });
    }
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};

module.exports = errorHandler;
