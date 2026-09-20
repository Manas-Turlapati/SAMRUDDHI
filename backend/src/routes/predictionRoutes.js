const express = require("express");

const { predict, getHistory, downloadReport } = require("../controllers/predictionController");

const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post("/predict", protect, upload.single("image"), predict);

router.get("/history", protect, getHistory);

router.get("/:id/report", protect, downloadReport);

module.exports = router;
