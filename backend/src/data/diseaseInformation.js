const diseaseTypeProfiles = {
  Healthy: {
    description: "No visible disease pattern was detected by the image model.",
    symptoms: ["No major disease symptoms detected in the uploaded image."],
    causes: ["Healthy result from the model output; continue regular crop monitoring."],
    treatment: ["No disease treatment is recommended from this scan."],
    prevention: [
      "Continue balanced watering, field sanitation, and routine scouting.",
      "Use soil-test based nutrition rather than applying extra fertilizer by default.",
    ],
  },
  Fungal: {
    description: "A fungal-type leaf disease pattern was detected. Confirm field symptoms before treatment.",
    symptoms: [
      "Leaf spots, blight patches, mildew, rust pustules, or progressive yellowing may be visible depending on the disease.",
    ],
    causes: [
      "Fungal diseases are often favored by humid conditions, poor airflow, overhead watering, or infected crop residue.",
    ],
    treatment: [
      "Remove severely infected leaves where practical.",
      "Use a locally recommended fungicide only after confirming symptoms and label suitability for the crop.",
    ],
    prevention: [
      "Improve plant spacing and airflow.",
      "Avoid overhead irrigation where possible.",
      "Rotate crops and remove infected residues after harvest.",
    ],
  },
  Bacterial: {
    description: "A bacterial-type leaf disease pattern was detected. Laboratory or expert confirmation is useful for severe cases.",
    symptoms: [
      "Water-soaked spots, angular lesions, yellow halos, or dark leaf spots may appear depending on the disease.",
    ],
    causes: [
      "Bacterial diseases commonly spread through splashing water, contaminated tools, infected seed, or crop debris.",
    ],
    treatment: [
      "Remove infected plant material where practical.",
      "Avoid working in the crop when foliage is wet.",
      "Use locally approved bactericide options only when advised for the crop and disease.",
    ],
    prevention: [
      "Use clean seed or planting material.",
      "Sanitize tools and avoid overhead watering.",
      "Rotate crops and remove infected debris.",
    ],
  },
  Viral: {
    description: "A viral-type disease pattern was detected. Viral diseases are usually managed by prevention and vector control.",
    symptoms: ["Mosaic patterns, curling, distortion, yellowing, or stunted growth may be seen."],
    causes: ["Viruses are often spread by insect vectors, infected planting material, or mechanical transmission."],
    treatment: [
      "There is no curative fertilizer treatment for viral disease.",
      "Remove badly affected plants if recommended locally to reduce spread.",
      "Manage insect vectors using integrated pest management.",
    ],
    prevention: [
      "Use disease-free planting material.",
      "Control vector insects early.",
      "Remove weed hosts and infected plant debris.",
    ],
  },
  Pest: {
    description: "An insect or mite damage pattern was detected. Confirm pest presence before applying pesticide.",
    symptoms: ["Feeding marks, stippling, webbing, mines, or distorted leaves may be present."],
    causes: ["Damage can be caused by insects or mites feeding on leaves or transmitting disease."],
    treatment: [
      "Inspect leaf undersides and nearby plants for pests.",
      "Use integrated pest management and locally recommended pesticide options only when pest pressure justifies it.",
    ],
    prevention: [
      "Monitor crops regularly.",
      "Encourage beneficial insects where possible.",
      "Remove heavily infested leaves or plants when practical.",
    ],
  },
  Nutritional: {
    description: "The detected class can resemble nutrient or physiological stress. Confirm with soil or tissue testing.",
    symptoms: ["Yellowing, marginal scorch, or uneven leaf color may be visible."],
    causes: ["Possible nutrient imbalance, soil pH issues, water stress, or environmental stress."],
    treatment: [
      "Use soil-test results before correcting nutrients.",
      "Check irrigation and drainage before applying fertilizer.",
    ],
    prevention: [
      "Test soil periodically.",
      "Maintain crop-appropriate pH and organic matter.",
      "Apply nutrients in split doses where locally recommended.",
    ],
  },
  Unknown: {
    description: "The model returned a disease class that is not yet fully mapped in the backend dataset.",
    symptoms: ["Review the uploaded image and field symptoms before taking action."],
    causes: ["Cause depends on the predicted class and local field conditions."],
    treatment: ["Consult a local agriculture expert for confirmation if symptoms are severe or spreading."],
    prevention: ["Use good sanitation, crop rotation, balanced nutrition, and regular scouting."],
  },
};

const diseaseTypeByName = [
  { pattern: /healthy/i, type: "Healthy" },
  { pattern: /bacterial/i, type: "Bacterial" },
  { pattern: /virus|viral|mosaic|curl/i, type: "Viral" },
  { pattern: /mite|spider|leaf\s*miner|insect/i, type: "Pest" },
  { pattern: /nutrient|chlorosis|deficiency/i, type: "Nutritional" },
  { pattern: /blight|mold|mildew|rust|scab|rot|spot|septoria|anthracnose|cercospora|alternaria/i, type: "Fungal" },
];

module.exports = {
  diseaseTypeProfiles,
  diseaseTypeByName,
};
