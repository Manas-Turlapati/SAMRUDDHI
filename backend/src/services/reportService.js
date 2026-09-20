const PDFDocument = require("pdfkit");

const asPercent = (confidence) => {
  const numeric = Number(confidence);
  if (Number.isNaN(numeric)) return "Not available";
  return `${Math.round((numeric <= 1 ? numeric * 100 : numeric) * 10) / 10}%`;
};

const getConfidenceValue = (confidence) => {
  const numeric = Number(confidence);
  if (Number.isNaN(numeric)) return 0;
  return numeric <= 1 ? numeric * 100 : numeric;
};

const getSeverity = (confidence) => {
  const value = getConfidenceValue(confidence);

  if (value < 60) {
    return {
      label: "Low confidence",
      action: "Retake the image with better lighting before taking field action.",
    };
  }

  if (value < 80) {
    return {
      label: "Moderate risk",
      action: "Monitor the crop closely and follow the recommendation if symptoms match.",
    };
  }

  return {
    label: "High risk",
    action: "Take field action soon and follow the recommended treatment schedule.",
  };
};

const formatDate = (value) => {
  if (!value) return "Date unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const addKeyValue = (doc, label, value) => {
  doc.fillColor("#667568").font("Helvetica-Bold").fontSize(9).text(label.toUpperCase());
  doc.moveDown(0.2);
  doc.fillColor("#17231c").font("Helvetica").fontSize(12).text(value || "Not available");
  doc.moveDown(0.8);
};

const addSectionTitle = (doc, title) => {
  doc.moveDown(0.6);
  doc.fillColor("#183b25").font("Helvetica-Bold").fontSize(16).text(title);
  doc.moveDown(0.6);
};

const createPredictionReport = ({ prediction, user }) => {
  const doc = new PDFDocument({
    margin: 48,
    size: "A4",
    info: {
      Title: "SAMRUDDHI Farmer Advisory Report",
      Author: "SAMRUDDHI",
      Subject: "Crop disease prediction and fertilizer advisory",
    },
  });

  const severity = getSeverity(prediction.confidence);
  const recommendation = prediction.recommendation || {};
  const preventiveSteps = [
    "Remove severely infected leaves and avoid leaving diseased plant material in the field.",
    "Avoid overhead watering and keep enough spacing for airflow.",
    "Inspect nearby plants for similar symptoms before applying treatment.",
    "Use the recommended dosage and frequency instead of over-applying fertilizer.",
  ];

  doc.rect(0, 0, doc.page.width, 96).fill("#183b25");
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(24).text("SAMRUDDHI", 48, 30);
  doc.font("Helvetica").fontSize(11).text("Farmer Advisory Report", 48, 60);

  doc.y = 124;
  doc.fillColor("#17231c").font("Helvetica-Bold").fontSize(20).text(prediction.disease || "Disease unavailable");
  doc.moveDown(0.2);
  doc.fillColor("#667568").font("Helvetica").fontSize(11).text(`Generated on ${formatDate(new Date())}`);

  addSectionTitle(doc, "Farmer Details");
  addKeyValue(doc, "Name", user?.name);
  addKeyValue(doc, "Email", user?.email);

  addSectionTitle(doc, "Prediction Summary");
  addKeyValue(doc, "Image", prediction.imageName);
  addKeyValue(doc, "Prediction Date", formatDate(prediction.createdAt));
  addKeyValue(doc, "Disease", prediction.disease);
  addKeyValue(doc, "Confidence", asPercent(prediction.confidence));
  addKeyValue(doc, "Severity", severity.label);
  addKeyValue(doc, "Immediate Action", severity.action);

  addSectionTitle(doc, "Fertilizer Recommendation");
  addKeyValue(doc, "Fertilizer", recommendation.fertilizer);
  addKeyValue(doc, "Dosage", recommendation.dosage);
  addKeyValue(doc, "Application Method", recommendation.application_method);
  addKeyValue(doc, "Frequency", recommendation.frequency);

  addSectionTitle(doc, "Preventive Steps");
  doc.fillColor("#17231c").font("Helvetica").fontSize(11);
  preventiveSteps.forEach((step, index) => {
    doc.text(`${index + 1}. ${step}`, {
      indent: 12,
      paragraphGap: 6,
    });
  });

  doc.moveDown(1);
  doc.fillColor("#667568").fontSize(9).text(
    "Note: This report is decision-support guidance. Confirm severe cases with a local agriculture expert.",
    {
      align: "left",
    },
  );

  return doc;
};

module.exports = {
  createPredictionReport,
  getSeverity,
};
