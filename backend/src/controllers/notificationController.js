const asyncHandler = require("express-async-handler");
const ExpertReview = require("../models/ExpertReview");

const getNotifications = asyncHandler(async (req, res) => {
  const reviews = await ExpertReview.find({ farmerId: req.user._id, status: { $ne: "PENDING" } })
    .sort({ reviewedAt: -1 })
    .populate({ path: "diagnosisId", select: "modelPrediction reviewStatus pdfReportUrl flagReason createdAt" })
    .populate({ path: "expertId", select: "name expertProfile" })
    .lean();
  res.json({
    success: true,
    notifications: reviews.map((review) => ({
      diagnosisId: review.diagnosisId?._id,
      reviewId: review.reviewId,
      status: review.status,
      confirmedDisease: review.expertDiagnosis?.confirmedDisease,
      reviewedAt: review.reviewedAt,
      expertName: review.expertId?.name || "Agronomist",
      pdfReportUrl: review.diagnosisId?.pdfReportUrl,
      read: Boolean(review.farmerNotificationReadAt),
    })),
  });
});

const getUnreadNotificationCount = asyncHandler(async (req, res) => {
  const count = await ExpertReview.countDocuments({
    farmerId: req.user._id,
    status: { $ne: "PENDING" },
    farmerNotificationReadAt: null,
  });
  res.json({ success: true, count });
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const review = await ExpertReview.findOneAndUpdate({
    farmerId: req.user._id,
    diagnosisId: req.params.diagnosisId,
    status: { $ne: "PENDING" },
  }, { $set: { farmerNotificationReadAt: new Date() } }, { new: true });
  if (!review) {
    res.status(404);
    throw new Error("Review notification not found.");
  }
  res.json({ success: true });
});

module.exports = { getNotifications, getUnreadNotificationCount, markNotificationRead };
