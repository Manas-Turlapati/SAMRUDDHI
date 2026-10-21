const mongoose = require("mongoose");

const activeLearningSampleSchema = new mongoose.Schema({
  reviewId: { type: mongoose.Schema.Types.ObjectId, ref: "ExpertReview", required: true, unique: true },
  diagnosisId: { type: mongoose.Schema.Types.ObjectId, ref: "Diagnosis", required: true, index: true },
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  image: { type: Buffer, required: true, select: false },
  imageMimeType: String,
  groundTruth: { type: String, required: true },
  annotationGeoJson: mongoose.Schema.Types.Mixed,
  exportedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model("ActiveLearningSample", activeLearningSampleSchema);
