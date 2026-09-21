const express = require("express");

const { analyzeWeatherRisk } = require("../controllers/weatherRiskController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/analyze", protect, analyzeWeatherRisk);

module.exports = router;
