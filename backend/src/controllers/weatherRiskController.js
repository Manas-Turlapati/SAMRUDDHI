const asyncHandler = require("express-async-handler");

const { analyzeDiseaseRisk } = require("../services/diseaseRiskService");
const { getCurrentWeather } = require("../services/weatherService");

const analyzeWeatherRisk = asyncHandler(async (req, res) => {
  const { location, latitude, longitude, disease } = req.body;
  const hasCoordinates = latitude !== undefined && longitude !== undefined;

  if (!hasCoordinates && (!location || !String(location).trim())) {
    res.status(400);
    throw new Error("Location or latitude/longitude is required");
  }

  if (!disease || !String(disease).trim()) {
    res.status(400);
    throw new Error("Disease is required");
  }

  const locationQuery = hasCoordinates ? `${Number(latitude)},${Number(longitude)}` : String(location).trim();
  const weatherResult = await getCurrentWeather(locationQuery);
  const diseaseRisk = analyzeDiseaseRisk({
    disease,
    weather: weatherResult.weather,
  });

  res.json({
    success: true,
    location: weatherResult.location,
    weather: weatherResult.weather,
    disease_risk: diseaseRisk,
  });
});

module.exports = {
  analyzeWeatherRisk,
};
