import './WeatherModal.css'

// This component no longer calls useWeather() itself — it receives
// everything as props from MainPage instead, so the app fetches
// weather data once and shares it, rather than fetching it twice
// (once for the orb, once for this modal).
export default function WeatherModal({
  isOpen,
  onClose,
  weather,
  loading,
  error,
  permission,
  notifyEnabled,
  enableNotifications,
  disableNotifications,
  refresh,
}) {
  if (!isOpen) return null

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modalDialog weatherDialog" onClick={(e) => e.stopPropagation()}>
        <button className="modalCloseBtn" onClick={onClose}>✕</button>

        <div className="modalHeader">
          <h2 className="modalHeading">Auckland Weather</h2>
          <p className="modalCaption">Today's forecast, so you know what to wear</p>
        </div>

        {loading && <p className="weatherStatusText">Fetching the latest forecast...</p>}

        {!loading && error && (
          <div className="weatherErrorBlock">
            <p className="weatherStatusText">{error}</p>
            <button className="btnGlass" onClick={refresh}>Try again</button>
          </div>
        )}

        {!loading && !error && weather && (
          <>
            <div className="weatherHero">
              <span className="weatherHeroIcon">{weather.icon}</span>
              <div className="weatherHeroTemp">{Math.round(weather.current_temp)}°C</div>
              <div className="weatherHeroCondition">{weather.condition}</div>
            </div>

            <div className="weatherStatGrid">
              <div className="weatherStatCard">
                <span className="weatherStatLabel">High / Low</span>
                <span className="weatherStatValue">
                  {Math.round(weather.today_max)}° / {Math.round(weather.today_min)}°
                </span>
              </div>
              <div className="weatherStatCard">
                <span className="weatherStatLabel">Rain chance</span>
                <span className="weatherStatValue">{weather.rain_chance}%</span>
              </div>
              <div className="weatherStatCard">
                <span className="weatherStatLabel">Wind</span>
                <span className="weatherStatValue">{Math.round(weather.wind_speed)} km/h</span>
              </div>
            </div>

            <div className="weatherTipBanner">
              <span className="weatherTipIcon">👕</span>
              <span>{weather.clothing_tip}</span>
            </div>

            <div className="weatherNotifyRow">
              {permission === 'unsupported' ? (
                <p className="weatherStatusText">
                  Notifications aren't supported in this browser.
                </p>
              ) : permission === 'denied' ? (
                <p className="weatherStatusText">
                  Notifications are blocked. Enable them in your browser settings to get weather alerts.
                </p>
              ) : notifyEnabled ? (
                <button className="btnGlass btnFullWidth" onClick={disableNotifications}>
                  🔔 Weather alerts on — tap to turn off
                </button>
              ) : (
                <button className="btnGlass btnPrimary btnFullWidth" onClick={enableNotifications}>
                  🔕 Enable Weather Alerts
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
