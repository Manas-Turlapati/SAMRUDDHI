const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, token missing");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      res.status(401);
      throw new Error("User no longer exists");
    }

    req.user = user;

    next();
  } catch (error) {
    res.status(401);
    throw new Error("Not authorized, invalid token");
  }
});

module.exports = protect;
module.exports.protect = protect;
module.exports.optionalProtect = (req, res, next) => {
  if (!req.headers.authorization?.startsWith("Bearer ")) return next();
  return protect(req, res, next);
};

/** Validate the short-lived session issued after a one-time review link is opened. */
module.exports.verifyMagicReviewToken = async (req, res, next) => {
  const jwt = require("jsonwebtoken");
  const ExpertReview = require("../models/ExpertReview");
  const token = req.get("x-review-access");
  if (!token) {
    res.status(401);
    return next(new Error("A valid review session is required."));
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.purpose !== "expert-review" || payload.reviewId !== req.params.reviewId) {
      res.status(401);
      return next(new Error("Review session is invalid."));
    }
    const review = await ExpertReview.findOne({ reviewId: payload.reviewId, status: "PENDING" });
    if (!review) {
      res.status(404);
      return next(new Error("This review is no longer pending."));
    }
    req.reviewAccess = { reviewId: payload.reviewId, review };
    return next();
  } catch {
    res.status(401);
    return next(new Error("Review session is invalid or expired."));
  }
};
