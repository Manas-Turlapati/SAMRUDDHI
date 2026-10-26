const titleCase = (value) =>
  String(value || "")
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const parseDiseaseCategory = (disease = "") => {
  const text = String(disease).toLowerCase();
  if (text.includes("healthy")) return "Healthy";
  if (/bacterial|canker|wilt/i.test(text)) return "Bacterial";
  if (/virus|viral|mosaic|curl|streak/i.test(text)) return "Viral";
  if (/blight|phytophthora|alternaria/i.test(text)) return "Blight";
  if (/mildew|powdery|downy/i.test(text)) return "Mildew";
  if (/rust|spot|septoria|scab|anthracnose|cercospora|rot|mold/i.test(text)) return "FungalSpot";
  if (/mite|spider|insect|pest/i.test(text)) return "Pest";
  return "General";
};

const agronomicProtocols = {
  Blight: {
    fertilizer: "Potassium Nitrate (13-0-45) & Calcium Nitrate with Boron",
    npk: "NPK 13-0-45 or 0-0-50 (High Potassium, Low Nitrogen)",
    dosage: "Foliar Spray: 5 grams/liter of water (Potassium Nitrate 13-0-45); Drip Fertigation: Calcium Nitrate @ 5 kg/acre + Boron 20% @ 1 kg/acre",
    application_method: "Fine mist foliar spray on both leaf undersides and upper canopy in the cool early morning (6:30–9:30 AM); root zone drenching with bio-compost.",
    frequency: "First dose within 48 hours of fungicide application; repeat potassium foliar spray every 8–10 days until new green leaves emerge.",
    reason: "Potassium (K) thickens the epidermal cell wall and triggers phytoalexin production, preventing fungal hyphae penetration. Calcium strengthens cell pectins against enzymatic degradation.",
    precaution: "⚠️ WITHHOLD high-nitrogen urea during active blight. Excess vegetative nitrogen creates tender, succulent tissues that accelerate Phytophthora and Alternaria spore multiplication.",
  },
  Mildew: {
    fertilizer: "Monopotassium Phosphate (MKP 0-52-34) + Wettable Sulfur 80% WDG",
    npk: "NPK 0-52-34 (Zero Nitrogen, High Phosphorus & Potassium)",
    dosage: "Foliar Spray: 4–5 grams/liter of water (MKP 0-52-34) + Wettable Sulfur @ 2.5 g/L; Drip: SOP (0-0-50) @ 4 kg/acre",
    application_method: "Thorough foliar wash ensuring complete leaf coverage, particularly lower canopy and inner shaded branches.",
    frequency: "Apply 2 sprays spaced 7–8 days apart during dry, moderate weather.",
    reason: "Phosphorus (52%) stimulates Systemic Acquired Resistance (SAR) enzymes in crop tissue, while Potassium (34%) suppresses fungal haustoria formation. Zero nitrogen prevents vegetative shading.",
    precaution: "Do not apply sulfur sprays if temperatures exceed 32°C (90°F) to avoid leaf scorching.",
  },
  Bacterial: {
    fertilizer: "Potassium Silicate + Calcium Chloride (0.25%) with Bio-consortium",
    npk: "NPK 5-15-45 with Soluble Silicate & Micronutrients",
    dosage: "Foliar Spray: Potassium Silicate @ 2 ml/liter + Calcium Nitrate @ 4 g/L; Soil Drenching: Bacillus subtilis or Pseudomonas fluorescens @ 5 ml/L",
    application_method: "Targeted root zone drenching and early morning foliar spray. Disinfect spray nozzles before application.",
    frequency: "Drench root zone immediately; repeat foliar silicate spray after 10 days.",
    reason: "Silica polymerizes within the leaf apoplast, creating a tough mechanical barrier against bacterial entry through stomata and hydathodes.",
    precaution: "Avoid spraying during cloudy, humid, or rainy days. Never work in wet fields as moisture rapidly disperses bacterial ooze.",
  },
  FungalSpot: {
    fertilizer: "Sulfate of Potash (SOP 0-0-50) + Magnesium Sulfate (MgSO4) & Zinc EDTA",
    npk: "NPK 10-26-26 or 0-0-50 + 1% Magnesium Sulfate",
    dosage: "Foliar Spray: SOP (0-0-50) @ 5 grams/liter + Magnesium Sulfate @ 3 grams/liter; Soil: NPK 10-26-26 @ 25 kg/acre",
    application_method: "Foliar spray targeting the middle and lower canopy where spots originate; band application in root feeder zone.",
    frequency: "Every 10–12 days until necrotic lesions dry out and new shoot growth is vigorous.",
    reason: "Magnesium restores chlorophyll synthesis in the yellow halos around fungal lesions, while Potassium prevents premature leaf drop and enhances photosynthetic recovery.",
    precaution: "Wait until morning dew has evaporated before spraying. Do not mix magnesium sulfate with calcium nitrate in the same spray tank.",
  },
  Viral: {
    fertilizer: "Chelated Zinc EDTA (12%) + Liquid Seaweed Extract & Ferrous Sulfate",
    npk: "Chelated Micronutrient formulation with Bio-stimulants (Non-chemical recovery)",
    dosage: "Foliar Spray: Liquid Seaweed Extract @ 2.5 ml/L + Zinc EDTA @ 1 g/L + Boron 20% @ 1 g/L; Soil: Neem cake @ 100 kg/acre",
    application_method: "Fine mist canopy spray every 10 days to support undamaged green tissue.",
    frequency: "3 applications at 10-day intervals.",
    reason: "Viruses cannot be cured chemically, but zinc and seaweed bio-stimulants boost metabolic vigor and root health, helping surviving foliage continue photosynthesis.",
    precaution: "Combine nutrient spray with vector management (yellow sticky traps / neem oil 10,000 ppm) to control whiteflies and aphids.",
  },
  Pest: {
    fertilizer: "Potassium Silicate + Neem-based Bio-stimulant & Micronutrient Booster",
    npk: "Balanced NPK 19-19-19 with Silicate",
    dosage: "Foliar Spray: Potassium Silicate @ 2.5 ml/L + Zinc EDTA @ 1 g/L; Soil: Neem Cake @ 80 kg/acre",
    application_method: "High-pressure foliar spray directed at the undersides of leaves where mites and pests congregate.",
    frequency: "Every 7–10 days until pest population drops below economic threshold.",
    reason: "Silicate increases leaf toughness and trichome density, discouraging mite feeding and piercing-sucking insects.",
    precaution: "Apply in late evening to protect honeybees and beneficial predatory insects.",
  },
  Healthy: {
    fertilizer: "Water Soluble Balanced NPK 19-19-19 + Grade-IV Micronutrients & Vermicompost",
    npk: "Balanced NPK 19-19-19 (Water Soluble)",
    dosage: "Foliar Spray: 4–5 grams/liter of water; Drip / Soil: 3–4 kg/acre per fertigation cycle; Vermicompost @ 2 tonnes/acre",
    application_method: "Uniform foliar spray during morning hours (7:00–10:00 AM); soil application followed by irrigation.",
    frequency: "Every 14–21 days during active vegetative, flowering, and fruiting phases.",
    reason: "Crop is in good health! A balanced 19-19-19 formulation maintains steady vegetative vigor, uniform flowering, and optimal root development.",
    precaution: "Avoid over-fertilizing with nitrogen which creates excessive soft foliage susceptible to fungal spores.",
  },
  General: {
    fertilizer: "NPK 12-32-16 Complex Fertilizer with Secondary Micronutrients (Zn, B, Mg)",
    npk: "NPK 12-32-16 or 10-26-26",
    dosage: "Soil Application: 30–40 kg/acre; Foliar Spray: Multi-micronutrient mixture @ 2.5 g/L",
    application_method: "Broadcasting around root zone with subsequent light irrigation; foliar spray on healthy leaves.",
    frequency: "Apply at key growth intervals (vegetative, pre-flowering, and fruit formation).",
    reason: "Supplies essential primary and secondary nutrients to boost plant resistance and crop yield.",
    precaution: "Base final application rates on local soil health card recommendations.",
  },
};

const getNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const recommendFertilizer = ({ crop, disease, nitrogen, phosphorus, potassium, ph, growthStage }) => {
  const category = parseDiseaseCategory(disease);
  const protocol = agronomicProtocols[category] || agronomicProtocols.General;
  const cropDisplay = titleCase(crop || "Crop");

  const soilValues = {
    nitrogen: getNumber(nitrogen),
    phosphorus: getNumber(phosphorus),
    potassium: getNumber(potassium),
    ph: getNumber(ph),
  };

  const soilDeficitNotes = [];
  if (soilValues.nitrogen !== null && soilValues.nitrogen < 50) soilDeficitNotes.push("Soil Nitrogen (N) is low");
  if (soilValues.phosphorus !== null && soilValues.phosphorus < 25) soilDeficitNotes.push("Soil Phosphorus (P) is low");
  if (soilValues.potassium !== null && soilValues.potassium < 80) soilDeficitNotes.push("Soil Potassium (K) is low");
  if (soilValues.ph !== null && (soilValues.ph < 5.8 || soilValues.ph > 7.5)) soilDeficitNotes.push(`Soil pH (${soilValues.ph}) is outside optimal 6.0–7.2 range`);

  let npkStatement = protocol.npk;
  if (soilDeficitNotes.length > 0) {
    npkStatement += ` (Customized adjustment: ${soilDeficitNotes.join(", ")})`;
  }

  let frequencyStatement = protocol.frequency;
  if (growthStage) {
    frequencyStatement = `During the ${growthStage} stage: ${protocol.frequency}`;
  }

  return {
    crop: cropDisplay,
    category,
    fertilizer: protocol.fertilizer,
    npk: npkStatement,
    dosage: protocol.dosage,
    application_method: protocol.application_method,
    frequency: frequencyStatement,
    reason: protocol.reason,
    precaution: protocol.precaution,
  };
};

module.exports = {
  recommendFertilizer,
  parseDiseaseCategory,
};
