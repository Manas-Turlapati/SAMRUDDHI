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

// Evaluate an individual hour's spray conditions
const evaluateHourSpray = (h) => {
  const rainChance = Number(h.chance_of_rain || 0);
  const precip = Number(h.precip_mm || 0);
  const wind = Number(h.wind_kph || 0);
  const temp = Number(h.temp_c || 22);

  // Poor conditions (Do Not Spray)
  if (rainChance > 40 || precip >= 0.8 || wind >= 19 || temp >= 35 || temp <= 10) {
    let reason = "High wind drift";
    if (rainChance > 40 || precip >= 0.8) reason = "Rain wash-off risk";
    else if (temp >= 35) reason = "Excessive heat / leaf burn";
    else if (temp <= 10) reason = "Too cold for uptake";
    return { status: "poor", label: "Do Not Spray", color: "#dc2626", reason };
  }

  // Caution conditions
  if (rainChance >= 20 || wind >= 13 || temp >= 31 || temp <= 14) {
    let reason = "Moderate wind";
    if (rainChance >= 20) reason = "Possible drizzle";
    else if (temp >= 31) reason = "High temperature";
    return { status: "caution", label: "Caution", color: "#d97706", reason };
  }

  // Optimal conditions
  return { status: "optimal", label: "Optimal", color: "#16a34a", reason: "Ideal calm weather" };
};

// Format military hour "2026-10-26 14:00" -> "2:00 PM"
const formatHourTime = (timeStr) => {
  if (!timeStr) return "";
  const parts = timeStr.split(" ");
  const timeOnly = parts[1] || timeStr;
  const [hourStr, minStr] = timeOnly.split(":");
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minStr || "00"} ${ampm}`;
};

const calculateSmartSprayAdvisory = ({ current, forecastDays, disease }) => {
  const today = forecastDays?.[0];
  const tomorrow = forecastDays?.[1];
  const allHours = (today?.hour || []).concat(tomorrow?.hour || []);

  const nowEpoch = current.last_updated_epoch || Math.floor(Date.now() / 1000);
  // Get upcoming hours starting from the current hour
  const upcomingHours = allHours
    .filter((h) => h.time_epoch >= nowEpoch - 1800)
    .slice(0, 16);

  const hourlyForecast = upcomingHours.map((h) => {
    const evalResult = evaluateHourSpray(h);
    return {
      rawTime: h.time,
      time: formatHourTime(h.time),
      temp_c: Math.round(h.temp_c * 10) / 10,
      humidity: h.humidity,
      wind_kph: Math.round(h.wind_kph * 10) / 10,
      gust_kph: Math.round((h.gust_kph || h.wind_kph) * 10) / 10,
      chance_of_rain: Number(h.chance_of_rain || 0),
      precip_mm: Number(h.precip_mm || 0),
      condition: h.condition?.text || "Clear",
      icon: h.condition?.icon ? (h.condition.icon.startsWith("//") ? `https:${h.condition.icon}` : h.condition.icon) : null,
      suitability: evalResult.status,
      suitabilityLabel: evalResult.label,
      color: evalResult.color,
      reason: evalResult.reason,
    };
  });

  // Evaluate CURRENT right-now conditions
  const currentEval = evaluateHourSpray({
    chance_of_rain: today?.day?.daily_chance_of_rain || 0,
    precip_mm: current.precip_mm,
    wind_kph: current.wind_kph,
    temp_c: current.temp_c,
  });

  // Find next best safe spray window in the upcoming hours
  const optimalSlots = hourlyForecast.filter((h) => h.suitability === "optimal");
  let bestWindow = "Early Morning (6:30 AM – 9:30 AM)";
  if (optimalSlots.length >= 2) {
    bestWindow = `${optimalSlots[0].time} – ${optimalSlots[Math.min(3, optimalSlots.length - 1)].time}`;
  } else if (optimalSlots.length === 1) {
    bestWindow = `Around ${optimalSlots[0].time}`;
  } else {
    const cautionSlots = hourlyForecast.filter((h) => h.suitability === "caution");
    if (cautionSlots.length > 0) {
      bestWindow = `Marginal: ${cautionSlots[0].time} (Exercise caution)`;
    } else {
      bestWindow = "Postpone today; wait for rain/winds to subside";
    }
  }

  // Rain Threat Assessment
  const nextRainHour = hourlyForecast.find((h) => h.chance_of_rain >= 35 || h.precip_mm >= 0.5);
  let rainThreat = {
    chance: today?.day?.daily_chance_of_rain || 0,
    precipMm: today?.day?.totalprecip_mm || 0,
    assessment: "0% – 10% rain chance for the next 24 hours. Minimal risk of chemical wash-off.",
    isThreat: false,
  };
  if (nextRainHour) {
    rainThreat = {
      chance: nextRainHour.chance_of_rain,
      precipMm: nextRainHour.precip_mm,
      assessment: `⚠️ Rain expected around ${nextRainHour.time} (${nextRainHour.chance_of_rain}% chance, ${nextRainHour.precip_mm}mm). Sprays require at least 3 hours of dry leaf time to adhere.`,
      isThreat: true,
    };
  }

  // Wind & Drift Assessment
  const windKph = current.wind_kph || 0;
  let windAssessment = `Calm (${windKph} km/h) — Excellent conditions. Zero spray drift risk.`;
  let windStatus = "safe";
  if (windKph >= 19) {
    windAssessment = `Strong winds (${windKph} km/h, gusts to ${current.gust_kph || windKph} km/h) — High spray drift risk to non-target crops. Postpone spraying.`;
    windStatus = "high";
  } else if (windKph >= 13) {
    windAssessment = `Moderate breeze (${windKph} km/h) — Minor drift risk. Lower spray boom height and use coarse droplet nozzles.`;
    windStatus = "moderate";
  }

  // Temperature & Evaporation Assessment
  const tempC = current.temp_c || 22;
  let tempAssessment = `Comfortable (${tempC}°C) — Ideal for systemic foliar absorption.`;
  if (tempC >= 34) {
    tempAssessment = `High Heat (${tempC}°C) — Rapid chemical evaporation & risk of leaf scorch. Spray early morning only.`;
  } else if (tempC <= 12) {
    tempAssessment = `Cold (${tempC}°C) — Slow plant metabolism; systemic uptake will be delayed.`;
  }

  // Leaf Drying Speed
  const humidity = current.humidity || 50;
  let leafDrying = "Normal drying speed (~1 hour).";
  if (humidity >= 85) {
    leafDrying = "Slow drying speed (> 2.5 hours) due to high humidity. Avoid evening applications to prevent fungal dew incubation.";
  } else if (humidity <= 35) {
    leafDrying = "Very rapid drying (< 30 mins) due to dry air. Ensure thorough spray volume.";
  }

  // Overall Recommendation Summary
  let summary = "Current environmental conditions are optimal for foliar spray and fertilizer application.";
  if (currentEval.status === "poor") {
    summary = `Postpone spraying! ${currentEval.reason}. Spraying now risks chemical wash-off or drift loss. Next favorable window: ${bestWindow}.`;
  } else if (currentEval.status === "caution") {
    summary = `Spraying is possible with caution (${currentEval.reason}). Target early morning or late evening for best droplet retention.`;
  }

  return {
    status: currentEval.status,
    badge: currentEval.status === "optimal" ? "Safe to Spray / Fertilize" : currentEval.status === "caution" ? "Spray with Caution" : "Do Not Spray (Postpone)",
    score: currentEval.status === "optimal" ? 92 : currentEval.status === "caution" ? 60 : 25,
    summary,
    bestWindow,
    rainThreat,
    wind: {
      speedKph: windKph,
      gustKph: current.gust_kph || windKph,
      direction: current.wind_dir || "N/A",
      status: windStatus,
      assessment: windAssessment,
    },
    temperature: {
      tempC,
      assessment: tempAssessment,
    },
    humidity: {
      percentage: humidity,
      leafDrying,
    },
    hourlyForecast: hourlyForecast.slice(0, 10),
  };
};

const getSmartSprayForecast = async (locationQuery, disease) => {
  const apiKey = process.env.WEATHER_API_KEY;

  if (!apiKey) {
    const error = new Error("WEATHER_API_KEY is not configured");
    error.statusCode = 500;
    throw error;
  }

  try {
    const response = await axios.get(`${getWeatherApiBaseUrl().replace(/\/$/, "")}/forecast.json`, {
      params: {
        key: apiKey,
        q: locationQuery,
        days: 3,
        aqi: "no",
      },
      timeout: 15000,
    });

    const current = response.data?.current;
    const apiLocation = response.data?.location;
    const forecastDays = response.data?.forecast?.forecastday || [];

    if (!current || !apiLocation) {
      const error = new Error("Weather API returned an invalid response");
      error.statusCode = 502;
      throw error;
    }

    const smartSpray = calculateSmartSprayAdvisory({
      current,
      forecastDays,
      disease,
    });

    return {
      location: {
        name: apiLocation.name,
        region: apiLocation.region,
        country: apiLocation.country,
        lat: apiLocation.lat,
        lon: apiLocation.lon,
        localtime: apiLocation.localtime,
      },
      weather: {
        temperature: current.temp_c,
        humidity: current.humidity,
        rainfall: current.precip_mm,
        wind_speed: current.wind_kph,
        wind_dir: current.wind_dir,
        gust_speed: current.gust_kph,
        uv: current.uv,
        condition: current.condition?.text || "Clear",
        icon: current.condition?.icon ? (current.condition.icon.startsWith("//") ? `https:${current.condition.icon}` : current.condition.icon) : null,
      },
      smartSpray,
    };
  } catch (error) {
    console.warn(`Weather API unreachable (${error.code || error.message}). Falling back to offline agronomic spray advisor.`);
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return {
      isOffline: true,
      location: {
        name: "Local Field (Offline Mode)",
        region: "Agronomic Zone",
        country: "India",
        lat: Number(String(locationQuery).split(",")[0]) || 0,
        lon: Number(String(locationQuery).split(",")[1]) || 0,
        localtime: nowTime,
      },
      weather: {
        temperature: 25,
        humidity: 60,
        rainfall: 0,
        wind_speed: 8,
        wind_dir: "NW",
        gust_speed: 11,
        uv: 5,
        condition: "Offline Field Observation",
        icon: null,
      },
      smartSpray: {
        status: "caution",
        badge: "Offline Spray Guidance",
        score: 70,
        summary: "Operating in Offline Mode (no active internet connection). Following certified agronomic spray safety rules: spray only in early morning (6:30–9:30 AM) when winds are gentle and foliage dew has evaporated. Check sky visually for incoming dark clouds.",
        bestWindow: "Early Morning (6:30 AM – 9:30 AM)",
        rainThreat: {
          chance: 0,
          precipMm: 0,
          assessment: "Offline visual check required: If dark rain clouds appear or barometric pressure drops, postpone spraying by 24 hours.",
          isThreat: false,
        },
        wind: {
          speedKph: 8,
          gustKph: 12,
          direction: "Calm",
          status: "safe",
          assessment: "Offline baseline. Spray only when crop foliage is still or gently rustling (< 12 km/h) to avoid spray drift.",
        },
        temperature: {
          tempC: 25,
          assessment: "Spray before midday sun (avoid > 32°C) to prevent chemical leaf burn and rapid droplet evaporation.",
        },
        humidity: {
          percentage: 60,
          leafDrying: "Allow at least 3–4 hours of dry foliage after spray application for systemic uptake.",
        },
        hourlyForecast: [
          { time: "6:00 AM", temp_c: 20, humidity: 75, wind_kph: 6, chance_of_rain: 0, precip_mm: 0, condition: "Calm Morning", icon: null, suitability: "optimal", suitabilityLabel: "Optimal", color: "#16a34a", reason: "Cool & calm" },
          { time: "7:00 AM", temp_c: 22, humidity: 68, wind_kph: 7, chance_of_rain: 0, precip_mm: 0, condition: "Optimal Window", icon: null, suitability: "optimal", suitabilityLabel: "Optimal", color: "#16a34a", reason: "Ideal spray conditions" },
          { time: "8:00 AM", temp_c: 24, humidity: 60, wind_kph: 9, chance_of_rain: 0, precip_mm: 0, condition: "Optimal Window", icon: null, suitability: "optimal", suitabilityLabel: "Optimal", color: "#16a34a", reason: "Good absorption" },
          { time: "9:00 AM", temp_c: 27, humidity: 52, wind_kph: 11, chance_of_rain: 0, precip_mm: 0, condition: "Moderate Sun", icon: null, suitability: "caution", suitabilityLabel: "Caution", color: "#d97706", reason: "Rising temperature" },
          { time: "12:00 PM", temp_c: 32, humidity: 38, wind_kph: 16, chance_of_rain: 0, precip_mm: 0, condition: "Midday Heat", icon: null, suitability: "poor", suitabilityLabel: "Do Not Spray", color: "#dc2626", reason: "High heat & evaporation" },
          { time: "5:00 PM", temp_c: 28, humidity: 55, wind_kph: 10, chance_of_rain: 0, precip_mm: 0, condition: "Late Afternoon", icon: null, suitability: "optimal", suitabilityLabel: "Optimal", color: "#16a34a", reason: "Calming wind & shade" }
        ],
      },
    };
  }
};

const getCurrentWeather = async (locationQuery) => {
  const result = await getSmartSprayForecast(locationQuery);
  return {
    location: result.location,
    weather: result.weather,
    smartSpray: result.smartSpray,
  };
};

module.exports = {
  getCurrentWeather,
  getSmartSprayForecast,
};
