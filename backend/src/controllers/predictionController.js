const asyncHandler = require("express-async-handler");

const Prediction = require("../models/Prediction");
const { getDiseaseInformation } = require("../services/diseaseInfoService");
const { recommendFertilizer } = require("../services/fertilizerRecommendationService");
const predictLeaf = require("../services/mlService");
const { createPredictionReport } = require("../services/reportService");

const predict = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("Leaf image is required");
  }

  // Send image to Python ML service
  const result = await predictLeaf(req.file);
  const disease = result.prediction.disease;
  const confidence = result.prediction.confidence;
  const diseaseInformation = getDiseaseInformation(disease);
  const fertilizerRecommendation = recommendFertilizer({
    crop: req.body.crop || diseaseInformation.crop,
    disease,
    nitrogen: req.body.nitrogen ?? req.body.N,
    phosphorus: req.body.phosphorus ?? req.body.P,
    potassium: req.body.potassium ?? req.body.K,
    ph: req.body.ph ?? req.body.pH,
    growthStage: req.body.growth_stage || req.body.growthStage,
  });

  const prediction = await Prediction.create({
    user: req.user._id,
    imageName: req.file.originalname,
    disease,
    confidence,
    diseaseInformation,
    recommendation: fertilizerRecommendation,
  });

  res.status(200).json({
    success: true,
    predictionId: prediction._id,
    prediction: {
      disease: prediction.disease,
      confidence: prediction.confidence,
    },
    disease_information: prediction.diseaseInformation,
    fertilizer_recommendation: prediction.recommendation,
    recommendation: prediction.recommendation,
  });
});
const getHistory = asyncHandler(async (req, res) => {
  const predictions = await Prediction.find({
    user: req.user._id,
  }).sort({ createdAt: -1 });

  res.json({
    success: true,
    predictions,
  });
});

const downloadReport = asyncHandler(async (req, res) => {
  const prediction = await Prediction.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!prediction) {
    res.status(404);
    throw new Error("Prediction report not found");
  }

  const filename = `samruddhi-report-${prediction._id}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const doc = createPredictionReport({
    prediction,
    user: req.user,
  });

  doc.pipe(res);
  doc.end();
});

module.exports = {
  predict,
  getHistory,
  downloadReport,
};
