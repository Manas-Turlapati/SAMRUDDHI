import React from "react";

export default function WeatherRiskPanel({
  onAnalyze,
  loading = false,
  error = "",
  weatherRisk,
  disabled = false,
}) {
  const smartSpray = weatherRisk?.smartSpray;
  const weather = weatherRisk?.weather;
  const location = weatherRisk?.location;

  const getStatusTheme = (status) => {
    switch (status) {
      case "optimal":
        return {
          bg: "rgba(16, 185, 129, 0.12)",
          border: "rgba(16, 185, 129, 0.4)",
          text: "#065f46",
          badgeBg: "#10b981",
          icon: "🟢",
        };
      case "caution":
        return {
          bg: "rgba(245, 158, 11, 0.14)",
          border: "rgba(245, 158, 11, 0.45)",
          text: "#92400e",
          badgeBg: "#f59e0b",
          icon: "🟡",
        };
      case "poor":
      default:
        return {
          bg: "rgba(239, 68, 68, 0.12)",
          border: "rgba(239, 68, 68, 0.4)",
          text: "#991b1b",
          badgeBg: "#ef4444",
          icon: "🔴",
        };
    }
  };

  const theme = getStatusTheme(smartSpray?.status);

  return (
    <section className="weather-risk-panel notranslate" translate="no">
      <div className="section-heading">
        <span className="eyebrow">Smart Spray & Live Weather</span>
        <h2>Farm Weather & Spray Window Advisor</h2>
        <p>Real-time meteorological forecast for your farm to prevent spray wash-off, drift loss, and foliage scorch.</p>
      </div>

      <form className="weather-risk-form" onSubmit={onAnalyze}>
        <button type="submit" className="secondary-button" disabled={disabled || loading} style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
          <span>🧭</span>
          <span>{loading ? "Checking live weather & spray window..." : "Check Farm Weather & Spray Window"}</span>
        </button>
      </form>

      {error && <div className="error-message weather-risk-message">{error}</div>}

      {weatherRisk && (
        <div className="weather-risk-result" style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.5rem" }}>
          {location && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", fontSize: "0.85rem", color: "var(--muted)" }}>
              <span>
                📍 Weather Station: <strong>{[location.name, location.region, location.country].filter(Boolean).join(", ")}</strong>
              </span>
              {location.localtime && (
                <span>Local Time: {location.localtime.split(" ")[1] || location.localtime}</span>
              )}
            </div>
          )}

          {/* Smart Spray Hero Card */}
          {smartSpray && (
            <div
              style={{
                background: theme.bg,
                border: `2px solid ${theme.border}`,
                borderRadius: "1rem",
                padding: "1.1rem 1.25rem",
                boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.8rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1.3rem" }}>{theme.icon}</span>
                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: theme.text, fontWeight: 800 }}>
                      Spray Suitability Index
                    </span>
                    <strong style={{ fontSize: "1.2rem", color: theme.text }}>
                      {smartSpray.badge}
                    </strong>
                  </div>
                </div>

                <div
                  style={{
                    background: "#ffffff",
                    border: `1px solid ${theme.border}`,
                    borderRadius: "2rem",
                    padding: "0.35rem 0.85rem",
                    fontSize: "0.84rem",
                    fontWeight: 700,
                    color: "var(--green-900)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <span>🕒</span>
                  <span><strong>Best Window:</strong> {smartSpray.bestWindow}</span>
                </div>
              </div>

              <p style={{ margin: "0.4rem 0 0", fontSize: "0.92rem", color: theme.text, lineHeight: 1.45, fontWeight: 600 }}>
                {smartSpray.summary}
              </p>
            </div>
          )}

          {/* 4 Live Environmental Metric Cards */}
          <div className="weather-values" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem" }}>
            <article style={{ background: "#ffffff", padding: "0.85rem", borderRadius: "0.8rem", border: "1px solid var(--line)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.25rem" }}>
                🌡️ Temperature
              </span>
              <strong style={{ fontSize: "1.15rem", color: "var(--green-900)", display: "block" }}>
                {weather?.temperature ?? "N/A"}°C
              </strong>
              <small style={{ fontSize: "0.74rem", color: "var(--muted)", display: "block", marginTop: "0.2rem", lineHeight: 1.25 }}>
                {smartSpray?.temperature?.assessment || weather?.condition || "Optimal range"}
              </small>
            </article>

            <article style={{ background: "#ffffff", padding: "0.85rem", borderRadius: "0.8rem", border: "1px solid var(--line)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.25rem" }}>
                💨 Wind & Drift
              </span>
              <strong style={{ fontSize: "1.15rem", color: "var(--green-900)", display: "block" }}>
                {weather?.wind_speed ?? "N/A"} km/h
              </strong>
              <small style={{ fontSize: "0.74rem", color: "var(--muted)", display: "block", marginTop: "0.2rem", lineHeight: 1.25 }}>
                {smartSpray?.wind?.assessment || "Gentle airflow"}
              </small>
            </article>

            <article style={{ background: "#ffffff", padding: "0.85rem", borderRadius: "0.8rem", border: "1px solid var(--line)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.25rem" }}>
                🌧️ Rain Threat
              </span>
              <strong style={{ fontSize: "1.15rem", color: smartSpray?.rainThreat?.isThreat ? "#dc2626" : "var(--green-900)", display: "block" }}>
                {smartSpray?.rainThreat?.chance ?? 0}% rain
              </strong>
              <small style={{ fontSize: "0.74rem", color: "var(--muted)", display: "block", marginTop: "0.2rem", lineHeight: 1.25 }}>
                {smartSpray?.rainThreat?.assessment || "Rain-safe window"}
              </small>
            </article>

            <article style={{ background: "#ffffff", padding: "0.85rem", borderRadius: "0.8rem", border: "1px solid var(--line)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.25rem" }}>
                💧 Humidity & Drying
              </span>
              <strong style={{ fontSize: "1.15rem", color: "var(--green-900)", display: "block" }}>
                {weather?.humidity ?? "N/A"}%
              </strong>
              <small style={{ fontSize: "0.74rem", color: "var(--muted)", display: "block", marginTop: "0.2rem", lineHeight: 1.25 }}>
                {smartSpray?.humidity?.leafDrying || "Normal drying speed"}
              </small>
            </article>
          </div>

          {/* Hourly Spray Suitability Strip (Next 10 Hours) */}
          {smartSpray?.hourlyForecast && smartSpray.hourlyForecast.length > 0 && (
            <div style={{ background: "rgba(255, 255, 255, 0.7)", border: "1px solid var(--line)", borderRadius: "0.85rem", padding: "0.85rem 1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--green-900)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  ⏰ Upcoming Hourly Spray Forecast
                </span>
                <span style={{ fontSize: "0.76rem", color: "var(--muted)" }}>
                  🟢 Safe • 🟡 Caution • 🔴 Avoid
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridAutoFlow: "column",
                  gridAutoColumns: "minmax(82px, 1fr)",
                  gap: "0.55rem",
                  overflowX: "auto",
                  paddingBottom: "0.35rem",
                }}
              >
                {smartSpray.hourlyForecast.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      background: "#ffffff",
                      border: `1px solid ${h.suitability === "optimal" ? "#bbf7d0" : h.suitability === "caution" ? "#fde68a" : "#fecaca"}`,
                      borderRadius: "0.65rem",
                      padding: "0.5rem 0.4rem",
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ink)" }}>{h.time}</span>
                    {h.icon ? (
                      <img src={h.icon} alt={h.condition} style={{ width: "26px", height: "26px" }} />
                    ) : (
                      <span style={{ fontSize: "1rem" }}>⛅</span>
                    )}
                    <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--green-900)" }}>{h.temp_c}°</span>
                    <span style={{ fontSize: "0.72rem", color: h.chance_of_rain > 30 ? "#dc2626" : "var(--muted)" }}>
                      {h.chance_of_rain}% 🌧️
                    </span>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 800,
                        color: h.color,
                        background: `${h.color}15`,
                        padding: "2px 5px",
                        borderRadius: "8px",
                      }}
                    >
                      {h.suitabilityLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3-Day Upcoming Days Spray Outlook */}
          {smartSpray?.dailyForecast && smartSpray.dailyForecast.length > 0 && (
            <div style={{ background: "rgba(255, 255, 255, 0.8)", border: "1px solid var(--line)", borderRadius: "0.85rem", padding: "0.85rem 1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--green-900)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  📅 3-Day Agronomic Spray Outlook
                </span>
                <span style={{ fontSize: "0.76rem", color: "var(--muted)" }}>
                  Daily Spray Suitability
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem" }}>
                {smartSpray.dailyForecast.map((d, i) => (
                  <div
                    key={i}
                    style={{
                      background: "#ffffff",
                      border: `1.5px solid ${d.color}35`,
                      borderTop: `3px solid ${d.color}`,
                      borderRadius: "0.75rem",
                      padding: "0.75rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.35rem",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <strong style={{ fontSize: "0.95rem", color: "var(--green-900)" }}>{d.dayLabel}</strong>
                      <small style={{ fontSize: "0.74rem", color: "var(--muted)" }}>{d.formattedDate}</small>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", margin: "0.2rem 0" }}>
                      {d.icon ? (
                        <img src={d.icon} alt={d.condition} style={{ width: "28px", height: "28px" }} />
                      ) : (
                        <span>🌤️</span>
                      )}
                      <span style={{ fontSize: "0.78rem", color: "var(--foreground)", fontWeight: 600 }}>
                        {d.condition}
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#334155" }}>
                      <span>🌡️ <strong>{d.maxTemp}°</strong> / {d.minTemp}°C</span>
                      <span style={{ color: d.rainChance >= 30 ? "#dc2626" : "inherit" }}>
                        🌧️ <strong>{d.rainChance}%</strong>
                      </span>
                    </div>

                    <div style={{ fontSize: "0.74rem", color: "var(--muted)" }}>
                      💨 Wind up to {d.maxWind} km/h
                    </div>

                    <div
                      style={{
                        marginTop: "0.25rem",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "0.4rem",
                        background: `${d.color}15`,
                        color: d.color,
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        textAlign: "center",
                      }}
                    >
                      {d.badge}: {d.suitabilityLabel}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disease Environmental Risk Factor */}
          {weatherRisk.disease_risk && (
            <div style={{ background: "rgba(255, 255, 255, 0.65)", border: "1px solid var(--line)", borderRadius: "0.85rem", padding: "0.85rem 1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--green-900)" }}>
                  🦠 Microclimate Pathogen Threat
                </span>
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    padding: "0.2rem 0.6rem",
                    borderRadius: "1rem",
                    background: weatherRisk.disease_risk.level === "High" ? "#fee2e2" : weatherRisk.disease_risk.level === "Medium" ? "#fef3c7" : "#dcfce7",
                    color: weatherRisk.disease_risk.level === "High" ? "#dc2626" : weatherRisk.disease_risk.level === "Medium" ? "#b45309" : "#15803d",
                  }}
                >
                  {weatherRisk.disease_risk.level} Risk ({weatherRisk.disease_risk.score}/100)
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--muted)", lineHeight: 1.4 }}>
                {weatherRisk.disease_risk.explanation}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
