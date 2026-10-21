const express = require("express");

const { predict, getHistory, getDiseaseMap, downloadReport, sendReport, downloadDeliveryReport, consultExpert } = require("../controllers/predictionController");

const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post("/predict", protect, upload.single("image"), predict);

router.get("/history", protect, getHistory);
router.get("/map", protect, getDiseaseMap);

router.get("/delivery/:deliveryKey.pdf", downloadDeliveryReport);
router.get("/:id/report", protect, downloadReport);
router.post("/:id/send-report", protect, sendReport);
router.post("/:id/consult-expert", protect, consultExpert);

module.exports = router;
