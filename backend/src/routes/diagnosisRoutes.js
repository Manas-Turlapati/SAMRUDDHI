const express = require("express");
const protect = require("../middleware/authMiddleware");
const { optionalProtect } = require("../middleware/authMiddleware");
const { inferCallback, getDiagnosisStatus, getDiagnosisImage, requestExpertReview } = require("../controllers/diagnosisController");

const router = express.Router();
router.post("/infer-callback", inferCallback);
router.get("/:id/image", optionalProtect, getDiagnosisImage);
router.get("/:id/status", protect, getDiagnosisStatus);
router.post("/:id/request-review", protect, requestExpertReview);

module.exports = router;
