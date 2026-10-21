const asyncHandler = require("express-async-handler");
const axios = require("axios");
const FormData = require("form-data");
const crypto = require("crypto");

const Prediction = require("../models/Prediction");
const User = require("../models/User");
const { getDiseaseInformation } = require("../services/diseaseInfoService");
const { recommendFertilizer } = require("../services/fertilizerRecommendationService");
const predictLeaf = require("../services/mlService");
const { createPredictionReport } = require("../services/reportService");

const createReportBuffer = (prediction, user) => new Promise((resolve, reject) => {
  const doc = createPredictionReport({ prediction, user });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  doc.on("end", () => resolve(Buffer.concat(chunks)));
  doc.on("error", reject);
  doc.end();
});

const getDeliverySummary = (prediction) => {
  const confidence = Number(prediction.confidence);
  const percent = confidence <= 1 ? confidence * 100 : confidence;
  return `Leaf Diagnosis Report\nDisease: ${prediction.disease}\nConfidence: ${Math.round(percent * 10) / 10}%`;
};

const getDeliveryToken = (predictionId, expiresAt) => {
  const secret = process.env.REPORT_DELIVERY_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error("Report delivery signing is not configured.");
  const signature = crypto.createHmac("sha256", secret).update(`${predictionId}:${expiresAt}`).digest("hex");
  return `${expiresAt}.${signature}`;
};

const verifyDeliveryToken = (predictionId, token) => {
  const [expiryText, signature] = String(token || "").split(".");
  const expiresAt = Number(expiryText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt < Date.now() || expiresAt > Date.now() + 15 * 60 * 1000 || !signature) return false;
  const expected = getDeliveryToken(predictionId, expiresAt).split(".")[1];
  const actualBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
};
const predict = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("Leaf image is required");
  }
  const latitude = Number(req.body.latitude);
  const longitude = Number(req.body.longitude);
  const hasLocation = Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;

  // Send image to Python ML service
  const result = await predictLeaf(req.file);
  const disease = result.prediction.disease;
  const confidence = result.prediction.confidence;
  const diseaseInformation = getDiseaseInformation(disease);
  const fertilizerRecommendation = recommendFertilizer({
    crop: req.body.crop || diseaseInformation.crop,
    disease,
    nitrogen: req.body.nitrogen ?? req.body.N,
    phosphorus: req.body.phosphorus ?? req.body.P,
    potassium: req.body.potassium ?? req.body.K,
    ph: req.body.ph ?? req.body.pH,
    growthStage: req.body.growth_stage || req.body.growthStage,
  });

  const prediction = await Prediction.create({
    user: req.user._id,
    imageName: req.file.originalname,
    disease,
    confidence,
    diseaseInformation,
    recommendation: fertilizerRecommendation,
    image: req.file.buffer,
    imageMimeType: req.file.mimetype,
    ...(hasLocation ? { location: { latitude, longitude } } : {}),
  });

  res.status(200).json({
    success: true,
    predictionId: prediction._id,
    prediction: {
      disease: prediction.disease,
      confidence: prediction.confidence,
    },
    fertilizer_recommendation: prediction.recommendation,
    recommendation: prediction.recommendation,
    disease_information: prediction.diseaseInformation,
  });
});
const getHistory = asyncHandler(async (req, res) => {
  const predictions = await Prediction.find({
    user: req.user._id,
  }).sort({ createdAt: -1 });

  res.json({
    success: true,
    predictions,
  });
});

const getDiseaseMap = asyncHandler(async (req, res) => {
  const predictions = await Prediction.find({ "location.latitude": { $exists: true }, "location.longitude": { $exists: true } })
    .select("disease confidence location createdAt")
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean();
  const reports = predictions.map(({ _id, disease, confidence, location, createdAt }) => ({
    _id,
    disease,
    confidence,
    createdAt,
    location: { latitude: Math.round(location.latitude * 100) / 100, longitude: Math.round(location.longitude * 100) / 100 },
  }));
  res.json({ success: true, predictions: reports });
});

const downloadReport = asyncHandler(async (req, res) => {
  const prediction = await Prediction.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!prediction) {
    res.status(404);
    throw new Error("Prediction report not found");
  }

  const filename = `samruddhi-report-${prediction._id}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const doc = createPredictionReport({
    prediction,
    user: req.user,
  });

  doc.pipe(res);
  doc.end();
});

const sendReport = asyncHandler(async (req, res) => {
  const channel = String(req.body.channel || "").trim().toLowerCase();
  const recipient = String(req.body.recipient || "").trim();
  const prediction = await Prediction.findOne({ _id: req.params.id, user: req.user._id });
  if (!prediction) {
    res.status(404);
    throw new Error("Prediction report not found");
  }
  if (!recipient) {
    res.status(400);
    throw new Error("Enter a WhatsApp number or Telegram chat ID.");
  }

  const report = await createReportBuffer(prediction, req.user);
  const filename = `samruddhi-report-${prediction._id}.pdf`;
  const summary = getDeliverySummary(prediction);

  if (channel === "telegram") {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      res.status(503);
      throw new Error("Telegram delivery is not configured on the server.");
    }
    if (!/^-?\d+$/.test(recipient)) {
      res.status(400);
      throw new Error("Enter the numeric Telegram chat ID. The farmer must start the bot first.");
    }
    const form = new FormData();
    form.append("chat_id", recipient);
    form.append("caption", summary);
    form.append("document", report, { filename, contentType: "application/pdf" });
    try {
      await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendDocument`, form, {
        headers: form.getHeaders(),
        timeout: 20000,
        maxBodyLength: Infinity,
      });
    } catch (error) {
      const detail = error.response?.data?.description;
      res.status(502);
      throw new Error(detail || "Telegram could not deliver the report. Check the chat ID and make sure the farmer has started the bot.");
    }
  } else if (channel === "whatsapp") {
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, TWILIO_WHATSAPP_CONTENT_SID } = process.env;
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM || !TWILIO_WHATSAPP_CONTENT_SID) {
      res.status(503);
      throw new Error("WhatsApp delivery needs Twilio credentials, an approved PDF media template, and a WhatsApp sender.");
    }
    if (!/^\+[1-9]\d{7,14}$/.test(recipient)) {
      res.status(400);
      throw new Error("Enter the WhatsApp number in international format, for example +919876543210.");
    }
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const token = getDeliveryToken(prediction._id.toString(), expiresAt);
    const deliveryKey = `${prediction._id}-${token}`.replace(".", "-");
    const form = new URLSearchParams({
      To: `whatsapp:${recipient}`,
      From: TWILIO_WHATSAPP_FROM.startsWith("whatsapp:") ? TWILIO_WHATSAPP_FROM : `whatsapp:${TWILIO_WHATSAPP_FROM}`,
      ContentSid: TWILIO_WHATSAPP_CONTENT_SID,
      ContentVariables: JSON.stringify({ "1": deliveryKey, "2": prediction.disease, "3": `${Math.round((Number(prediction.confidence) <= 1 ? Number(prediction.confidence) * 100 : Number(prediction.confidence)) * 10) / 10}` }),
    });
    try {
      await axios.post(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, form, {
        auth: { username: TWILIO_ACCOUNT_SID, password: TWILIO_AUTH_TOKEN },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 20000,
      });
    } catch (error) {
      const twilioCode = Number(error.response?.data?.code);
      if (twilioCode === 21655 || twilioCode === 92006) {
        res.status(502);
        throw new Error(
          "Twilio rejected the WhatsApp template. Set TWILIO_WHATSAPP_CONTENT_SID to an active Content Template SID (starts with HX) owned by the same Twilio account as TWILIO_ACCOUNT_SID. Update the backend's deployed environment and restart it.",
        );
      }
      const detail = error.response?.data?.message;
      res.status(502);
      throw new Error(detail || "WhatsApp could not deliver the report. Check the recipient and Twilio WhatsApp setup.");
    }
  } else {
    res.status(400);
    throw new Error("Choose WhatsApp or Telegram for report delivery.");
  }

  res.json({ success: true, message: `Report sent through ${channel === "whatsapp" ? "WhatsApp" : "Telegram"}.` });
});

const downloadDeliveryReport = asyncHandler(async (req, res) => {
  const match = /^([a-f\d]{24})-(\d{13})-([a-f\d]{64})$/i.exec(req.params.deliveryKey || "");
  const predictionId = match?.[1];
  const token = match ? `${match[2]}.${match[3]}` : "";
  if (!predictionId || !verifyDeliveryToken(predictionId, token)) {
    res.status(403);
    throw new Error("This report delivery link is invalid or has expired.");
  }
  const prediction = await Prediction.findById(predictionId);
  if (!prediction) {
    res.status(404);
    throw new Error("Prediction report not found");
  }
  const user = await User.findById(prediction.user);
  if (!user) {
    res.status(404);
    throw new Error("Report owner not found");
  }
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="samruddhi-report-${prediction._id}.pdf"`);
  const doc = createPredictionReport({ prediction, user });
  doc.pipe(res);
  doc.end();
});

const consultExpert = asyncHandler(async (req, res) => {
  res.status(503);
  res.json({ success: false, message: "Expert referrals are temporarily unavailable." });
});

module.exports = {
  predict,
  getHistory,
  getDiseaseMap,
  downloadReport,
  sendReport,
  downloadDeliveryReport,
  consultExpert,
};
