const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const predictionRoutes = require("./routes/predictionRoutes");
const translationRoutes = require("./routes/translationRoutes");
const shopRoutes = require("./routes/shopRoutes");
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
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend is running",
  });
});

