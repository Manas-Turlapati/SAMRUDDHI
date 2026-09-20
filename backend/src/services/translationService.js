const axios = require("axios");

const GOOGLE_TRANSLATE_ENDPOINT =
  process.env.GOOGLE_TRANSLATE_API_URL || "https://translate.googleapis.com/translate_a/single";

const MYMEMORY_TRANSLATE_ENDPOINT =
  process.env.MYMEMORY_TRANSLATE_API_URL || "https://api.mymemory.translated.net/get";

const createTranslationError = (message, statusCode = 502, details = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
};

const normalizeLanguage = (language) => {
  if (!language || typeof language !== "string") return "";
  return language.trim().toLowerCase();
};

const getErrorDetails = (error) => error.response?.data || error.message;

const translateWithGoogle = async ({ text, sourceLanguage, targetLanguage }) => {
  const response = await axios.get(GOOGLE_TRANSLATE_ENDPOINT, {
    params: {
      client: "gtx",
      sl: sourceLanguage,
      tl: targetLanguage,
      dt: "t",
      q: text,
    },
    timeout: 30000,
  });

  const translatedText = response.data?.[0]?.map((item) => item?.[0] || "").join("");

  if (!translatedText) {
    throw createTranslationError("Google Translate returned no translated text.", 502, response.data);
  }

  return translatedText;
};

const translateWithMyMemory = async ({ text, sourceLanguage, targetLanguage }) => {
  const response = await axios.get(MYMEMORY_TRANSLATE_ENDPOINT, {
    params: {
      q: text,
      langpair: `${sourceLanguage}|${targetLanguage}`,
    },
    timeout: 30000,
  });

  const data = response.data;
  const responseStatus = Number(data?.responseStatus);

  if (responseStatus && responseStatus !== 200) {
    throw createTranslationError(data.responseDetails || "MyMemory could not translate this text.", 502, data);
  }

  const translatedText = data?.responseData?.translatedText;

  if (!translatedText) {
    throw createTranslationError("MyMemory returned no translated text.", 502, data);
  }

  return translatedText;
};

const translateSingleText = async ({ text, sourceLanguage, targetLanguage }) => {
  if (sourceLanguage === targetLanguage) {
    return text;
  }

  const errors = [];

  for (const provider of [translateWithGoogle, translateWithMyMemory]) {
    try {
      return await provider({ text, sourceLanguage, targetLanguage });
    } catch (error) {
      errors.push(getErrorDetails(error));
    }
  }

  throw createTranslationError("Unable to reach the free translation services.", 502, errors);
};

const translateText = async ({ texts, sourceLanguage = "en", targetLanguage }) => {
  const normalizedSource = normalizeLanguage(sourceLanguage) || "en";
  const normalizedTarget = normalizeLanguage(targetLanguage);

  if (!normalizedTarget) {
    throw createTranslationError("Target language is required", 400);
  }

  const cleanedTexts = texts.map((text) => (typeof text === "string" ? text.trim() : ""));

  return Promise.all(
    cleanedTexts.map((text) =>
      text
        ? translateSingleText({
            text,
            sourceLanguage: normalizedSource,
            targetLanguage: normalizedTarget,
          })
        : Promise.resolve(""),
    ),
  );
};

module.exports = {
  translateText,
};
