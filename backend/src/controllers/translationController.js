const asyncHandler = require("express-async-handler");
const { translateText } = require("../services/translationService");

const translate = asyncHandler(async (req, res) => {
  const { text, texts, sourceLanguage = "en", targetLanguage } = req.body;
  const inputTexts = Array.isArray(texts) ? texts : [text];
  const cleanedTexts = inputTexts.filter((item) => typeof item === "string" && item.trim());

  if (!cleanedTexts.length) {
    res.status(400);
    throw new Error("Text is required for translation");
  }

  if (!targetLanguage) {
    res.status(400);
    throw new Error("Target language is required");
  }

  try {
    const translations = await translateText({
      texts: inputTexts,
      sourceLanguage,
      targetLanguage,
    });

    res.json({
      success: true,
      sourceLanguage,
      targetLanguage,
      translations,
    });
  } catch (error) {
    res.status(error.statusCode || 502).json({
      success: false,
      message: error.message || "Unable to translate the text.",
      details: process.env.NODE_ENV === "production" ? undefined : error.details,
    });
  }
});

module.exports = {
  translate,
};
