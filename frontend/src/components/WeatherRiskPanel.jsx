export default function WeatherRiskPanel({
  onAnalyze,
  loading = false,
  error = "",
  weatherRisk,
  disabled = false,
}) {
  return (
    <section className="weather-risk-panel">
      <div className="section-heading">
        <span className="eyebrow">Weather risk</span>
        <h2>Environmental disease risk</h2>
        <p>Uses your current location weather to estimate whether conditions may favor the detected disease.</p>
      </div>

      <form className="weather-risk-form" onSubmit={onAnalyze}>
        <button type="submit" className="secondary-button" disabled={disabled || loading}>
          {loading ? "Checking current location..." : "Check Current Location Risk"}
        </button>
      </form>

      {error && <div className="error-message weather-risk-message">{error}</div>}

      {weatherRisk && (
        <div className="weather-risk-result">
          {weatherRisk.location && (
            <p className="weather-location-summary">
              Weather location: {[weatherRisk.location.name, weatherRisk.location.region, weatherRisk.location.country]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}

          <div className="weather-values">
            <article>
              <span>Temperature</span>
              <strong>{weatherRisk.weather?.temperature ?? "N/A"} C</strong>
            </article>
            <article>
              <span>Humidity</span>
              <strong>{weatherRisk.weather?.humidity ?? "N/A"}%</strong>
            </article>
            <article>
              <span>Rainfall</span>
              <strong>{weatherRisk.weather?.rainfall ?? "N/A"} mm</strong>
            </article>
            <article>
              <span>Wind</span>
              <strong>{weatherRisk.weather?.wind_speed ?? "N/A"} kph</strong>
            </article>
          </div>

          <div className={`risk-summary risk-${String(weatherRisk.disease_risk?.level || "").toLowerCase()}`}>
            <span>Disease Risk</span>
            <strong>{weatherRisk.disease_risk?.level || "Unavailable"}</strong>
            <small>{weatherRisk.disease_risk?.score ?? "N/A"}/100</small>
          </div>

          <p className="risk-explanation">{weatherRisk.disease_risk?.explanation}</p>
        </div>
      )}
    </section>
  );
}
