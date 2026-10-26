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
  const localUri = process.env.MONGO_URI_LOCAL || "mongodb://127.0.0.1:27017/ldfrs";
  const atlasUri = process.env.MONGO_URI_ATLAS || (process.env.MONGO_URI?.includes("mongodb+srv") ? process.env.MONGO_URI : null);
  const useLocal = process.env.DATABASE_MODE !== "cloud";
  const primaryUri = useLocal ? localUri : (atlasUri || localUri);
  const fallbackUri = useLocal ? atlasUri : localUri;

  try {
    await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 5000 });
    console.log(`Connected to ${useLocal ? "Local MongoDB (mongodb://127.0.0.1:27017/ldfrs)" : "Cloud Atlas Database"}: database '${mongoose.connection.name}'`);
  } catch (err) {
    console.warn(`Primary database connection (${primaryUri}) failed: ${err.message}`);
    if (fallbackUri) {
      try {
        console.log(`Attempting fallback database connection to ${fallbackUri}...`);
        await mongoose.connect(fallbackUri, { serverSelectionTimeoutMS: 5000 });
        console.log(`Connected to fallback database: '${mongoose.connection.name}'`);
        return;
      } catch (fallbackErr) {
        console.error("Fallback MongoDB connection also failed:", fallbackErr.message);
      }
    }
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

httpServer.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Error: Port ${PORT} is already in use. Please terminate any running Node process on port ${PORT}.`);
  } else {
    console.error("HTTP Server Error:", err);
  }
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

