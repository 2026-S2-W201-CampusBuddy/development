import { useState, useEffect, useCallback } from 'react'
import {
  getWeatherPushPublicKey,
  getWeatherPushStatus,
  subscribeWeatherPush,
  updateWeatherPushTime,
  unsubscribeWeatherPush,
  sendWeatherPushTest,
} from '../api'

// Scheduled weather alerts that arrive even when CampusBuddy is closed.
//
// How it works, in plain English:
//  1. We register a tiny "service worker" (public/sw.js) in the browser.
//  2. The browser gives us a private "push address" for this device.
//  3. We send that address + the person's chosen time to the Flask server.
//  4. Every minute the server checks who is due and pushes the forecast to
//     that address — the browser wakes the service worker, which shows the
//     notification. No CampusBuddy tab needs to be open.

const PUSH_FLAG_KEY = 'campusbuddy_weather_push_enabled' // read by useWeather.js to avoid duplicate alerts
const DEFAULT_TIME = '07:30'
const SW_URL = `${import.meta.env.BASE_URL}sw.js`

function pushSupported() {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

// iPhones/iPads only allow push for apps added to the Home Screen
function iosNeedsInstall() {
  if (typeof navigator === 'undefined') return false
  const isIos =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isInstalled =
    window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
  return isIos && !isInstalled
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

function sameKey(existing, wanted) {
  if (!existing) return false
  const a = new Uint8Array(existing)
  if (a.length !== wanted.length) return false
  return a.every((byte, i) => byte === wanted[i])
}

function userTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Pacific/Auckland'
  } catch {
    return 'Pacific/Auckland'
  }
}

export default function useWeatherPush(currentUser) {
  const userId = currentUser?.id || currentUser?.user_id

  const [supported] = useState(pushSupported)
  const [needsInstall] = useState(iosNeedsInstall)
  const [subscribed, setSubscribed] = useState(false)
  const [notifyTime, setNotifyTime] = useState(DEFAULT_TIME)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null) // { type: 'success' | 'error', text }

  const fail = (err, fallback) =>
    setMessage({ type: 'error', text: err?.message || fallback })

  // On load: is this browser already subscribed? Ask the server for the saved time.
  useEffect(() => {
    if (!supported || !userId) {
      setSubscribed(false)
      return undefined
    }
    let cancelled = false

    ;(async () => {
      try {
        const registration = await navigator.serviceWorker.register(SW_URL)
        await navigator.serviceWorker.ready
        const existing = await registration.pushManager.getSubscription()

        if (!existing) {
          localStorage.setItem(PUSH_FLAG_KEY, 'false')
          if (!cancelled) setSubscribed(false)
          return
        }

        const res = await getWeatherPushStatus(userId, existing.endpoint)
        if (cancelled) return
        const isOn = Boolean(res.data?.subscribed)
        localStorage.setItem(PUSH_FLAG_KEY, String(isOn))
        setSubscribed(isOn)
        if (isOn && res.data.notify_time) setNotifyTime(res.data.notify_time)
      } catch {
        // Offline or server down — leave things as they were
      }
    })()

    return () => {
      cancelled = true
    }
  }, [supported, userId])

  const subscribe = useCallback(
    async (time) => {
      if (!supported || !userId) return
      setBusy(true)
      setMessage(null)
      try {
        // Ask for permission FIRST, straight from the click, or some browsers refuse
        let permission = Notification.permission
        if (permission === 'default') permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setMessage({
            type: 'error',
            text: 'Notifications are blocked for this site. Allow them in your browser settings, then try again.',
          })
          return
        }

        const registration = await navigator.serviceWorker.register(SW_URL)
        await navigator.serviceWorker.ready

        const keyRes = await getWeatherPushPublicKey()
        const serverKey = urlBase64ToUint8Array(keyRes.data.public_key)

        let browserSub = await registration.pushManager.getSubscription()
        // Made with an old server key (e.g. keys were regenerated)? Start fresh.
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

        const res = await subscribeWeatherPush(userId, browserSub.toJSON(), time, userTimezone())
        localStorage.setItem(PUSH_FLAG_KEY, 'true')
        setSubscribed(true)
        setNotifyTime(res.data.notify_time)
        setMessage({ type: 'success', text: 'All set — your forecast will arrive every day at that time.' })
      } catch (err) {
        fail(err, 'Could not turn on scheduled alerts')
      } finally {
        setBusy(false)
      }
    },
    [supported, userId]
  )

  const updateTime = useCallback(
    async (time) => {
      if (!supported || !userId) return
      setBusy(true)
      setMessage(null)
      try {
        const registration = await navigator.serviceWorker.ready
        const browserSub = await registration.pushManager.getSubscription()
        if (!browserSub) throw new Error('This device is no longer subscribed — please turn alerts on again')
        const res = await updateWeatherPushTime(userId, browserSub.endpoint, time, userTimezone())
        setNotifyTime(res.data.notify_time)
        setMessage({ type: 'success', text: 'Alert time updated.' })
      } catch (err) {
        fail(err, 'Could not update the time')
      } finally {
        setBusy(false)
      }
    },
    [supported, userId]
  )

  const unsubscribe = useCallback(async () => {
    if (!supported || !userId) return
    setBusy(true)
    setMessage(null)
    try {
      const registration = await navigator.serviceWorker.ready
      const browserSub = await registration.pushManager.getSubscription()
      if (browserSub) {
        await unsubscribeWeatherPush(userId, browserSub.endpoint)
        // Calendar/alert notifications share this browser subscription — keep it if they're on
        if (localStorage.getItem('campusbuddy_reminder_push_enabled') !== 'true') await browserSub.unsubscribe()
      }
      localStorage.setItem(PUSH_FLAG_KEY, 'false')
      setSubscribed(false)
      setMessage({ type: 'success', text: 'Scheduled alerts turned off.' })
    } catch (err) {
      fail(err, 'Could not turn off scheduled alerts')
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
      if (!browserSub) throw new Error('This device is no longer subscribed — please turn alerts on again')
      await sendWeatherPushTest(userId, browserSub.endpoint)
      setMessage({ type: 'success', text: 'Test sent — it should pop up in a moment.' })
    } catch (err) {
      fail(err, 'Could not send a test notification')
    } finally {
      setBusy(false)
    }
  }, [supported, userId])

  return {
    supported,
    needsInstall,
    loggedIn: Boolean(userId),
    subscribed,
    notifyTime,
    busy,
    message,
    subscribe,
    updateTime,
    unsubscribe,
    sendTest,
  }
}
