const PDFDocument = require("pdfkit");

const safePdfText = (value) => String(value ?? "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^\x20-\xFF\n\r\t]/g, "?");

const formatPrescription = (value) => {
  let prescription = value;
  if (typeof prescription === "string") {
    try { prescription = JSON.parse(prescription); } catch { return prescription || "No prescription supplied."; }
  }
  if (!prescription || typeof prescription !== "object" || Array.isArray(prescription)) {
    return String(prescription || "No prescription supplied.");
  }
  const fields = [
    ["Chemical name", prescription.chemicalName],
    ["Active ingredient", prescription.activeIngredient],
    ["Dosage per liter", prescription.dosagePerLiter],
    ["Application interval", prescription.applicationInterval],
  ].filter(([, fieldValue]) => String(fieldValue || "").trim());
  return fields.length
    ? fields.map(([label, fieldValue]) => `${label}: ${fieldValue}`).join("\n")
    : "No prescription supplied.";
};

/** Create an expert-certified review PDF stream. */
const createCertifiedReport = ({ diagnosis, review, farmer, expert }) => {
  const doc = new PDFDocument({ margin: 48, size: "A4", info: { Title: "Certified Agronomist Report", Author: safePdfText(expert?.name || "SAMRUDDHI Review") } });
  const prediction = diagnosis.modelPrediction || {};
  const expertDiagnosis = review.expertDiagnosis || {};
  doc.rect(0, 0, doc.page.width, 88).fill("#183b25");
  doc.fillColor("#fff").font("Helvetica-Bold").fontSize(22).text("CERTIFIED AGRONOMIST REPORT", 48, 30);
  doc.y = 112;
  doc.fillColor("#17231c").font("Helvetica-Bold").fontSize(17).text("Diagnosis review");
  doc.moveDown(0.7);
  const rows = [
    ["Farmer", farmer?.name || "Farmer"],
    ["AI prediction", prediction.predictedClass || "Unknown"],
    ["AI confidence", `${Math.round(Number(prediction.confidence || 0) * 1000) / 10}%`],
    ["Expert-confirmed disease", expertDiagnosis.confirmedDisease || "Not provided"],
    ["Severity", expertDiagnosis.severityScore ? `${expertDiagnosis.severityScore} / 5` : "Not provided"],
    ["Review result", review.status],
    ["Reviewer", expert?.name || "Authorized reviewer"],
    ["Reviewed", review.reviewedAt ? new Date(review.reviewedAt).toLocaleString("en-IN") : "Not available"],
  ];
  rows.forEach(([label, value]) => {
    doc.fillColor("#667568").font("Helvetica-Bold").fontSize(9).text(label.toUpperCase());
    doc.fillColor("#17231c").font("Helvetica").fontSize(12).text(safePdfText(value));
    doc.moveDown(0.65);
  });
  doc.moveDown(0.5).fillColor("#183b25").font("Helvetica-Bold").fontSize(13).text("Prescription");
  doc.moveDown(0.4).fillColor("#17231c").font("Helvetica").fontSize(11).text(safePdfText(formatPrescription(expertDiagnosis.customPrescription)), { lineGap: 3 });
  doc.moveDown(1.5).fillColor("#667568").font("Helvetica").fontSize(9).text("This report records a human review. Confirm product selection and application rates against local regulations and product labels.");
  return doc;
};

module.exports = { createCertifiedReport };
