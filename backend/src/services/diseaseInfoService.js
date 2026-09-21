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
    prevention: profile.prevention,
  };
};

module.exports = {
  getDiseaseInformation,
  parseDiseaseClass,
};
