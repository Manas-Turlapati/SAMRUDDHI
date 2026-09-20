const mongoose = require("mongoose");

const predictionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    imageName: {
      type: String,
      required: true,
    },

    disease: {
      type: String,
      required: true,
    },

    confidence: {
      type: Number,
      required: true,
    },

    recommendation: {
      fertilizer: String,
      dosage: String,
      application_method: String,
      frequency: String,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Prediction", predictionSchema);
