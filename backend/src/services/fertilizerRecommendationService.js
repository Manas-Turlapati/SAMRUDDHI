const cropBaseRecommendations = {
  tomato: {
    fertilizer: "Balanced NPK fertilizer with well-decomposed compost",
    npk: "Balanced NPK; adjust final ratio by soil test",
  },
  potato: {
    fertilizer: "Balanced NPK fertilizer with potassium support if soil test shows low K",
    npk: "Balanced NPK; potassium should be soil-test guided",
  },
  corn: {
    fertilizer: "Balanced NPK fertilizer with nitrogen split application",
    npk: "Balanced NPK; nitrogen should be split by growth stage",
  },
  maize: {
    fertilizer: "Balanced NPK fertilizer with nitrogen split application",
    npk: "Balanced NPK; nitrogen should be split by growth stage",
  },
  grape: {
    fertilizer: "Balanced NPK fertilizer with compost or organic matter support",
    npk: "Balanced NPK; avoid excess nitrogen during active disease",
  },
  apple: {
    fertilizer: "Balanced orchard fertilizer with organic matter support",
    npk: "Soil-test based orchard NPK",
  },
};

const getNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const getProvidedSoilNotes = ({ nitrogen, phosphorus, potassium, ph }) => {
  const notes = [];

  if (nitrogen !== null) notes.push(`N=${nitrogen}`);
  if (phosphorus !== null) notes.push(`P=${phosphorus}`);
  if (potassium !== null) notes.push(`K=${potassium}`);
  if (ph !== null) notes.push(`pH=${ph}`);

  return notes;
};

const getDeficitNotes = ({ nitrogen, phosphorus, potassium, ph }) => {
  const notes = [];

  if (nitrogen !== null && nitrogen < 50) notes.push("nitrogen appears low");
  if (phosphorus !== null && phosphorus < 25) notes.push("phosphorus appears low");
  if (potassium !== null && potassium < 80) notes.push("potassium appears low");
  if (ph !== null && (ph < 5.5 || ph > 7.5)) notes.push("soil pH is outside the common comfort range for many crops");

  return notes;
};

const recommendFertilizer = ({ crop, disease, nitrogen, phosphorus, potassium, ph, growthStage }) => {
  const cropKey = String(crop || "").toLowerCase();
  const diseaseText = String(disease || "").toLowerCase();
  const base = cropBaseRecommendations[cropKey] || {
    fertilizer: "Balanced NPK fertilizer with organic compost",
    npk: "Soil-test based balanced NPK",
  };

  const soilValues = {
    nitrogen: getNumber(nitrogen),
    phosphorus: getNumber(phosphorus),
    potassium: getNumber(potassium),
    ph: getNumber(ph),
  };
  const soilNotes = getProvidedSoilNotes(soilValues);
  const deficitNotes = getDeficitNotes(soilValues);
  const hasSoilData = soilNotes.length > 0;
  const isHealthy = diseaseText.includes("healthy");
  const diseaseCaution = isHealthy
    ? "No disease-specific fertilizer change is needed from this scan."
    : "Fertilizer does not cure leaf disease; use it only to support crop recovery and avoid over-application.";

  return {
    fertilizer: base.fertilizer,
    npk: deficitNotes.length > 0 ? `${base.npk}; prioritize correction where ${deficitNotes.join(", ")}` : base.npk,
    dosage: hasSoilData
      ? "Use soil-test guided local extension or product-label dosage; do not exceed recommended rates."
      : "General recommendation only because soil-test values were not provided; follow local extension or product-label dosage.",
    application_method: "Apply to soil/root zone as recommended for the crop; avoid direct contact with diseased foliage.",
    frequency: growthStage
      ? `Plan applications around the ${growthStage} stage and local crop schedule.`
      : "Use the normal crop schedule; split applications only where locally recommended.",
    reason: hasSoilData
      ? `${diseaseCaution} Soil inputs used: ${soilNotes.join(", ")}.`
      : `${diseaseCaution} No soil-test inputs were provided, so this is a general crop/disease-based recommendation, not an ML fertilizer prediction.`,
  };
};

module.exports = {
  recommendFertilizer,
};
