const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const expertReviewSchema = new mongoose.Schema({
  reviewId: { type: String, unique: true, index: true, default: randomUUID },
  diagnosisId: { type: mongoose.Schema.Types.ObjectId, ref: "Diagnosis", required: true, unique: true },
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  expertId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  // This is a SHA-256 hash, never the bearer token sent in the notification.
  magicToken: { type: String, unique: true, sparse: true, select: false },
  magicTokenExpiresAt: { type: Date, select: false },
  magicTokenConsumedAt: { type: Date, select: false },
  status: { type: String, enum: ["PENDING", "CONFIRMED", "OVERRIDDEN", "REJECTED"], default: "PENDING", index: true },
  expertDiagnosis: {
    confirmedDisease: String,
    severityScore: { type: Number, min: 1, max: 5 },
    customPrescription: String,
    annotationGeoJson: mongoose.Schema.Types.Mixed,
  },
  activeLearningEligible: { type: Boolean, default: false, index: true },
  reviewedAt: Date,
  farmerNotificationReadAt: { type: Date, default: null, index: true },
}, { timestamps: true });

// Do not TTL-delete this review: completed reviews are retained for audit and learning export.
module.exports = mongoose.model("ExpertReview", expertReviewSchema);
