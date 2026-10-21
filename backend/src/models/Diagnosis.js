const mongoose = require("mongoose");

const diagnosisSchema = new mongoose.Schema({
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  predictionId: { type: mongoose.Schema.Types.ObjectId, ref: "Prediction", index: true },
  rawImageUrl: { type: String, required: true },
  gradCamUrl: String,
  rawImage: { type: Buffer, select: false },
  gradCamImage: { type: Buffer, select: false },
  imageMimeType: String,
  modelPrediction: {
    predictedClass: { type: String, required: true },
    confidence: { type: Number, min: 0, max: 1, required: true },
    probabilities: { type: Map, of: Number, default: {} },
    entropy: { type: Number, min: 0, default: 0 },
  },
  flaggedForReview: { type: Boolean, default: false, index: true },
  flagReason: {
    type: String,
    enum: ["LOW_CONFIDENCE", "HIGH_ENTROPY", "FARMER_REQUESTED", "NONE"],
    default: "NONE",
  },
  reviewStatus: {
    type: String,
    enum: ["AUTOMATED_REVIEW", "PENDING_EXPERT_REVIEW", "EXPERT_VERIFIED", "REVIEW_REJECTED"],
    default: "AUTOMATED_REVIEW",
    index: true,
  },
  pdfReportUrl: String,
}, { timestamps: true });

module.exports = mongoose.model("Diagnosis", diagnosisSchema);
