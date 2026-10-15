import { useState, useEffect, useCallback, useRef } from 'react'
import { getAlertsSummary } from '../api'
import { todayKey } from '../utils/calendarUtils'

// Keeps the two bubble labels fresh: the unread badge on "Alerts" and the
// number of items today on "Calendar". Also reacts to messages from the
// service worker so the badge updates the moment a notification arrives.
export default function useAlerts(currentUser, { onOpenAlerts } = {}) {
  const userId = currentUser?.id || currentUser?.user_id
  const [summary, setSummary] = useState({ unreadCount: 0, todayCount: 0 })

  // Always call the latest callback without re-subscribing every render
  const openRef = useRef(onOpenAlerts)
  openRef.current = onOpenAlerts

  const refreshSummary = useCallback(async () => {
    if (!userId) {
      setSummary({ unreadCount: 0, todayCount: 0 })
      return
    }
    try {
      const res = await getAlertsSummary(userId, todayKey())
      setSummary({ unreadCount: res.data.unread_count, todayCount: res.data.today_count })
    } catch {
      // Offline or server down — keep showing the last numbers
    }
  }, [userId])

  // Poll every 30s (the Friends bubble does the same)
  useEffect(() => {
    refreshSummary()
    const interval = setInterval(refreshSummary, 30000)
    return () => clearInterval(interval)
  }, [refreshSummary])

  // Messages from the service worker: "a push arrived" / "open Alerts please"
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return undefined
    const handleMessage = (event) => {
      const message = event.data || {}
      if (message.type === 'campusbuddy-push') refreshSummary()
      if (message.type === 'campusbuddy-open' && message.target === 'alerts') {
        refreshSummary()
        openRef.current?.()
      }
    }
    navigator.serviceWorker.addEventListener('message', handleMessage)
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage)
  }, [refreshSummary])

  // CampusBuddy was opened fresh by tapping a notification (…/?open=alerts)
  useEffect(() => {
    if (!userId) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('open') !== 'alerts') return
    openRef.current?.()
    params.delete('open')
    const rest = params.toString()
    window.history.replaceState({}, '', window.location.pathname + (rest ? `?${rest}` : '') + window.location.hash)
  }, [userId])

  return { ...summary, refreshSummary }
}
