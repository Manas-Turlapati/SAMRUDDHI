/**
 * ====================================================================================================
 *                 SAMRUDDHI - 10-STEP PREDICTION & AGRONOMIC LIFECYCLE
 * ====================================================================================================
 *  1. [Farmer Upload]      ──▶ ImageUpload.jsx validates JPEG/PNG <= 5MB
 *  2. [Client Post]        ──▶ Axios multipart/form-data POST /api/predictions/predict
 *  3. [Gateway Reception]  ──▶ Multer intercepts binary stream in memory buffer
 *  4. [ML Microservice]    ──▶ mlService.js streams buffer to FastAPI (Port 8001)
 *  5. [Preprocessing]      ──▶ PIL RGB -> (224, 224) -> ToTensor() -> ImageNet Normalization
 *  6. [Forward Pass]       ──▶ EfficientNet-B0 (4.06M params) -> Logits in R^38
 *  7. [Softmax & Entropy]  ──▶ Softmax probabilities & Shannon Entropy calculation
 *  8. [Argmax & Gating]    ──▶ idx = argmax(P), confidence = max(P)
 *  9. [Taxonomy Parsing]   ──▶ "Tomato___Early_blight" -> ("Tomato", "Early Blight")
 * 10. [Agronomic Delivery] ──▶ Fertilizer engine + Smart Spray weather + MongoDB persistence
 * ====================================================================================================
 */

const asyncHandler = require("express-async-handler");

const Prediction = require("../models/Prediction");
const { getDiseaseInformation } = require("../services/diseaseInfoService");
const { recommendFertilizer } = require("../services/fertilizerRecommendationService");
const predictLeaf = require("../services/mlService");
const { createPredictionReport } = require("../services/reportService");
const { createGatedDiagnosis } = require("../services/inferenceGate");

const predict = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("Leaf image is required");
  }
  const latitude = Number(req.body.latitude);
  const longitude = Number(req.body.longitude);
  const hasLocation = Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;

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
    image: req.file.buffer,
    imageMimeType: req.file.mimetype,
    ...(hasLocation ? { location: { latitude, longitude } } : {}),
  });
  const gated = await createGatedDiagnosis({
    farmerId: req.user._id,
    predictionId: prediction._id,
    prediction: result.prediction,
    image: req.file.buffer,
    imageMimeType: req.file.mimetype,
  });

  res.status(200).json({
    success: true,
    predictionId: prediction._id,
    diagnosisId: gated.diagnosis._id,
    reviewStatus: gated.diagnosis.reviewStatus,
    flaggedForReview: gated.flaggedForReview,
    flagReason: gated.flagReason,
    entropy: gated.entropy,
    prediction: {
      disease: prediction.disease,
      confidence: prediction.confidence,
    },
    fertilizer_recommendation: prediction.recommendation,
    recommendation: prediction.recommendation,
    disease_information: prediction.diseaseInformation,
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

const getDiseaseMap = asyncHandler(async (req, res) => {
  const predictions = await Prediction.find({ "location.latitude": { $exists: true }, "location.longitude": { $exists: true } })
    .select("disease confidence location createdAt")
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean();
  const reports = predictions.map(({ _id, disease, confidence, location, createdAt }) => ({
    _id,
    disease,
    confidence,
    createdAt,
    location: { latitude: Math.round(location.latitude * 100) / 100, longitude: Math.round(location.longitude * 100) / 100 },
  }));
  res.json({ success: true, predictions: reports });
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
  getDiseaseMap,
  downloadReport,
};
