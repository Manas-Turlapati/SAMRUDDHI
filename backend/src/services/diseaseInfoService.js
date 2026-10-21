const { diseaseTypeProfiles, diseaseTypeByName } = require("../data/diseaseInformation");

const titleCase = (value) =>
  value
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const parseDiseaseClass = (diseaseClass = "") => {
  const [rawCrop, ...rawDiseaseParts] = String(diseaseClass).split("___");
  const rawDisease = rawDiseaseParts.join("___") || diseaseClass;

  return {
    crop: titleCase(rawCrop || "Unknown"),
    diseaseName: titleCase(rawDisease || "Unknown"),
  };
};

const getDiseaseType = (diseaseName) => {
  const match = diseaseTypeByName.find(({ pattern }) => pattern.test(diseaseName));
  return match?.type || "Unknown";
};

const getDiseaseInformation = (diseaseClass) => {
  const { crop, diseaseName } = parseDiseaseClass(diseaseClass);
  const type = getDiseaseType(diseaseName);
  const profile = diseaseTypeProfiles[type] || diseaseTypeProfiles.Unknown;

  return {
    crop,
    disease_name: diseaseName,
    type,
    description: `${crop} - ${diseaseName}: ${profile.description}`,
    symptoms: profile.symptoms,
    causes: profile.causes,
    treatment: profile.treatment,
    actionableTreatment: getActionableTreatment(type, crop, diseaseName),
    prevention: profile.prevention,
  };
};

function getActionableTreatment(type, crop, diseaseName) {
  const actions = {
    Healthy: ["No treatment is indicated by this scan. Continue routine scouting."],
    Fungal: ["Remove badly affected leaves and dispose of them away from the field.", "Improve spacing and avoid wetting foliage when watering.", "Ask a local agriculture officer to confirm the disease and choose a crop-approved fungicide. Follow that product's label exactly; dose varies by product and crop."],
    Bacterial: ["Remove affected leaves with clean tools and disinfect tools between plants.", "Avoid handling plants while wet.", "Get local expert confirmation before using any bactericide; many products do not cure established infections."],
    Viral: ["There is no curative spray for most plant viruses.", "Check for insect vectors and use locally recommended integrated pest management.", "Ask an agriculture officer whether affected plants should be removed."],
    Pest: ["Inspect leaf undersides and identify the pest before treatment.", "Remove small infestations by hand where practical and protect beneficial insects.", "Use only a crop and pest approved product at its label rate."],
    Nutritional: ["Check irrigation, drainage, and soil pH.", "Use a soil test before applying nutrients; this image alone cannot determine a safe fertilizer dose."],
    Unknown: ["Retake a clear image and compare field symptoms.", "Ask a local agriculture officer to confirm before applying any pesticide."],
  };
  return {
    actions: actions[type] || actions.Unknown,
    productSearchUrl: type === "Healthy" ? null : `https://www.google.com/search?q=${encodeURIComponent(`${crop} ${diseaseName} approved treatment`)}`,
    labelNotice: "Product approvals and doses vary by crop, location, and formulation. Follow the registered product label and local expert advice.",
  };
}

module.exports = {
  getDiseaseInformation,
  parseDiseaseClass,
};
