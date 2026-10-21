const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { OAuth2Client } = require("google-auth-library");

const normalizeRole = (value) => {
  const role = String(value || "").trim().toLowerCase();
  return ["farmer", "expert", "admin"].includes(role) ? role : "farmer";
};

const googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    res.status(503);
    throw new Error("Google sign-in is not configured on the server");
  }
  if (!credential) {
    res.status(400);
    throw new Error("Google credential is required");
  }
  const client = new OAuth2Client(clientId);
  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    payload = ticket.getPayload();
  } catch {
    res.status(401);
    throw new Error("Unable to verify Google sign-in");
  }
  if (!payload?.email || !payload.email_verified) {
    res.status(401);
    throw new Error("Google account must have a verified email");
  }
  const email = payload.email.toLowerCase();
  let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email }] });
  if (user) {
    if (user.googleId && user.googleId !== payload.sub) {
      res.status(409);
      throw new Error("This email is linked to a different Google account");
    }
    // Normalize legacy accounts before saving so old roles or incomplete profile
    // data do not prevent a Google account from being linked.
    const role = normalizeRole(user.role);
    const name = String(user.name || "").trim() || payload.name || email.split("@")[0];
    if (user.googleId !== payload.sub || user.role !== role || user.name !== name) {
      user.googleId = payload.sub;
      user.role = role;
      user.name = name;
      await user.save();
    }
  } else {
    user = await User.create({ name: payload.name || email.split("@")[0], email, googleId: payload.sub, role: "farmer" });
  }
  const token = generateToken(user._id, user.role);
  res.json({ success: true, message: "Google sign-in successful", token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

// REGISTER
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Name, email and password are required");
  }

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    res.status(400);
    throw new Error("User already exists");
  }

  const user = await User.create({
    name,
    email,
    password,
  });

  const token = generateToken(user._id, user.role);

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// LOGIN
const login = asyncHandler(async (req, res) => {
  const { email, password, role: requestedRole } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  const normalizedRole = normalizeRole(user.role);
  if (user.role !== normalizedRole) {
    user.role = normalizedRole;
    await user.save();
  }

  if (requestedRole && !["farmer", "expert", "admin"].includes(requestedRole)) {
    res.status(400);
    throw new Error("Select a valid account role.");
  }
  if (requestedRole && requestedRole !== normalizedRole) {
    res.status(403);
    throw new Error(`This account does not have the ${requestedRole} role. Choose the correct role or contact the administrator.`);
  }
  if (requestedRole === "expert" && !user.expertProfile?.isVerified) {
    res.status(403);
    throw new Error("This expert account has not been verified by an administrator yet.");
  }

  const token = generateToken(user._id, user.role);

  res.json({
    success: true,
    message: "Login successful",
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});
const getMe = asyncHandler(async (req, res) => {
  const role = normalizeRole(req.user.role);
  if (req.user.role !== role) {
    req.user.role = role;
    await req.user.save();
  }
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role,
      expertProfile: req.user.expertProfile,
    },
  });
});
const logout = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: "Logout successful",
  });
});

module.exports = {
  register,
  login,
  getMe,
  logout,
  googleLogin
};
