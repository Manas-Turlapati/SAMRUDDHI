const express = require("express");
const protect = require("../middleware/authMiddleware");
const {
  getJiraStatus,
  testJiraConnection,
  createSampleJiraTicket,
} = require("../controllers/adminController");

const router = express.Router();

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    res.status(403);
    throw new Error("Access restricted: Administrator role required.");
  }
  next();
};

router.use(protect, requireAdmin);

router.get("/jira/status", getJiraStatus);
router.post("/jira/test", testJiraConnection);
router.post("/jira/sample-ticket", createSampleJiraTicket);

module.exports = router;
