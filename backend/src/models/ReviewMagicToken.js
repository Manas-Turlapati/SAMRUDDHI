const mongoose = require("mongoose");

const reviewMagicTokenSchema = new mongoose.Schema({
  reviewId: { type: String, required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { timestamps: true });

module.exports = mongoose.model("ReviewMagicToken", reviewMagicTokenSchema);
