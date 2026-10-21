const express = require("express");
const protect = require("../middleware/authMiddleware");
const { verifyMagicReviewToken } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { getMagicAccess, getQueue, submitReview, getCertifiedReport, exportActiveLearning } = require("../controllers/reviewController");

const router = express.Router();

const requireReviewSubmitAccess = (req, res, next) => {
  if (req.get("x-review-access")) return verifyMagicReviewToken(req, res, next);
  if (!req.headers.authorization) return verifyMagicReviewToken(req, res, next);
  return protect(req, res, (error) => {
    if (error) return next(error);
    return authorizeRoles("expert", "admin")(req, res, next);
  });
};

router.get("/magic-access/:token", getMagicAccess);
router.get("/queue", protect, authorizeRoles("expert", "admin"), getQueue);
router.post("/submit/:reviewId", requireReviewSubmitAccess, submitReview);
router.get("/active-learning/export", protect, authorizeRoles("admin"), exportActiveLearning);
router.get("/:reviewId/report", protect, getCertifiedReport);

module.exports = router;
