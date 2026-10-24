const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");
const axios = require("axios");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const User = require("./models/User");
const getMlApiUrl = require("./config/mlConfig");
const authRoutes = require("./routes/authRoutes");
const predictionRoutes = require("./routes/predictionRoutes");
const diagnosisRoutes = require("./routes/diagnosisRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const translationRoutes = require("./routes/translationRoutes");
const shopRoutes = require("./routes/shopRoutes");
const weatherRiskRoutes = require("./routes/weatherRiskRoutes");
const recoveryRoutes = require("./routes/recoveryRoutes");
const errorHandler = require("./middleware/errorMiddleware");

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();

// MUST come before routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({origin:"*"}));
const connectDB = async () => {
  try {
    // Keep the hosted Atlas URI as the default, while allowing the same local
    // backend to run against the laptop's MongoDB for offline demos.
    const mongoUri = process.env.DATABASE_MODE === "local"
      ? (process.env.MONGO_URI_LOCAL || "mongodb://127.0.0.1:27017/ldfrs")
      : process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("Set MONGO_URI, or set DATABASE_MODE=local for laptop MongoDB.");
    }
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected successfully!");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
};

connectDB();

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: process.env.FRONTEND_URL || "*" } });
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("name email role expertProfile");
    if (!user) return next(new Error("User no longer exists"));
    socket.user = user;
    return next();
  } catch {
    return next(new Error("Invalid socket session"));
  }
});
io.on("connection", (socket) => socket.join(`farmer:${socket.user._id}`));
app.set("io", io);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/diagnoses", diagnosisRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/predictions", predictionRoutes);
app.use("/api/translation", translationRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/weather-risk", weatherRiskRoutes);
app.use("/api/recovery", recoveryRoutes);
app.get("/api/health", async (req, res) => {
  const mlApiUrl = await getMlApiUrl();
  res.json({
    success: true,
    backend: "running",
    mlApiConfigured: true,
    mlApiUrl,
    mlApiUrlSource: mlApiUrl === getMlApiUrl.getLocalMlApiUrl() ? "local service" : "environment",
  });
});
app.get("/api/health/ml", async (req, res) => {
  const mlApiUrl = await getMlApiUrl();

  try {
    const response = await axios.get(`${mlApiUrl}/health`, {
      timeout: 15000,
    });

    res.json({
      success: true,
      mlApiUrl,
      mlHealth: response.data,
    });
  } catch (error) {
    res.status(502).json({
      success: false,
      mlApiUrl,
      message: error.response?.data?.message || error.message || "Unable to reach ML service",
      status: error.response?.status || null,
    });
  }
});
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend is running",
  });
});

app.use(errorHandler);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

