const asyncHandler = require("express-async-handler");
const { getNearbyShops } = require("../services/shopService");

const nearbyShops = asyncHandler(async (req, res) => {
  const { latitude, longitude, fertilizer, limit, radiusKm } = req.query;

  const result = getNearbyShops({
    latitude,
    longitude,
    fertilizer,
    limit,
    radiusKm,
  });

  res.json({
    success: true,
    fertilizer: fertilizer || "",
    requestedRadiusKm: result.requestedRadiusKm,
    radiusKm: result.radiusKm,
    radiusExpanded: result.radiusExpanded,
    shops: result.shops,
  });
});

module.exports = {
  nearbyShops,
};
