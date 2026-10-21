/** Require one of the supplied roles. Expert accounts must also be verified. */
const authorizeRoles = (...roles) => (req, res, next) => {
  const role = String(req.user?.role || "farmer").toLowerCase();
  const normalizedRole = role === "user" ? "farmer" : role;
  if (!roles.includes(normalizedRole)) {
    res.status(403);
    return next(new Error("You do not have permission to access this resource."));
  }
  if (normalizedRole === "expert" && !req.user?.expertProfile?.isVerified) {
    res.status(403);
    return next(new Error("Your expert account must be verified before reviewing diagnoses."));
  }
  req.user.role = normalizedRole;
  return next();
};

module.exports = { authorizeRoles };
