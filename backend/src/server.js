const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");
const axios = require("axios");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const predictionRoutes = require("./routes/predictionRoutes");
const translationRoutes = require("./routes/translationRoutes");
const shopRoutes = require("./routes/shopRoutes");
const weatherRiskRoutes = require("./routes/weatherRiskRoutes");
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
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully!");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
};

connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/predictions", predictionRoutes);
app.use("/api/translation", translationRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/weather-risk", weatherRiskRoutes);
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    backend: "running",
    mlApiConfigured: Boolean(process.env.ML_API_URL),
    mlApiUrl: process.env.ML_API_URL ? process.env.ML_API_URL.replace(/\/$/, "") : null,
  });
});
app.get("/api/health/ml", async (req, res) => {
  const mlApiUrl = process.env.ML_API_URL?.replace(/\/$/, "").replace(/\/predict$/, "");

  if (!mlApiUrl) {
    res.status(500).json({
      success: false,
      message: "ML_API_URL is not configured",
    });
    return;
  }

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

