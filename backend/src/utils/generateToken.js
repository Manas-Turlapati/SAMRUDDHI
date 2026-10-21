const jwt = require("jsonwebtoken");

const generateToken = (userId, role) => {
  const expiresIn = String(role || "").toLowerCase() === "farmer" ? "4h" : "7d";

  return jwt.sign(
    {
      userId,
      role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn,
    },
  );
};

module.exports = generateToken;
