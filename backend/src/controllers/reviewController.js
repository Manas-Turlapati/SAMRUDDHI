const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Diagnosis = require("../models/Diagnosis");
const ExpertReview = require("../models/ExpertReview");
const ReviewMagicToken = require("../models/ReviewMagicToken");
const ActiveLearningSample = require("../models/ActiveLearningSample");
const User = require("../models/User");
const { createCertifiedReport } = require("../services/pdfGenerator");

const imageDataUrl = (buffer, mimeType) => buffer ? `data:${mimeType || "image/jpeg"};base64,${buffer.toString("base64")}` : null;

const getMagicAccess = asyncHandler(async (req, res) => {
  const tokenHash = crypto.createHash("sha256").update(String(req.params.token || "")).digest("hex");
  const token = await ReviewMagicToken.findOneAndDelete({ tokenHash, expiresAt: { $gt: new Date() } });
  const review = token ? await ExpertReview.findOneAndUpdate({
    reviewId: token.reviewId,
    magicToken: tokenHash,
    magicTokenExpiresAt: { $gt: new Date() },
    magicTokenConsumedAt: null,
    status: "PENDING",
  }, {
    $set: { magicTokenConsumedAt: new Date() },
    $unset: { magicToken: 1, magicTokenExpiresAt: 1 },
  }, { new: true }).populate({
    path: "diagnosisId",
    select: "+rawImage +gradCamImage",
  }) : null;

  if (!review?.diagnosisId) {
    res.status(410);
    throw new Error("This expert review link has expired or has already been used.");
  }
  const accessToken = jwt.sign({ purpose: "expert-review", reviewId: review.reviewId }, process.env.JWT_SECRET, { expiresIn: "30m" });
  const diagnosis = review.diagnosisId;
  res.json({
    success: true,
    accessToken,
    reviewId: review.reviewId,
    diagnosis: {
      _id: diagnosis._id,
      rawImageUrl: diagnosis.rawImageUrl,
      rawImageDataUrl: imageDataUrl(diagnosis.rawImage, diagnosis.imageMimeType),
      gradCamUrl: diagnosis.gradCamUrl,
      gradCamDataUrl: imageDataUrl(diagnosis.gradCamImage, "image/png"),
      modelPrediction: diagnosis.modelPrediction,
      flagReason: diagnosis.flagReason,
    },
    treatmentTemplate: { confirmedDisease: diagnosis.modelPrediction.predictedClass, severityScore: 1, customPrescription: "" },
  });
});

const getQueue = asyncHandler(async (_req, res) => {
  const reviews = await ExpertReview.find({ status: "PENDING" })
    .sort({ createdAt: 1 })
    .populate({ path: "diagnosisId", select: "modelPrediction flagReason rawImageUrl gradCamUrl createdAt" })
    .populate({ path: "farmerId", select: "name email" })
    .lean();
  res.json({ success: true, reviews });
});

const submitReview = asyncHandler(async (req, res) => {
  const { status, confirmedDisease, severityScore, customPrescription, annotationGeoJson } = req.body;
  if (!["CONFIRMED", "OVERRIDDEN", "REJECTED"].includes(status)) {
    res.status(400);
    throw new Error("Review status must be CONFIRMED, OVERRIDDEN, or REJECTED.");
  }
  if (status !== "REJECTED" && !String(confirmedDisease || "").trim()) {
    res.status(400);
    throw new Error("Select the expert-confirmed disease.");
  }
  const severity = Number(severityScore);
  if (status !== "REJECTED" && (!Number.isInteger(severity) || severity < 1 || severity > 5)) {
    res.status(400);
    throw new Error("Severity must be an integer from 1 to 5.");
  }

  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const review = await ExpertReview.findOne({ reviewId: req.params.reviewId, status: "PENDING" }).session(session);
      if (!review) throw Object.assign(new Error("This review is no longer pending."), { statusCode: 409 });
      const diagnosis = await Diagnosis.findById(review.diagnosisId).select("+rawImage modelPrediction farmerId").session(session);
      if (!diagnosis) throw Object.assign(new Error("Diagnosis not found."), { statusCode: 404 });

      review.status = status;
      review.expertId = req.user?._id || null;
      review.expertDiagnosis = {
        confirmedDisease: String(confirmedDisease || diagnosis.modelPrediction.predictedClass).trim(),
        severityScore: status === "REJECTED" ? undefined : severity,
        customPrescription: typeof customPrescription === "string" ? customPrescription.trim() : JSON.stringify(customPrescription || {}),
        annotationGeoJson: annotationGeoJson || null,
      };
      review.reviewedAt = new Date();
      const eligible = status !== "REJECTED" && Boolean(diagnosis.rawImage);
      review.activeLearningEligible = eligible;
      await review.save({ session });

      diagnosis.reviewStatus = status === "REJECTED" ? "REVIEW_REJECTED" : "EXPERT_VERIFIED";
      diagnosis.pdfReportUrl = status === "REJECTED" ? undefined : `/reviews/${review.reviewId}/report`;
      await diagnosis.save({ session });

      if (eligible) {
        await ActiveLearningSample.create([{
          reviewId: review._id,
          diagnosisId: diagnosis._id,
          farmerId: diagnosis.farmerId,
          image: diagnosis.rawImage,
          imageMimeType: diagnosis.imageMimeType,
          groundTruth: review.expertDiagnosis.confirmedDisease,
          annotationGeoJson: annotationGeoJson || null,
        }], { session });
      }
      result = { review, diagnosis };
    });
  } finally {
    await session.endSession();
  }

  if (req.user?._id) result.review.expertId = req.user._id;
  const io = req.app.get("io");
  io?.to(`farmer:${result.diagnosis.farmerId}`).emit(`review_updated:${result.diagnosis._id}`, {
    diagnosisId: result.diagnosis._id,
    status: result.diagnosis.reviewStatus,
    reviewStatus: result.review.status,
    confirmedDisease: result.review.expertDiagnosis.confirmedDisease,
    pdfReportUrl: result.diagnosis.pdfReportUrl,
  });
  io?.to(`farmer:${result.diagnosis.farmerId}`).emit("farmer_notification", {
    diagnosisId: result.diagnosis._id,
    reviewId: result.review.reviewId,
    diagnosisStatus: result.diagnosis.reviewStatus,
    reviewStatus: result.review.status,
    confirmedDisease: result.review.expertDiagnosis.confirmedDisease,
    pdfReportUrl: result.diagnosis.pdfReportUrl,
  });
  res.json({ success: true, message: "Expert review submitted.", reviewId: result.review.reviewId, pdfReportUrl: result.diagnosis.pdfReportUrl });
});

const getCertifiedReport = asyncHandler(async (req, res) => {
  const review = await ExpertReview.findOne({ reviewId: req.params.reviewId, status: { $in: ["CONFIRMED", "OVERRIDDEN"] } });
  if (!review) {
    res.status(404);
    throw new Error("Certified report not found.");
  }
  const diagnosis = await Diagnosis.findById(review.diagnosisId);
  if (!diagnosis) {
    res.status(404);
    throw new Error("Diagnosis not found.");
  }
  const isOwner = diagnosis.farmerId.toString() === req.user._id.toString();
  const role = String(req.user.role || "").toLowerCase();
  const verifiedReviewer = role === "admin" || (role === "expert" && req.user.expertProfile?.isVerified);
  if (!isOwner && !verifiedReviewer) {
    res.status(403);
    throw new Error("You do not have permission to download this report.");
  }
  const farmer = await User.findById(diagnosis.farmerId).select("name email");
  const expert = review.expertId ? await User.findById(review.expertId).select("name role expertProfile") : null;
  if (expert && (expert.role !== "expert" || !expert.expertProfile?.isVerified)) {
    res.status(403);
    throw new Error("Only a verified agronomist can certify this report.");
  }
  const doc = createCertifiedReport({ diagnosis, review, farmer, expert });
  const chunks = [];
  const pdf = await new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.once("end", () => resolve(Buffer.concat(chunks)));
    doc.once("error", reject);
    doc.end();
  });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="certified-diagnosis-${diagnosis._id}.pdf"`);
  res.setHeader("Content-Length", pdf.length);
  res.send(pdf);
});

const exportActiveLearning = asyncHandler(async (_req, res) => {
  const samples = await ActiveLearningSample.find({}).select("+image").lean();
  const categories = [...new Set(samples.map((sample) => sample.groundTruth))].map((name, index) => ({ id: index + 1, name }));
  const categoryIds = new Map(categories.map((category) => [category.name, category.id]));
  const images = [];
  const annotations = [];
  samples.forEach((sample, index) => {
    const geo = sample.annotationGeoJson || {};
    const width = Number(geo.imageWidth) || 0;
    const height = Number(geo.imageHeight) || 0;
    images.push({
      id: index + 1,
      file_name: `${sample._id}.${sample.imageMimeType === "image/png" ? "png" : "jpg"}`,
      width,
      height,
      image_base64: `data:${sample.imageMimeType || "image/jpeg"};base64,${sample.image.toString("base64")}`,
      ground_truth: sample.groundTruth,
    });
    (geo.features || []).forEach((feature) => {
      const ring = feature.geometry?.coordinates?.[0];
      if (!Array.isArray(ring) || ring.length < 3) return;
      const xs = ring.map(([x]) => Number(x));
      const ys = ring.map(([, y]) => Number(y));
      const x = Math.min(...xs); const y = Math.min(...ys);
      const boxWidth = Math.max(...xs) - x; const boxHeight = Math.max(...ys) - y;
      annotations.push({
        id: annotations.length + 1,
        image_id: index + 1,
        category_id: categoryIds.get(sample.groundTruth),
        segmentation: [ring.flatMap(([px, py]) => [px, py])],
        bbox: [x, y, boxWidth, boxHeight],
        area: boxWidth * boxHeight,
        iscrowd: 0,
      });
    });
  });
  res.json({ info: { description: "LDFRS expert-verified active-learning export", format: "COCO" }, images, annotations, categories });
});

module.exports = { getMagicAccess, getQueue, submitReview, getCertifiedReport, exportActiveLearning };
