const express = require("express");
const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  initializeTracker,
  getTrackers,
  getTrackerById,
  addCheckpoint,
  getCheckpointImage,
} = require("../controllers/recoveryController");

const router = express.Router();

router.post("/trackers", protect, initializeTracker);
router.get("/trackers", protect, getTrackers);
router.get("/trackers/:id", protect, getTrackerById);
router.post("/trackers/:id/checkpoints", protect, upload.single("image"), addCheckpoint);
router.get("/checkpoints/:checkpointId/image", getCheckpointImage);

module.exports = router;
