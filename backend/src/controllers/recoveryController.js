const asyncHandler = require("express-async-handler");
const RecoveryTracker = require("../models/RecoveryTracker");
const Prediction = require("../models/Prediction");
const predictLeaf = require("../services/mlService");

const calculateSeverity = (disease, confidence) => {
  const isHealthy = String(disease || "").toLowerCase().includes("healthy");
  if (isHealthy) {
    return Math.max(5, Math.round((1 - confidence) * 25));
  }
  return Math.min(95, Math.max(25, Math.round(confidence * 85)));
};

const determineGuidance = (status, reductionPct, disease, crop) => {
  switch (status) {
    case "RECOVERING":
      return `Significant healing detected! Active leaf lesion area decreased by ${reductionPct}%. Fungal/bacterial spread has halted. Continue current spray/irrigation schedule.`;
    case "MODERATE_IMPROVEMENT":
      return `Positive therapeutic progress: Lesions reduced by ${reductionPct}%. Chlorosis is stabilizing. Maintain field aeration and re-examine in 7 days.`;
    case "STABLE":
      return `Infection contained: Lesion size is stable with negligible expansion. Keep leaves dry during irrigation and observe closely.`;
    case "WORSENING":
      return `Warning: Infection increased by ${Math.abs(reductionPct)}%. Suspected pathogen resistance or delayed application. Recommend rotating to an alternative registered fungicide or requesting an expert review.`;
    default:
      return `Initial baseline recorded for ${crop} (${disease}). Apply recommended treatment and upload a follow-up leaf photo at Day 7.`;
  }
};

// 1. Initialize Tracker from an existing prediction
const initializeTracker = asyncHandler(async (req, res) => {
  const { predictionId, treatmentApplied } = req.body;

  if (!predictionId) {
    res.status(400);
    throw new Error("Prediction ID is required to start a recovery tracker.");
  }

  const prediction = await Prediction.findOne({
    _id: predictionId,
    user: req.user._id,
  }).select("+image");

  if (!prediction) {
    res.status(404);
    throw new Error("Prediction not found or unauthorized.");
  }

  // Check if a tracker already exists for this prediction
  let existing = await RecoveryTracker.findOne({
    farmerId: req.user._id,
    predictionId: prediction._id,
  });

  if (existing) {
    return res.json({
      success: true,
      message: "Recovery tracker already exists for this diagnosis.",
      tracker: existing,
    });
  }

  const baselineSeverity = calculateSeverity(prediction.disease, prediction.confidence);
  const crop = prediction.diseaseInformation?.crop || prediction.disease.split("___")[0].replace(/_/g, " ") || "Crop";

  const baselineCheckpoint = {
    dayOffset: 0,
    checkpointLabel: "Day 0 (Baseline Diagnosis)",
    capturedAt: prediction.createdAt || new Date(),
    imageName: prediction.imageName || "baseline_leaf.jpg",
    image: prediction.image,
    imageMimeType: prediction.imageMimeType || "image/jpeg",
    predictedDisease: prediction.disease,
    confidence: prediction.confidence,
    lesionSeverity: baselineSeverity,
    healthIndex: 100 - baselineSeverity,
    lesionReductionPct: 0,
    status: "BASELINE",
    guidance: determineGuidance("BASELINE", 0, prediction.disease, crop),
    notes: treatmentApplied ? `Treatment applied: ${treatmentApplied}` : "Initial diagnostic baseline",
  };

  const tracker = await RecoveryTracker.create({
    farmerId: req.user._id,
    predictionId: prediction._id,
    crop,
    initialDisease: prediction.disease,
    treatmentApplied: treatmentApplied || prediction.recommendation?.fertilizer || "Recommended Treatment",
    baselineSeverity,
    currentSeverity: baselineSeverity,
    overallHealingPercentage: 0,
    overallStatus: "BASELINE",
    checkpoints: [baselineCheckpoint],
  });

  const sanitizedTracker = tracker.toObject();
  if (Array.isArray(sanitizedTracker.checkpoints)) {
    sanitizedTracker.checkpoints.forEach((cp) => {
      delete cp.image;
    });
  }

  res.status(201).json({
    success: true,
    message: "Crop Recovery Tracker initialized successfully.",
    trackerId: tracker._id,
    tracker: sanitizedTracker,
  });
});

// 2. Get all trackers for logged in farmer
const getTrackers = asyncHandler(async (req, res) => {
  const trackers = await RecoveryTracker.find({ farmerId: req.user._id })
    .select("-checkpoints.image")
    .sort({ updatedAt: -1 })
    .lean();

  res.json({
    success: true,
    trackers,
  });
});

// 3. Get single tracker by ID
const getTrackerById = asyncHandler(async (req, res) => {
  const tracker = await RecoveryTracker.findOne({
    _id: req.params.id,
    farmerId: req.user._id,
  })
    .select("-checkpoints.image")
    .lean();

  if (!tracker) {
    res.status(404);
    throw new Error("Recovery tracker not found.");
  }

  res.json({
    success: true,
    tracker,
  });
});

// 4. Add follow-up checkpoint (e.g. Day 7, Day 14)
const addCheckpoint = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("Follow-up leaf photo is required.");
  }

  const tracker = await RecoveryTracker.findOne({
    _id: req.params.id,
    farmerId: req.user._id,
  });

  if (!tracker) {
    res.status(404);
    throw new Error("Recovery tracker not found.");
  }

  // Run AI inference on the follow-up image
  const mlResult = await predictLeaf(req.file);
  const followUpDisease = mlResult.prediction?.disease || "Unknown";
  const followUpConfidence = Number(mlResult.prediction?.confidence || 0);

  const currentSeverity = calculateSeverity(followUpDisease, followUpConfidence);
  const baselineSeverity = tracker.baselineSeverity || 80;

  // Calculate lesion reduction % (positive means healing, negative means worsening)
  const reductionPct = Math.round(((baselineSeverity - currentSeverity) / baselineSeverity) * 100);

  let status = "STABLE";
  if (reductionPct >= 35 || currentSeverity <= 20) {
    status = "RECOVERING";
  } else if (reductionPct >= 15) {
    status = "MODERATE_IMPROVEMENT";
  } else if (reductionPct >= -10) {
    status = "STABLE";
  } else {
    status = "WORSENING";
  }

  const daysElapsed = Math.max(
    1,
    Math.round((Date.now() - new Date(tracker.createdAt).getTime()) / (1000 * 60 * 60 * 24))
  );

  const dayOffset = Number(req.body.dayOffset) || daysElapsed;
  const label = req.body.checkpointLabel || `Day ${dayOffset} Follow-up`;
  const guidance = determineGuidance(status, reductionPct, followUpDisease, tracker.crop);

  const newCheckpoint = {
    dayOffset,
    checkpointLabel: label,
    capturedAt: new Date(),
    imageName: req.file.originalname,
    image: req.file.buffer,
    imageMimeType: req.file.mimetype,
    predictedDisease: followUpDisease,
    confidence: followUpConfidence,
    lesionSeverity: currentSeverity,
    healthIndex: 100 - currentSeverity,
    lesionReductionPct: reductionPct,
    status,
    guidance,
    notes: req.body.notes || `Follow-up evaluation on Day ${dayOffset}`,
  };

  tracker.checkpoints.push(newCheckpoint);
  tracker.currentSeverity = currentSeverity;
  tracker.overallHealingPercentage = Math.max(0, reductionPct);
  tracker.overallStatus = status;

  await tracker.save();

  // Return clean tracker object without the heavy image buffers in JSON response
  const sanitizedTracker = tracker.toObject();
  if (Array.isArray(sanitizedTracker.checkpoints)) {
    sanitizedTracker.checkpoints.forEach((cp) => {
      delete cp.image;
    });
  }

  res.status(201).json({
    success: true,
    message: "Follow-up checkpoint evaluated and recorded successfully.",
    evaluation: {
      status,
      reductionPct,
      currentSeverity,
      healthIndex: 100 - currentSeverity,
      guidance,
    },
    tracker: sanitizedTracker,
  });
});

// 5. Stream checkpoint leaf image
const getCheckpointImage = asyncHandler(async (req, res) => {
  const tracker = await RecoveryTracker.findOne({
    "checkpoints._id": req.params.checkpointId,
  });

  if (!tracker) {
    res.status(404);
    throw new Error("Checkpoint not found.");
  }

  const checkpoint = tracker.checkpoints.id(req.params.checkpointId);
  if (!checkpoint || !checkpoint.image) {
    res.status(404);
    throw new Error("Image not found for this checkpoint.");
  }

  res.set("Content-Type", checkpoint.imageMimeType || "image/jpeg");
  res.set("Cache-Control", "private, max-age=86400");
  res.send(checkpoint.image);
});

module.exports = {
  initializeTracker,
  getTrackers,
  getTrackerById,
  addCheckpoint,
  getCheckpointImage,
};
