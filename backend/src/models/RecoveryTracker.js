const mongoose = require("mongoose");

const checkpointSchema = new mongoose.Schema({
  dayOffset: { type: Number, default: 0 },
  checkpointLabel: { type: String, default: "Day 0 (Baseline)" },
  capturedAt: { type: Date, default: Date.now },
  imageName: { type: String, required: true },
  image: { type: Buffer },
  imageMimeType: { type: String, default: "image/jpeg" },
  predictedDisease: { type: String, required: true },
  confidence: { type: Number, required: true },
  lesionSeverity: { type: Number, default: 75 }, // 0 to 100%
  healthIndex: { type: Number, default: 25 },     // 0 to 100%
  lesionReductionPct: { type: Number, default: 0 }, // relative to baseline
  status: {
    type: String,
    enum: ["BASELINE", "RECOVERING", "MODERATE_IMPROVEMENT", "STABLE", "WORSENING"],
    default: "BASELINE",
  },
  guidance: { type: String, default: "" },
  notes: { type: String, default: "" },
});

const recoveryTrackerSchema = new mongoose.Schema(
  {
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    predictionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prediction",
      required: true,
    },
    crop: { type: String, required: true },
    initialDisease: { type: String, required: true },
    treatmentApplied: { type: String, default: "" },
    baselineSeverity: { type: Number, default: 80 },
    currentSeverity: { type: Number, default: 80 },
    overallHealingPercentage: { type: Number, default: 0 },
    overallStatus: {
      type: String,
      enum: ["BASELINE", "RECOVERING", "MODERATE_IMPROVEMENT", "STABLE", "WORSENING"],
      default: "BASELINE",
    },
    checkpoints: [checkpointSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("RecoveryTracker", recoveryTrackerSchema);
