const axios = require("axios");
const FormData = require("form-data");

const normalizeMlError = (error) => {
  if (error.response) {
    const message =
      error.response.data?.message ||
      error.response.data?.detail ||
      error.response.data?.error ||
      "ML service returned an error";
    const normalized = new Error(Array.isArray(message) ? JSON.stringify(message) : message);
    normalized.statusCode = error.response.status;
    return normalized;
  }

  if (error.code === "ECONNREFUSED") {
    const normalized = new Error("ML service is not reachable. Make sure FastAPI is running on ML_API_URL.");
    normalized.statusCode = 503;
    return normalized;
  }

  if (error.code === "ECONNABORTED") {
    const normalized = new Error("ML service request timed out");
    normalized.statusCode = 504;
    return normalized;
  }

  return error;
};

const predictLeaf = async (file) => {
  const mlApiUrl = process.env.ML_API_URL;

  if (!mlApiUrl) {
    throw new Error("ML_API_URL is not configured");
  }

  const form = new FormData();

  form.append("file", file.buffer, {
    filename: file.originalname,
    contentType: file.mimetype,
  });

  try {
    const response = await axios.post(
      `${mlApiUrl.replace(/\/$/, "")}/predict`,
      form,
      {
        headers: form.getHeaders(),
        timeout: 60000,
      },
    );

    if (!response.data?.prediction?.disease || response.data.prediction.confidence === undefined) {
      const invalidResponse = new Error("ML service returned an invalid prediction response");
      invalidResponse.statusCode = 502;
      throw invalidResponse;
    }

    return response.data;
  } catch (error) {
    throw normalizeMlError(error);
  }
};

module.exports = predictLeaf;
