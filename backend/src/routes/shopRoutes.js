const express = require("express");
const { nearbyShops } = require("../controllers/shopController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/nearby", protect, nearbyShops);

module.exports = router;
