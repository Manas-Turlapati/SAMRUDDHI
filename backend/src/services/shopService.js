const shops = [
  {
    id: "hyd-sri-agro",
    name: "Sri Agro Fertilizers",
    phone: "+919876543210",
    address: "Kothapet Main Road, Hyderabad, Telangana",
    latitude: 17.3686,
    longitude: 78.5422,
    fertilizersAvailable: ["NPK 10-10-10", "Urea", "DAP", "Potash"],
    deliveryAvailable: true,
    orderLink: "https://wa.me/919876543210",
  },
  {
    id: "hyd-rythu-seva",
    name: "Rythu Seva Agro Center",
    phone: "+919121212121",
    address: "Nagole X Road, Hyderabad, Telangana",
    latitude: 17.3713,
    longitude: 78.5698,
    fertilizersAvailable: ["NPK 10-10-10", "Micronutrient Mix", "Neem Cake"],
    deliveryAvailable: true,
    orderLink: "https://wa.me/919121212121",
  },
  {
    id: "hyd-green-grow",
    name: "Green Grow Farm Inputs",
    phone: "+918989898989",
    address: "LB Nagar, Hyderabad, Telangana",
    latitude: 17.3457,
    longitude: 78.5522,
    fertilizersAvailable: ["NPK 10-10-10", "Organic Compost", "Potash"],
    deliveryAvailable: false,
    orderLink: "",
  },
  {
    id: "vja-kisan-mart",
    name: "Kisan Agro Mart",
    phone: "+919494949494",
    address: "Benz Circle, Vijayawada, Andhra Pradesh",
    latitude: 16.5062,
    longitude: 80.648,
    fertilizersAvailable: ["NPK 10-10-10", "DAP", "Zinc Sulphate"],
    deliveryAvailable: true,
    orderLink: "https://wa.me/919494949494",
  },
  {
    id: "blr-farm-care",
    name: "Farm Care Fertilizers",
    phone: "+918080808080",
    address: "Yelahanka, Bengaluru, Karnataka",
    latitude: 13.1007,
    longitude: 77.5963,
    fertilizersAvailable: ["NPK 10-10-10", "Urea", "Bio Fertilizer"],
    deliveryAvailable: true,
    orderLink: "https://wa.me/918080808080",
  },
  {
    id: "chn-agri-needs",
    name: "Agri Needs Store",
    phone: "+917777777777",
    address: "Tambaram, Chennai, Tamil Nadu",
    latitude: 12.9249,
    longitude: 80.1,
    fertilizersAvailable: ["NPK 10-10-10", "Organic Compost", "DAP"],
    deliveryAvailable: true,
    orderLink: "https://wa.me/917777777777",
  },
];

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const getDistanceKm = (from, to) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const normalize = (value) => String(value || "").trim().toLowerCase();

const getNearbyShops = ({ latitude, longitude, fertilizer, limit = 5, radiusKm = 10 }) => {
  const farmerLocation = {
    latitude: Number(latitude),
    longitude: Number(longitude),
  };

  if (!Number.isFinite(farmerLocation.latitude) || !Number.isFinite(farmerLocation.longitude)) {
    const error = new Error("Valid latitude and longitude are required");
    error.statusCode = 400;
    throw error;
  }

  const requestedFertilizer = normalize(fertilizer);

  const requestedRadiusKm = Number(radiusKm) || 10;
  const resultLimit = Number(limit) || 5;
  const minimumVisibleShops = Math.min(3, resultLimit, shops.length);

  const rankedShops = shops
    .map((shop) => {
      const distanceKm = getDistanceKm(farmerLocation, shop);
      const hasRecommendedFertilizer = shop.fertilizersAvailable.some((item) =>
        normalize(item).includes(requestedFertilizer),
      );

      return {
        ...shop,
        distanceKm: Math.round(distanceKm * 10) / 10,
        hasRecommendedFertilizer: requestedFertilizer ? hasRecommendedFertilizer : true,
        directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`,
      };
    })
    .sort((first, second) => {
      if (first.hasRecommendedFertilizer !== second.hasRecommendedFertilizer) {
        return first.hasRecommendedFertilizer ? -1 : 1;
      }

      return first.distanceKm - second.distanceKm;
    });

  const shopsInsideRequestedRadius = rankedShops.filter((shop) => shop.distanceKm <= requestedRadiusKm);
  const effectiveRadiusKm =
    shopsInsideRequestedRadius.length >= minimumVisibleShops
      ? requestedRadiusKm
      : rankedShops[minimumVisibleShops - 1]?.distanceKm || requestedRadiusKm;
  const roundedEffectiveRadiusKm = Math.ceil(effectiveRadiusKm * 10) / 10;

  return {
    requestedRadiusKm,
    radiusKm: roundedEffectiveRadiusKm,
    radiusExpanded: roundedEffectiveRadiusKm > requestedRadiusKm,
    shops: rankedShops.filter((shop) => shop.distanceKm <= roundedEffectiveRadiusKm).slice(0, resultLimit),
  };
};

module.exports = {
  getNearbyShops,
};
