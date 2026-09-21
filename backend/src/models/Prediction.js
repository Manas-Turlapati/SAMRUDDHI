const mongoose = require("mongoose");

const diseaseInformationSchema = new mongoose.Schema(
  {
    crop: String,
    disease_name: String,
    type: String,
    description: String,
    symptoms: [String],
    causes: [String],
    treatment: [String],
    prevention: [String],
  },
  { _id: false },
);

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

    diseaseInformation: diseaseInformationSchema,

    recommendation: {
      fertilizer: String,
      npk: String,
      dosage: String,
      application_method: String,
      frequency: String,
      reason: String,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Prediction", predictionSchema);
