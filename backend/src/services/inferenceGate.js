const crypto = require("crypto");
const Diagnosis = require("../models/Diagnosis");
const ExpertReview = require("../models/ExpertReview");
const ReviewMagicToken = require("../models/ReviewMagicToken");
const { notifyExperts } = require("./notifier");
const jiraService = require("./jiraService");

/** @param {Record<string, number>|Map<string, number>} probabilities */
const calculateShannonEntropy = (probabilities) => {
  const entries = probabilities instanceof Map ? [...probabilities.entries()] : Object.entries(probabilities || {});
  const positive = entries.map(([, value]) => Number(value)).filter((value) => Number.isFinite(value) && value > 0);
  const total = positive.reduce((sum, value) => sum + value, 0);
  if (!total) return 0;
  return positive.reduce((sum, value) => {
    const probability = value / total;
    return sum - probability * Math.log2(probability);
  }, 0);
};

/** @param {{confidence:number, probabilities?:Record<string,number>|Map<string,number>, farmerRequested?:boolean}} predictionData */
const evaluateInferenceGate = (predictionData) => {
  const confidence = Number(predictionData.confidence);
  const entropy = calculateShannonEntropy(predictionData.probabilities);
  const lowConfidence = confidence < 0.7;
  const highEntropy = entropy > 1.2;
  const flaggedForReview = Boolean(predictionData.farmerRequested || lowConfidence || highEntropy);
  const flagReason = predictionData.farmerRequested
    ? "FARMER_REQUESTED"
    : lowConfidence
      ? "LOW_CONFIDENCE"
      : highEntropy
        ? "HIGH_ENTROPY"
        : "NONE";
  return { entropy, flaggedForReview, flagReason };
};

const createExpertReview = async (diagnosis, { reason = diagnosis.flagReason } = {}) => {
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const review = await ExpertReview.create({
    diagnosisId: diagnosis._id,
    farmerId: diagnosis.farmerId,
    magicToken: tokenHash,
    magicTokenExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
  });
  await ReviewMagicToken.create({ reviewId: review.reviewId, tokenHash, expiresAt: review.magicTokenExpiresAt });
  const frontendUrl = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
  const backendUrl = (process.env.BACKEND_URL || process.env.PUBLIC_API_URL || "").replace(/\/$/, "").replace(/\/api$/, "");
  const magicUrl = frontendUrl ? `${frontendUrl}/review/magic?token=${encodeURIComponent(rawToken)}` : null;
  const imageUrl = diagnosis.rawImageUrl?.startsWith("http")
    ? diagnosis.rawImageUrl
    : backendUrl && diagnosis.rawImageUrl
      ? `${backendUrl}/api${diagnosis.rawImageUrl}?reviewToken=${encodeURIComponent(rawToken)}`
      : diagnosis.rawImageUrl;
  setImmediate(() => {
    notifyExperts({
      event: "diagnosis.flagged_for_review",
      diagnosisId: diagnosis._id.toString(),
      reviewId: review.reviewId,
      imageUrl,
      predictedDisease: diagnosis.modelPrediction.predictedClass,
      confidence: diagnosis.modelPrediction.confidence,
      entropy: diagnosis.modelPrediction.entropy,
      flagReason: reason,
      magicUrl,
    }).catch((error) => console.error("Expert review notification failed:", error.message));

    jiraService.createExpertReviewTicket({
      diagnosisId: diagnosis._id.toString(),
      reviewId: review.reviewId,
      imageUrl,
      predictedDisease: diagnosis.modelPrediction.predictedClass,
      confidence: diagnosis.modelPrediction.confidence,
      entropy: diagnosis.modelPrediction.entropy,
      flagReason: reason,
      magicUrl,
    }).catch((error) => console.error("Jira expert review ticket creation failed:", error.message));
  });
  return review;
};

/** Creates the diagnosis and, when needed, a one-time expert review link. */
const createGatedDiagnosis = async ({ farmerId, predictionId, prediction, image, imageMimeType, rawImageUrl, gradCamUrl }) => {
  const gate = evaluateInferenceGate(prediction);
  const diagnosis = new Diagnosis({
    farmerId,
    predictionId,
    rawImageUrl: "",
    rawImage: image,
    gradCamImage: prediction.gradcamBase64 ? Buffer.from(prediction.gradcamBase64, "base64") : undefined,
    imageMimeType,
    modelPrediction: {
      predictedClass: prediction.disease,
      confidence: Number(prediction.confidence),
      probabilities: prediction.probabilities || {},
      entropy: gate.entropy,
    },
    flaggedForReview: gate.flaggedForReview,
    flagReason: gate.flagReason,
    reviewStatus: gate.flaggedForReview ? "PENDING_EXPERT_REVIEW" : "AUTOMATED_REVIEW",
  });
  diagnosis.rawImageUrl = image
    ? `/diagnoses/${diagnosis._id}/image`
    : rawImageUrl;
  if (prediction.gradcamBase64) diagnosis.gradCamUrl = `/diagnoses/${diagnosis._id}/image?variant=gradcam`;
  else if (gradCamUrl) diagnosis.gradCamUrl = gradCamUrl;
  await diagnosis.save();

  const review = gate.flaggedForReview ? await createExpertReview(diagnosis) : null;

  return { diagnosis, review, ...gate };
};

module.exports = { calculateShannonEntropy, evaluateInferenceGate, createExpertReview, createGatedDiagnosis };
