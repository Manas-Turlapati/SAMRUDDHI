const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const Diagnosis = require("../models/Diagnosis");
const ExpertReview = require("../models/ExpertReview");
const ReviewMagicToken = require("../models/ReviewMagicToken");
const { createGatedDiagnosis, createExpertReview } = require("../services/inferenceGate");

const safeEqual = (left, right) => {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const inferCallback = asyncHandler(async (req, res) => {
  const expectedSecret = process.env.INFERENCE_CALLBACK_SECRET;
  if (!expectedSecret || !safeEqual(req.get("x-inference-secret"), expectedSecret)) {
    res.status(401);
    throw new Error("Inference callback is unauthorized.");
  }
  const { farmerId, predictionId, rawImageUrl, gradCamUrl } = req.body;
  const rawPrediction = req.body.prediction || req.body.modelPrediction || req.body;
  const prediction = {
    disease: rawPrediction.disease || rawPrediction.predictedClass,
    confidence: Number(rawPrediction.confidence),
    probabilities: rawPrediction.probabilities || {},
    gradcamBase64: rawPrediction.gradcamBase64,
  };
  if (!farmerId || !prediction.disease || !Number.isFinite(prediction.confidence) || !rawImageUrl) {
    res.status(400);
    throw new Error("farmerId, rawImageUrl, disease, and confidence are required.");
  }
  const result = await createGatedDiagnosis({ farmerId, predictionId, prediction, rawImageUrl, gradCamUrl });
  res.status(201).json({
    success: true,
    diagnosisId: result.diagnosis._id,
    reviewId: result.review?.reviewId || null,
    flaggedForReview: result.flaggedForReview,
    flagReason: result.flagReason,
    entropy: result.entropy,
  });
});

const getDiagnosisStatus = asyncHandler(async (req, res) => {
  const diagnosis = await Diagnosis.findOne({ _id: req.params.id, farmerId: req.user._id }).lean();
  if (!diagnosis) {
    res.status(404);
    throw new Error("Diagnosis not found.");
  }
  res.json({
    success: true,
    diagnosis: {
      _id: diagnosis._id,
      reviewStatus: diagnosis.reviewStatus,
      flaggedForReview: diagnosis.flaggedForReview,
      flagReason: diagnosis.flagReason,
      pdfReportUrl: diagnosis.pdfReportUrl,
    },
  });
});

const getDiagnosisImage = asyncHandler(async (req, res) => {
  const diagnosis = await Diagnosis.findById(req.params.id).select("+rawImage +gradCamImage farmerId rawImageUrl gradCamUrl imageMimeType");
  if (!diagnosis) {
    res.status(404);
    throw new Error("Diagnosis not found.");
  }
  const role = String(req.user?.role || "").toLowerCase();
  let allowed = req.user?._id?.toString() === diagnosis.farmerId.toString()
    || role === "admin"
    || (role === "expert" && req.user?.expertProfile?.isVerified);
  const reviewToken = String(req.query.reviewToken || "");
  if (!allowed && reviewToken) {
    const hash = crypto.createHash("sha256").update(reviewToken).digest("hex");
    const tokenRecord = await ReviewMagicToken.findOne({ tokenHash: hash, expiresAt: { $gt: new Date() } });
    const review = tokenRecord && await ExpertReview.findOne({
      diagnosisId: diagnosis._id,
      magicToken: hash,
      magicTokenExpiresAt: { $gt: new Date() },
      magicTokenConsumedAt: null,
      status: "PENDING",
    });
    allowed = Boolean(review);
  }
  if (!allowed) {
    res.status(403);
    throw new Error("You do not have permission to view this diagnosis image.");
  }
  const isGradCam = req.query.variant === "gradcam";
  const image = isGradCam ? diagnosis.gradCamImage : diagnosis.rawImage;
  if (!image) {
    if (!isGradCam && diagnosis.rawImageUrl?.startsWith("https://")) return res.redirect(302, diagnosis.rawImageUrl);
    res.status(404);
    throw new Error("This diagnosis image is unavailable.");
  }
  res.setHeader("Content-Type", isGradCam ? "image/png" : diagnosis.imageMimeType || "image/jpeg");
  res.setHeader("Cache-Control", "private, no-store");
  res.send(image);
});

const requestExpertReview = asyncHandler(async (req, res) => {
  const diagnosis = await Diagnosis.findOne({ _id: req.params.id, farmerId: req.user._id });
  if (!diagnosis) {
    res.status(404);
    throw new Error("Diagnosis not found.");
  }
  if (diagnosis.reviewStatus === "PENDING_EXPERT_REVIEW") {
    return res.json({ success: true, message: "This diagnosis is already waiting for an expert." });
  }
  if (diagnosis.reviewStatus === "EXPERT_VERIFIED") {
    res.status(409);
    throw new Error("This diagnosis has already been reviewed.");
  }
  diagnosis.flaggedForReview = true;
  diagnosis.flagReason = "FARMER_REQUESTED";
  diagnosis.reviewStatus = "PENDING_EXPERT_REVIEW";
  await diagnosis.save();
  const review = await createExpertReview(diagnosis, { reason: "FARMER_REQUESTED" });
  res.status(201).json({ success: true, reviewId: review.reviewId, message: "Your diagnosis was sent for expert review." });
});

module.exports = { inferCallback, getDiagnosisStatus, getDiagnosisImage, requestExpertReview };
