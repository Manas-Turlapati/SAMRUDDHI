const express = require("express");
const protect = require("../middleware/authMiddleware");
const { getNotifications, getUnreadNotificationCount, markNotificationRead } = require("../controllers/notificationController");

const router = express.Router();
router.use(protect);
router.get("/unread-count", getUnreadNotificationCount);
router.get("/", getNotifications);
router.patch("/:diagnosisId/read", markNotificationRead);

module.exports = router;
