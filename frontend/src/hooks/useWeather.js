import { useState, useEffect, useCallback } from 'react'
import { getAucklandWeather } from '../api'

const NOTIFY_DATE_KEY = 'campusbuddy_weather_notified_on'
const NOTIFY_OPT_IN_KEY = 'campusbuddy_weather_notify_enabled'

// Turns today's date into a simple string like "2026-08-18",
// so we can tell whether we've already notified the user today
function todayKey() {
  return new Date().toDateString()
}

export default function useWeather() {
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )
  const [notifyEnabled, setNotifyEnabled] = useState(
    localStorage.getItem(NOTIFY_OPT_IN_KEY) === 'true'
  )

  // Fires a real browser notification with today's forecast + clothing tip,
  // but only once per calendar day so it behaves like a genuine morning alert
  const fireDailyNotificationIfDue = useCallback((data) => {
    if (typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted') return
    if (localStorage.getItem(NOTIFY_OPT_IN_KEY) !== 'true') return

    const alreadyNotifiedToday = localStorage.getItem(NOTIFY_DATE_KEY) === todayKey()
    if (alreadyNotifiedToday) return

    const notification = new Notification('CampusBuddy — Your Auckland Morning', {
      body: `${data.icon} ${data.condition}, ${data.today_min}°–${data.today_max}°C. ${data.clothing_tip}.`,
      icon: '/favicon.svg',
      tag: 'campusbuddy-weather', // replaces any previous weather notification instead of stacking
    })

    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    localStorage.setItem(NOTIFY_DATE_KEY, todayKey())
  }, [])

  const fetchWeather = useCallback(() => {
    setLoading(true)
    setError('')
    getAucklandWeather()
      .then((json) => {
        setWeather(json.data)
        fireDailyNotificationIfDue(json.data)
      })
      .catch((err) => {
        setError(err.message || 'Could not load weather right now')
      })
      .finally(() => setLoading(false))
  }, [fireDailyNotificationIfDue])

  useEffect(() => {
    fetchWeather()

    // Auckland's weather doesn't change fast enough to justify anything
    // more frequent — hourly keeps it fresh without hammering the API
    const HOUR_IN_MS = 60 * 60 * 1000
    const intervalId = setInterval(fetchWeather, HOUR_IN_MS)

    return () => clearInterval(intervalId)
  }, [fetchWeather])

  // Called when the user explicitly opts in (e.g. clicks "Enable Morning Alerts").
  // Requesting permission from a real click, rather than automatically on page
  // load, is both better UX and more reliable across browsers.
  const enableNotifications = useCallback(async () => {
    if (typeof Notification === 'undefined') return

    let result = Notification.permission
    if (result === 'default') {
      result = await Notification.requestPermission()
    }

    setPermission(result)

    if (result === 'granted') {
      localStorage.setItem(NOTIFY_OPT_IN_KEY, 'true')
      setNotifyEnabled(true)
      if (weather) fireDailyNotificationIfDue(weather)
    }
  }, [weather, fireDailyNotificationIfDue])

  const disableNotifications = useCallback(() => {
    localStorage.setItem(NOTIFY_OPT_IN_KEY, 'false')
    setNotifyEnabled(false)
  }, [])

  return {
    weather,
    loading,
    error,
    permission,
    notifyEnabled,
    enableNotifications,
    disableNotifications,
    refresh: fetchWeather,
  }
}
