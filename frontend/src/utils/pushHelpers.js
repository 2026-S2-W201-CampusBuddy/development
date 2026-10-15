// Small browser helpers shared by the push-notification hooks.

export function pushSupported() {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

// iPhones/iPads only allow push for apps added to the Home Screen
export function iosNeedsInstall() {
  if (typeof navigator === 'undefined') return false
  const isIos =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isInstalled =
    window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
  return isIos && !isInstalled
}

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

export function sameKey(existing, wanted) {
  if (!existing) return false
  const a = new Uint8Array(existing)
  if (a.length !== wanted.length) return false
  return a.every((byte, i) => byte === wanted[i])
}

export function userTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Pacific/Auckland'
  } catch {
    return 'Pacific/Auckland'
  }
}
