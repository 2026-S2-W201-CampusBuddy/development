// Date + wording helpers for the Calendar and Alerts bubbles.
// Everything here is plain functions with no React, so it is easy to test.

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const COLORS = {
  sky: '#38bdf8',
  rose: '#fb7185',
  violet: '#a78bfa',
  amber: '#fbbf24',
  emerald: '#34d399',
  slate: '#94a3b8',
}
export const COLOR_KEYS = Object.keys(COLORS)

// Quick-pick reminder times (minutes before the event)
export const REMINDER_PRESETS = [
  { minutes: 0, label: 'At time of event' },
  { minutes: 5, label: '5 min before' },
  { minutes: 15, label: '15 min before' },
  { minutes: 30, label: '30 min before' },
  { minutes: 60, label: '1 hour before' },
  { minutes: 1440, label: '1 day before' },
]

export const MAX_OFFSET_MINUTES = 30 * 24 * 60
export const MAX_OFFSETS = 6

export const pad = (n) => String(n).padStart(2, '0')

// A Date -> "2026-10-14" using the person's LOCAL calendar day
export function toDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// "2026-10-14" -> a Date at local midnight
export function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayKey = () => toDateKey(new Date())

export function addDaysToKey(key, days) {
  const date = parseDateKey(key)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

// The 6-week grid for a month, Monday first, including the greyed days either side
export function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1)
  const leading = (first.getDay() + 6) % 7
  const today = todayKey()
  const cells = []
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(year, month, 1 - leading + i)
    const key = toDateKey(date)
    cells.push({ key, day: date.getDate(), inMonth: date.getMonth() === month, isToday: key === today })
  }
  return cells
}

// First and last day shown by the grid — what we ask the server for
export function gridRange(year, month) {
  const cells = buildMonthGrid(year, month)
  return { from: cells[0].key, to: cells[cells.length - 1].key }
}

export function shiftMonth(year, month, delta) {
  const date = new Date(year, month + delta, 1)
  return { year: date.getFullYear(), month: date.getMonth() }
}

export function formatMonthTitle(year, month) {
  return new Date(year, month, 1).toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' })
}

export function formatLongDate(key) {
  return parseDateKey(key).toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' })
}

// "Oct 13" — the label on the Calendar bubble
export function formatOrbDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// "14:30" -> "2:30 PM"
export function formatTime12(hhmm) {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

export function humanizeMinutes(minutes) {
  if (minutes % 1440 === 0) return plural(minutes / 1440, 'day')
  if (minutes % 60 === 0) return plural(minutes / 60, 'hour')
  if (minutes > 60) return `${plural(Math.floor(minutes / 60), 'hour')} ${plural(minutes % 60, 'minute')}`
  return plural(minutes, 'minute')
}

export function offsetLabel(minutes) {
  return minutes === 0 ? 'At time of event' : `${humanizeMinutes(minutes)} before`
}

// [0, 15] -> "At time of event, 15 minutes before"
export function describeReminders(offsets) {
  if (!offsets || offsets.length === 0) return 'No alert'
  return [...offsets].sort((a, b) => a - b).map(offsetLabel).join(', ')
}

// custom amount + unit -> minutes (or null if unusable)
export function customToMinutes(amount, unit) {
  const n = Number(amount)
  if (!Number.isInteger(n) || n < 1) return null
  const minutes = n * { minutes: 1, hours: 60, days: 1440 }[unit]
  return minutes > MAX_OFFSET_MINUTES ? null : minutes
}

export function repeatLabel(repeat) {
  return { daily: 'Every day', weekly: 'Every week', monthly: 'Every month' }[repeat] || ''
}

// "2026-10-13T20:15:00Z" -> "Today, 9:15 AM" / "Tomorrow, …" / "Thu 16 Oct, …"
export function formatMoment(iso, now = new Date()) {
  const date = new Date(iso)
  const clock = date.toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s/g, ' ').toUpperCase()
  const dayDiff = Math.round((parseDateKey(toDateKey(date)) - parseDateKey(toDateKey(now))) / 86400000)
  if (dayDiff === 0) return `Today, ${clock}`
  if (dayDiff === 1) return `Tomorrow, ${clock}`
  if (dayDiff === -1) return `Yesterday, ${clock}`
  const day = date.toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' })
  return `${day}, ${clock}`
}

// Is a local date + time already behind us?
export function isInPast(dateKey, hhmm, now = new Date()) {
  const [y, mo, d] = dateKey.split('-').map(Number)
  const [h, mi] = hhmm.split(':').map(Number)
  return new Date(y, mo - 1, d, h, mi) <= now
}

// Has this reminder's moment (event time minus the lead time) already gone by?
export function isReminderPast(dateKey, hhmm, minutesBefore, now = new Date()) {
  const [y, mo, d] = dateKey.split('-').map(Number)
  const [h, mi] = hhmm.split(':').map(Number)
  return new Date(y, mo - 1, d, h, mi).getTime() - minutesBefore * 60000 <= now.getTime()
}

// A sensible default time for a brand-new item: the next full hour (or 9 AM on another day)
export function defaultStart(dateKey, now = new Date()) {
  if (dateKey === toDateKey(now)) {
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0)
    return { date: toDateKey(next), time: `${pad(next.getHours())}:00` }
  }
  return { date: dateKey, time: '09:00' }
}
