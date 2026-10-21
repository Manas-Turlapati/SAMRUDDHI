const axios = require("axios");

const normalizeUrl = (value) => value.replace(/\/$/, "").replace(/\/predict$/, "");
const getLocalMlApiUrl = () => normalizeUrl(process.env.LOCAL_ML_API_URL || "http://localhost:8001");
const getConfiguredMlApiUrl = () => process.env.ML_API_URL ? normalizeUrl(process.env.ML_API_URL) : null;

let cachedUrl = null;
let cachedAt = 0;

const getMlApiUrl = async () => {
  if (cachedUrl && Date.now() - cachedAt < 5000) return cachedUrl;

  const localUrl = getLocalMlApiUrl();
  try {
    // Use a running local model for local demos. Hosted backends quickly fall
    // back to their configured remote ML service.
    await axios.get(`${localUrl}/health`, { timeout: 1200 });
    cachedUrl = localUrl;
  } catch {
    cachedUrl = getConfiguredMlApiUrl() || localUrl;
  }

  cachedAt = Date.now();
  return cachedUrl;
};

getMlApiUrl.getLocalMlApiUrl = getLocalMlApiUrl;
module.exports = getMlApiUrl;
