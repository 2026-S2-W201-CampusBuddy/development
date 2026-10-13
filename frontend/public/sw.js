// CampusBuddy service worker
// -------------------------------------------------------------------------
// This tiny script is what lets weather alerts, calendar events and alerts
// appear even when the CampusBuddy tab (or the whole browser window) is
// closed: the browser vendor's push service wakes this worker up, and it
// shows the notification. It does NOT cache anything, so it can never serve
// a stale copy of the app.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }

  const iconUrl = new URL('./icons/icon-192.png', self.registration.scope).href

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || 'CampusBuddy', {
        body: data.body || '',
        icon: iconUrl,
        badge: iconUrl,
        tag: data.tag || 'campusbuddy-weather', // same tag replaces the old notification instead of stacking
        data: { url: data.url || './', target: data.target || null },
      }),
      // If CampusBuddy is open, let it refresh its Alerts badge straight away
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((windows) => windows.forEach((win) => win.postMessage({ type: 'campusbuddy-push' }))),
    ])
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const { url, target } = event.notification.data || {}
  const destination = new URL(url || './', self.registration.scope)
  if (target) destination.searchParams.set('open', target) // e.g. ?open=alerts

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      // If CampusBuddy is already open somewhere, jump to it instead of opening a duplicate
      for (const win of windows) {
        if (win.url.startsWith(self.registration.scope) && 'focus' in win) {
          if (target) win.postMessage({ type: 'campusbuddy-open', target })
          return win.focus()
        }
      }
      return self.clients.openWindow(destination.href)
    })
  )
})
