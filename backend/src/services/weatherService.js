const axios = require("axios");

const getWeatherApiBaseUrl = () => process.env.WEATHER_API_BASE_URL || "https://api.weatherapi.com/v1";

const normalizeWeatherApiError = (error) => {
  if (error.response) {
    const message =
      error.response.data?.error?.message ||
      error.response.data?.message ||
      "Weather API returned an error";
    const normalized = new Error(message);
    normalized.statusCode = error.response.status;
    return normalized;
  }

  if (error.code === "ECONNABORTED") {
    const normalized = new Error("Weather API request timed out");
    normalized.statusCode = 504;
    return normalized;
  }

  return error;
};

const getCurrentWeather = async (locationQuery) => {
  const apiKey = process.env.WEATHER_API_KEY;

  if (!apiKey) {
    const error = new Error("WEATHER_API_KEY is not configured");
    error.statusCode = 500;
    throw error;
  }

  try {
    const response = await axios.get(`${getWeatherApiBaseUrl().replace(/\/$/, "")}/current.json`, {
      params: {
        key: apiKey,
        q: locationQuery,
        aqi: "no",
      },
      timeout: 15000,
    });

    const current = response.data?.current;
    const apiLocation = response.data?.location;

    if (!current || !apiLocation) {
      const error = new Error("Weather API returned an invalid response");
      error.statusCode = 502;
      throw error;
    }

    return {
      location: {
        name: apiLocation.name,
        region: apiLocation.region,
        country: apiLocation.country,
      },
      weather: {
        temperature: current.temp_c,
        humidity: current.humidity,
        rainfall: current.precip_mm,
        wind_speed: current.wind_kph,
      },
    };
  } catch (error) {
    throw normalizeWeatherApiError(error);
  }
};

module.exports = {
  getCurrentWeather,
};
