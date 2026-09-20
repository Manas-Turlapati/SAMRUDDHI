const asyncHandler = require("express-async-handler");
const { getNearbyShops } = require("../services/shopService");

const nearbyShops = asyncHandler(async (req, res) => {
  const { latitude, longitude, fertilizer, limit, radiusKm } = req.query;

  const shops = getNearbyShops({
    latitude,
    longitude,
    fertilizer,
    limit,
    radiusKm,
  });

  res.json({
    success: true,
    fertilizer: fertilizer || "",
    radiusKm: Number(radiusKm) || 10,
    shops,
  });
});

module.exports = {
  nearbyShops,
};
