import { useState, useEffect, useCallback } from 'react'
import {
  getWeatherPushPublicKey,
  getReminderDeviceStatus,
  subscribeReminderDevice,
  unsubscribeReminderDevice,
  sendReminderTest,
} from '../api'
import {
  pushSupported,
  iosNeedsInstall,
  urlBase64ToUint8Array,
  sameKey,
} from '../utils/pushHelpers'

// Notifications for calendar events and alerts that arrive even when
// CampusBuddy is closed. Same idea as the weather alert (useWeatherPush),
// but there is no daily time to pick — the server sends each reminder at
// the moment you set on the event/alert itself.
//
// Both features share the browser's single push subscription, so we only
// really unsubscribe the browser when NEITHER feature is switched on.

const REMINDER_FLAG_KEY = 'campusbuddy_reminder_push_enabled'
const WEATHER_FLAG_KEY = 'campusbuddy_weather_push_enabled'
const SW_URL = `${import.meta.env.BASE_URL}sw.js`

export default function useReminderPush(currentUser) {
  const userId = currentUser?.id || currentUser?.user_id

  const [supported] = useState(pushSupported)
  const [needsInstall] = useState(iosNeedsInstall)
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null) // { type: 'success' | 'error', text }

  // On load: is this browser already registered for alerts?
  useEffect(() => {
    if (!supported || !userId) {
      setEnabled(false)
      return undefined
    }
    let cancelled = false

    ;(async () => {
      try {
        const registration = await navigator.serviceWorker.register(SW_URL)
        await navigator.serviceWorker.ready
        const existing = await registration.pushManager.getSubscription()
        if (!existing) {
          localStorage.setItem(REMINDER_FLAG_KEY, 'false')
          if (!cancelled) setEnabled(false)
          return
        }
        const res = await getReminderDeviceStatus(userId, existing.endpoint)
        if (cancelled) return
        const isOn = Boolean(res.data?.registered)
        localStorage.setItem(REMINDER_FLAG_KEY, String(isOn))
        setEnabled(isOn)
      } catch {
        // Offline or server down — leave things as they were
      }
    })()

    return () => {
      cancelled = true
    }
  }, [supported, userId])

  const enable = useCallback(async () => {
    if (!supported || !userId) return false
    setBusy(true)
    setMessage(null)
    try {
      // Ask for permission FIRST, straight from the click, or some browsers refuse
      let result = Notification.permission
      if (result === 'default') result = await Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') {
        setMessage({
          type: 'error',
          text: 'Notifications are blocked for this site. Allow them in your browser settings, then try again.',
        })
        return false
      }

      const registration = await navigator.serviceWorker.register(SW_URL)
      await navigator.serviceWorker.ready

      const keyRes = await getWeatherPushPublicKey() // one server key serves every push feature
      const serverKey = urlBase64ToUint8Array(keyRes.data.public_key)

      let browserSub = await registration.pushManager.getSubscription()
      if (browserSub && !sameKey(browserSub.options?.applicationServerKey, serverKey)) {
        await browserSub.unsubscribe()
        browserSub = null
      }
      if (!browserSub) {
        browserSub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: serverKey,
        })
      }

      await subscribeReminderDevice(userId, browserSub.toJSON())
      localStorage.setItem(REMINDER_FLAG_KEY, 'true')
      setEnabled(true)
      setMessage({ type: 'success', text: 'Done — alerts will reach this device even when CampusBuddy is closed.' })
      return true
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Could not turn on alerts' })
      return false
    } finally {
      setBusy(false)
    }
  }, [supported, userId])

  const disable = useCallback(async () => {
    if (!supported || !userId) return
    setBusy(true)
    setMessage(null)
    try {
      const registration = await navigator.serviceWorker.ready
      const browserSub = await registration.pushManager.getSubscription()
      if (browserSub) {
        await unsubscribeReminderDevice(userId, browserSub.endpoint)
        // Weather alerts use the same browser subscription — leave it alone if they're on
        if (localStorage.getItem(WEATHER_FLAG_KEY) !== 'true') await browserSub.unsubscribe()
      }
      localStorage.setItem(REMINDER_FLAG_KEY, 'false')
      setEnabled(false)
      setMessage({ type: 'success', text: 'Alerts turned off for this device.' })
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Could not turn off alerts' })
    } finally {
      setBusy(false)
    }
  }, [supported, userId])

  const sendTest = useCallback(async () => {
    if (!supported || !userId) return
    setBusy(true)
    setMessage(null)
    try {
      const registration = await navigator.serviceWorker.ready
      const browserSub = await registration.pushManager.getSubscription()
      if (!browserSub) throw new Error('This device is not set up yet — please turn alerts on first')
      await sendReminderTest(userId, browserSub.endpoint)
      setMessage({ type: 'success', text: 'Test sent — it should pop up in a moment.' })
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Could not send a test alert' })
    } finally {
      setBusy(false)
    }
  }, [supported, userId])

  return {
    supported,
    needsInstall,
    loggedIn: Boolean(userId),
    permission,
    enabled,
    busy,
    message,
    enable,
    disable,
    sendTest,
  }
}
