const {
  defaultWeatherRiskRule,
  diseaseWeatherRiskRules,
} = require("../data/diseaseWeatherRiskRules");

const normalizeDiseaseName = (disease = "") =>
  String(disease)
    .replace(/___/g, " ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const findRiskRule = (disease) => {
  const normalizedDisease = normalizeDiseaseName(disease);
  const matchedKey = Object.keys(diseaseWeatherRiskRules).find((key) => normalizedDisease.includes(key));

  if (!matchedKey) {
    return {
      rule: defaultWeatherRiskRule,
      matchedDisease: null,
    };
  }

  return {
    rule: diseaseWeatherRiskRules[matchedKey],
    matchedDisease: diseaseWeatherRiskRules[matchedKey].displayName,
  };
};

const isInRange = (value, range) => Number(value) >= range.min && Number(value) <= range.max;

const getRiskLevel = (score) => {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
};

const analyzeDiseaseRisk = ({ disease, weather }) => {
  const { rule, matchedDisease } = findRiskRule(disease);
  const reasons = [];
  let score = rule.baseline;

  if (isInRange(weather.temperature, rule.favorableTemperature)) {
    score += rule.favorableTemperature.weight;
    reasons.push("temperature is within the configured favorable range");
  }

  if (Number(weather.humidity) >= rule.highHumidity.min) {
    score += rule.highHumidity.weight;
    reasons.push("relative humidity is high");
  }

  if (Number(weather.rainfall) >= rule.rainfall.min) {
    score += rule.rainfall.weight;
    reasons.push("recent precipitation is present");
  }

  if (Number(weather.wind_speed) <= rule.lowWind.max) {
    score += rule.lowWind.weight;
    reasons.push("wind speed is low enough that leaf wetness may persist");
  }

  const boundedScore = Math.max(0, Math.min(100, Math.round(score)));
  const level = getRiskLevel(boundedScore);
  const ruleLabel = matchedDisease || "general leaf disease";
  const conditionSummary =
    reasons.length > 0 ? `Factors contributing to risk: ${reasons.join(", ")}.` : "Current weather does not strongly match the configured risk factors.";

  return {
    level,
    score: boundedScore,
    explanation: `Environmental risk estimate only for ${ruleLabel}. ${conditionSummary} This is not a validated disease forecast and does not modify the image model prediction.`,
  };
};

module.exports = {
  analyzeDiseaseRisk,
};
