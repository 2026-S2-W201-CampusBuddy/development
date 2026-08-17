import { useEffect, useState } from 'react'

function WeatherNotification() {
  const [weather, setWeather] = useState(null)
  const [permission, setPermission] = useState(Notification.permission)

  useEffect(() => {
    // Ask for notification permission if not already decided
    if (Notification.permission === 'default') {
      Notification.requestPermission().then((result) => {
        setPermission(result)
      })
    }
  }, [])

  useEffect(() => {
    fetch('http://127.0.0.1:5000/api/weather/auckland')
      .then((response) => response.json())
      .then((json) => {
        if (json.status === 'success') {
          setWeather(json.data)
          maybeShowNotification(json.data)
        }
      })
      .catch((error) => {
        console.error('Error fetching weather:', error)
      })
  }, [])

  function maybeShowNotification(data) {
    const today = new Date().toDateString()
    const lastShown = localStorage.getItem('weatherNotificationDate')

    // Only show once per day
    if (lastShown === today) {
      return
    }

    if (Notification.permission === 'granted') {
      new Notification('CampusBuddy — Today\'s Auckland Weather', {
        body: `${data.condition}, ${data.today_min}°–${data.today_max}°C. ${data.clothing_tip}.`,
        icon: '/favicon.svg'
      })
      localStorage.setItem('weatherNotificationDate', today)
    }
  }

  if (!weather) {
    return <p>Loading today's weather...</p>
  }

  return (
    <div className="weather-card">
      <h3>Today's Auckland Weather</h3>
      <p>{weather.condition} — {weather.today_min}°C to {weather.today_max}°C</p>
      <p>Chance of rain: {weather.rain_chance}%</p>
      <p><strong>{weather.clothing_tip}</strong></p>
      {permission === 'denied' && (
        <p style={{ fontSize: '0.85em', color: 'gray' }}>
          Enable notifications in your browser to get a daily alert.
        </p>
      )}
    </div>
  )
}

export default WeatherNotification