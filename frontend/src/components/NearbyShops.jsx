export default function NearbyShops({
  shops = [],
  loading = false,
  error = "",
  onFindShops,
  fertilizer = "",
  searched = false,
}) {
  return (
    <section className="nearby-shops notranslate" translate="no">
      <div className="section-heading">
        <span className="eyebrow">Fertilizer access</span>
        <h2>Nearby shops</h2>
        <p>Find sellers that stock the recommended fertilizer and contact them directly.</p>
      </div>

      <button type="button" className="primary-button" onClick={onFindShops} disabled={loading}>
        {loading ? "Finding shops..." : "Use Location & Find Shops"}
      </button>

      {fertilizer && <p className="shop-query">Recommended fertilizer: {fertilizer}</p>}
      {error && <div className="error-message shop-message">{error}</div>}

      {searched && !loading && !error && shops.length === 0 && (
        <div className="empty-state shop-empty">
          <h2>No nearby shops within 10 km</h2>
          <p>No listed seller is close enough right now. Try from the field location or add local shop details.</p>
        </div>
      )}

      {shops.length > 0 && (
        <div className="shop-grid">
          {shops.map((shop) => (
            <article className="shop-card" key={shop.id}>
              <div>
                <span className="eyebrow">{shop.distanceKm} km away</span>
                <h3>{shop.name}</h3>
                <p>{shop.address}</p>
              </div>

              <dl>
                <div>
                  <dt>Phone</dt>
                  <dd>{shop.phone}</dd>
                </div>
                <div>
                  <dt>Recommended fertilizer</dt>
                  <dd>{shop.hasRecommendedFertilizer ? "Available" : "Ask shop"}</dd>
                </div>
                <div>
                  <dt>Delivery</dt>
                  <dd>{shop.deliveryAvailable ? "Available" : "Pickup only"}</dd>
                </div>
              </dl>

              <div className="shop-actions">
                <a className="secondary-button" href={`tel:${shop.phone}`}>
                  Call
                </a>
                {shop.orderLink && (
                  <a className="secondary-button" href={shop.orderLink} target="_blank" rel="noreferrer">
                    Order
                  </a>
                )}
                <a className="secondary-button" href={shop.directionsUrl} target="_blank" rel="noreferrer">
                  Directions
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
