import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Vivid Red Marker Pin for Nearby Shops
const redShopIcon = L.divIcon({
  className: "custom-red-shop-marker",
  html: `
    <div style="position: relative; width: 34px; height: 44px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.4)); cursor: pointer;">
      <svg viewBox="0 0 384 512" width="34" height="44" fill="#dc2626" xmlns="http://www.w3.org/2000/svg">
        <path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0z"/>
        <circle cx="192" cy="192" r="85" fill="#ffffff"/>
        <circle cx="192" cy="192" r="50" fill="#dc2626"/>
      </svg>
    </div>
  `,
  iconSize: [34, 44],
  iconAnchor: [17, 44],
  popupAnchor: [0, -42],
});

// Distinct Blue Pulse Marker for Farmer's Location
const userLocationIcon = L.divIcon({
  className: "custom-user-marker",
  html: `
    <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35));">
      <div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background: rgba(37, 99, 235, 0.28); border: 2px solid #3b82f6;"></div>
      <div style="width: 20px; height: 20px; border-radius: 50%; background: #2563eb; border: 3px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -20],
});

// Helper component to auto-pan and fit bounds so all markers are visible
function MapAutoBounds({ userCoords, shops, selectedShop }) {
  const map = useMap();

  useEffect(() => {
    if (selectedShop && Number.isFinite(selectedShop.latitude) && Number.isFinite(selectedShop.longitude)) {
      map.flyTo([selectedShop.latitude, selectedShop.longitude], 15, { duration: 1 });
      return;
    }

    const points = [];
    if (userCoords?.latitude && userCoords?.longitude) {
      points.push([userCoords.latitude, userCoords.longitude]);
    }
    shops.forEach((s) => {
      if (Number.isFinite(s.latitude) && Number.isFinite(s.longitude)) {
        points.push([s.latitude, s.longitude]);
      }
    });

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [map, userCoords, shops, selectedShop]);

  return null;
}

export default function NearbyShops({
  shops = [],
  loading = false,
  error = "",
  onFindShops,
  fertilizer = "",
  searched = false,
  radiusKm = 10,
  radiusExpanded = false,
  detectedLocation = null,
  googleMapsSearchUrl = "",
  userCoords = null,
}) {
  const [selectedShop, setSelectedShop] = useState(null);
  const [showMap, setShowMap] = useState(true);
  const markerRefs = useRef({});

  // Fallback map center if coordinates not yet available
  const defaultCenter = userCoords?.latitude && userCoords?.longitude
    ? [userCoords.latitude, userCoords.longitude]
    : shops.length > 0 && shops[0].latitude && shops[0].longitude
    ? [shops[0].latitude, shops[0].longitude]
    : [17.385, 78.4867];

  const handleSelectShop = (shop) => {
    setSelectedShop(shop);
    setShowMap(true);
    const marker = markerRefs.current[shop.id];
    if (marker) {
      setTimeout(() => marker.openPopup(), 400);
    }
  };

  return (
    <section className="nearby-shops notranslate" translate="no">
      <div className="section-heading">
        <span className="eyebrow">Fertilizer Access & Live Maps</span>
        <h2>Nearby Fertilizer Shops & Agro Centers</h2>
        <p>
          Find real local sellers, Rythu Bharosa Kendras (RBK), PACS cooperative societies, and agro dealers stocking{" "}
          <strong>{fertilizer || "recommended fertilizers"}</strong> near your farm.
        </p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", marginTop: "1rem" }}>
        <button type="button" className="primary-button" onClick={onFindShops} disabled={loading}>
          {loading ? "Locating shops & mapping coordinates..." : "🧭 Use GPS & Find Nearby Shops"}
        </button>

        {googleMapsSearchUrl && (
          <a
            href={googleMapsSearchUrl}
            target="_blank"
            rel="noreferrer"
            className="secondary-button"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "#ffffff",
              borderColor: "#10b981",
              color: "#065f46",
              fontWeight: 700,
            }}
          >
            🗺️ Open Live in Google Maps App
          </a>
        )}

        {searched && shops.length > 0 && (
          <button
            type="button"
            className="secondary-button"
            onClick={() => setShowMap(!showMap)}
            style={{ fontSize: "0.85rem", padding: "0.55rem 0.9rem" }}
          >
            {showMap ? "Hide Map" : "Show Map"}
          </button>
        )}
      </div>

      {detectedLocation?.displayName && (
        <div
          style={{
            marginTop: "0.85rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.45rem 0.85rem",
            background: "rgba(16, 185, 129, 0.12)",
            border: "1px solid rgba(16, 185, 129, 0.35)",
            borderRadius: "2rem",
            color: "#065f46",
            fontSize: "0.88rem",
            fontWeight: 700,
          }}
        >
          <span>📍</span>
          <span>
            Real Map Data Near: <strong>{detectedLocation.displayName}</strong>
          </span>
        </div>
      )}

      {fertilizer && (
        <p className="shop-query" style={{ marginTop: "0.6rem" }}>
          Target Fertilizer: <span style={{ color: "var(--green-900)" }}>{fertilizer}</span>
        </p>
      )}

      {searched && radiusExpanded && (
        <p className="shop-query">
          Search radius expanded to {radiusKm} km to show verified regional distribution points.
        </p>
      )}

      {error && <div className="error-message shop-message">{error}</div>}

      {/* Interactive Leaflet Map with RED SHOP MARKERS */}
      {searched && showMap && shops.length > 0 && (
        <div
          style={{
            marginTop: "1.2rem",
            background: "#ffffff",
            borderRadius: "1rem",
            border: "1px solid rgba(221, 228, 216, 0.9)",
            padding: "0.75rem",
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.6rem",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.2rem" }}>🗺️</span>
              <div>
                <strong style={{ color: "var(--green-900)", fontSize: "0.95rem" }}>
                  Nearby Shops Map ({shops.length} Locations)
                </strong>
                <div style={{ display: "flex", gap: "1rem", marginTop: "0.2rem", fontSize: "0.78rem" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#dc2626", fontWeight: 700 }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#dc2626", display: "inline-block" }}></span>
                    Red Pins: Nearby Fertilizer Shops
                  </span>
                  {userCoords && (
                    <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#2563eb", fontWeight: 700 }}>
                      <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb", display: "inline-block" }}></span>
                      Blue Pin: Your Farm Location
                    </span>
                  )}
                </div>
              </div>
            </div>

            {googleMapsSearchUrl && (
              <a
                href={googleMapsSearchUrl}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: "0.82rem", color: "#059669", fontWeight: 700, textDecoration: "underline" }}
              >
                Open in Google Maps App ↗
              </a>
            )}
          </div>

          <MapContainer
            center={defaultCenter}
            zoom={13}
            scrollWheelZoom={false}
            style={{ width: "100%", height: "380px", borderRadius: "0.75rem", zIndex: 0 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapAutoBounds userCoords={userCoords} shops={shops} selectedShop={selectedShop} />

            {/* Farmer's Current Location Pin (Blue) */}
            {userCoords?.latitude && userCoords?.longitude && (
              <Marker position={[userCoords.latitude, userCoords.longitude]} icon={userLocationIcon}>
                <Popup>
                  <div style={{ padding: "4px" }}>
                    <strong style={{ color: "#2563eb", display: "block", marginBottom: "2px" }}>
                      🏡 Your Farm Location
                    </strong>
                    <span style={{ fontSize: "0.82rem", color: "#4b5563" }}>
                      GPS: {userCoords.latitude.toFixed(4)}, {userCoords.longitude.toFixed(4)}
                    </span>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Red Markers for Each Nearby Shop */}
            {shops.map((shop) => (
              <Marker
                key={shop.id}
                position={[shop.latitude, shop.longitude]}
                icon={redShopIcon}
                ref={(ref) => {
                  if (ref) markerRefs.current[shop.id] = ref;
                }}
              >
                <Popup className="shop-popup">
                  <div style={{ minWidth: "210px", padding: "4px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 800,
                          color: "#dc2626",
                          background: "#fee2e2",
                          padding: "2px 6px",
                          borderRadius: "10px",
                        }}
                      >
                        📍 {shop.distanceKm} km away
                      </span>
                      {shop.rating && (
                        <span style={{ fontSize: "0.75rem", color: "#d97706", fontWeight: 700 }}>
                          ⭐ {shop.rating}
                        </span>
                      )}
                    </div>

                    <strong style={{ display: "block", color: "var(--green-900)", fontSize: "0.95rem", lineHeight: 1.25, marginBottom: "4px" }}>
                      {shop.name}
                    </strong>

                    <p style={{ margin: "0 0 8px", fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.3 }}>
                      {shop.address}
                    </p>

                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
                      <a
                        href={shop.directionsUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          flex: 1,
                          padding: "6px 8px",
                          background: "#16a34a",
                          color: "#ffffff",
                          borderRadius: "6px",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          textAlign: "center",
                          textDecoration: "none",
                        }}
                      >
                        🧭 Directions
                      </a>
                      {shop.phone && !shop.phone.includes("via Google") && (
                        <a
                          href={`tel:${shop.phone.replace(/[^0-9+]/g, "")}`}
                          style={{
                            padding: "6px 8px",
                            background: "#f3f4f6",
                            color: "#1f2937",
                            borderRadius: "6px",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            textAlign: "center",
                            textDecoration: "none",
                          }}
                        >
                          📞 Call
                        </a>
                      )}
                      {shop.orderLink && (
                        <a
                          href={shop.orderLink}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding: "6px 8px",
                            background: "#25d366",
                            color: "#ffffff",
                            borderRadius: "6px",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            textAlign: "center",
                            textDecoration: "none",
                          }}
                        >
                          💬 WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "var(--muted)", textAlign: "center" }}>
            👆 Tap any red pin on the map to see shop details, contact numbers, and turn-by-turn directions.
          </p>
        </div>
      )}

      {searched && !loading && !error && shops.length === 0 && (
        <div className="empty-state shop-empty">
          <h2>No listed shops found</h2>
          <p>We could not locate agro stores in the immediate vicinity. Try expanding your search or opening Google Maps directly.</p>
          {googleMapsSearchUrl && (
            <a
              href={googleMapsSearchUrl}
              target="_blank"
              rel="noreferrer"
              className="primary-button"
              style={{ marginTop: "0.75rem", display: "inline-block" }}
            >
              Search Directly on Google Maps
            </a>
          )}
        </div>
      )}

      {shops.length > 0 && (
        <div className="shop-grid" style={{ marginTop: "1.2rem" }}>
          {shops.map((shop) => (
            <article
              className={`shop-card ${selectedShop?.id === shop.id ? "shop-card-selected" : ""}`}
              key={shop.id}
              style={{
                border: selectedShop?.id === shop.id ? "2px solid #dc2626" : undefined,
                transition: "all 0.2s ease",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.4rem" }}>
                  <span className="eyebrow" style={{ color: "#dc2626", fontWeight: 800 }}>
                    🔴 {shop.distanceKm} km away
                  </span>
                  {shop.badge && (
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        background: "rgba(16, 185, 129, 0.15)",
                        color: "#065f46",
                        padding: "0.2rem 0.55rem",
                        borderRadius: "1rem",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                      }}
                    >
                      {shop.badge}
                    </span>
                  )}
                </div>

                <h3>{shop.name}</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "0.2rem 0 0.5rem" }}>
                  📍 {shop.address}
                </p>

                {shop.rating && (
                  <div style={{ fontSize: "0.82rem", color: "#d97706", fontWeight: 700, margin: "0.2rem 0 0.4rem" }}>
                    ⭐ {shop.rating} ({shop.userRatingsTotal || 10}+ reviews)
                  </div>
                )}
              </div>

              <dl>
                <div>
                  <dt>Phone / Helpline</dt>
                  <dd style={{ fontSize: "0.9rem" }}>{shop.phone}</dd>
                </div>
                <div>
                  <dt>Stocked Fertilizers</dt>
                  <dd style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                    {Array.isArray(shop.fertilizersAvailable)
                      ? shop.fertilizersAvailable.slice(0, 3).join(", ") + (shop.fertilizersAvailable.length > 3 ? "..." : "")
                      : shop.hasRecommendedFertilizer
                      ? "In Stock"
                      : "Inquire with Store"}
                  </dd>
                </div>
                <div>
                  <dt>Delivery</dt>
                  <dd>{shop.deliveryAvailable ? "Available to farm" : "Store pickup only"}</dd>
                </div>
              </dl>

              <div className="shop-actions" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => handleSelectShop(shop)}
                  style={{
                    padding: "0.55rem 0.6rem",
                    textAlign: "center",
                    borderColor: "#dc2626",
                    color: "#dc2626",
                    fontWeight: 700,
                  }}
                >
                  📍 Pin on Map
                </button>
                {shop.phone && !shop.phone.includes("via Google") && (
                  <a className="secondary-button" href={`tel:${shop.phone.replace(/[^0-9+]/g, "")}`} style={{ padding: "0.55rem 0.6rem", textAlign: "center" }}>
                    📞 Call
                  </a>
                )}
                {shop.orderLink && (
                  <a className="secondary-button" href={shop.orderLink} target="_blank" rel="noreferrer" style={{ padding: "0.55rem 0.6rem", textAlign: "center" }}>
                    💬 WhatsApp
                  </a>
                )}
                <a className="secondary-button" href={shop.directionsUrl} target="_blank" rel="noreferrer" style={{ padding: "0.55rem 0.6rem", textAlign: "center" }}>
                  🧭 Directions
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
