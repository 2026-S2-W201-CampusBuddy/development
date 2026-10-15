import { useState, useEffect, useCallback, useRef } from 'react'
import './AlertsModal.css'
import EventForm from './EventForm'
import {
  getUpcomingAlerts,
  getAlertInbox,
  markAlertsRead,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '../api'
import { formatMoment, formatTime12, formatLongDate, repeatLabel, todayKey } from '../utils/calendarUtils'

// The Alerts bubble: set up notifications for this device, see what is
// scheduled, and read what has already fired. Alerts made here are calendar
// items too, so they also appear in the Calendar bubble.
export default function AlertsModal({
  isOpen,
  onClose,
  currentUser,
  push,
  onChanged,
  unreadCount = 0,
  onOpenCalendar,
}) {
  const userId = currentUser?.id || currentUser?.user_id

  const [tab, setTab] = useState('upcoming') // 'upcoming' | 'inbox'
  const [upcoming, setUpcoming] = useState([])
  const [inbox, setInbox] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [reloadTick, setReloadTick] = useState(0)

  const [form, setForm] = useState(null) // null | { editing: eventItem | null }
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  // Inbox rows that were unread when the person looked at them (so they stay highlighted)
  const [freshIds, setFreshIds] = useState(() => new Set())
  const seenRef = useRef(new Set())

  // Open on the Inbox when something new arrived
  const unreadRef = useRef(unreadCount)
  unreadRef.current = unreadCount

  useEffect(() => {
    if (!isOpen) return
    setTab(unreadRef.current > 0 ? 'inbox' : 'upcoming')
    setForm(null)
    setNotice(null)
    setFormError('')
    setConfirmDeleteId(null)
    setFreshIds(new Set())
    seenRef.current = new Set()
  }, [isOpen])

  const load = useCallback(
    async (silent = false) => {
      if (!userId) return
      if (!silent) setLoading(true)
      try {
        const [up, box] = await Promise.all([getUpcomingAlerts(userId), getAlertInbox(userId)])
        setUpcoming(up.data)
        setInbox(box.data.items)
        setLoadError('')
      } catch (err) {
        if (!silent) setLoadError(err.message || 'Could not load your alerts')
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [userId]
  )

  // Load on open, after changes, and every 20s while open (so new alerts appear on their own)
  useEffect(() => {
    if (!isOpen || !userId) return undefined
    load()
    const interval = setInterval(() => load(true), 20000)
    return () => clearInterval(interval)
  }, [isOpen, userId, load, reloadTick])

  // Looking at the Inbox marks its new items as read (and clears the badge on the bubble)
  useEffect(() => {
    if (!isOpen || tab !== 'inbox' || !userId) return
    const unread = inbox.filter((item) => !item.read && !seenRef.current.has(item.id))
    if (unread.length === 0) return
    unread.forEach((item) => seenRef.current.add(item.id))
    setFreshIds((current) => new Set([...current, ...unread.map((item) => item.id)]))
    markAlertsRead(userId, { ids: unread.map((item) => item.id) })
      .then(() => onChanged?.())
      .catch(() => {})
  }, [isOpen, tab, inbox, userId, onChanged])

  if (!isOpen) return null

  const handleSubmit = async (payload) => {
    setBusy(true)
    setFormError('')
    try {
      const editing = form.editing
      const res = editing
        ? await updateCalendarEvent(userId, editing.id, payload)
        : await createCalendarEvent(userId, payload)
      setForm(null)
      setTab('upcoming')
      setNotice(
        res.warning
          ? { type: 'warn', text: res.warning }
          : { type: 'success', text: editing ? 'Changes saved.' : "Alert set — we'll notify you when it's time." }
      )
      setReloadTick((t) => t + 1)
      onChanged?.()
    } catch (err) {
      setFormError(err.message || 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (item) => {
    try {
      await deleteCalendarEvent(userId, item.event_id)
      setConfirmDeleteId(null)
      setNotice({ type: 'success', text: 'Deleted — its alerts are cancelled.' })
      setReloadTick((t) => t + 1)
      onChanged?.()
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Could not delete' })
    }
  }

  // ---------- "Notifications on this device" card ----------
  let deviceCard
  if (!userId) {
    deviceCard = <p className="alertsDeviceText">Log in to set up alerts.</p>
  } else if (push?.needsInstall) {
    deviceCard = (
      <p className="alertsDeviceText">
        📱 On iPhone and iPad, add CampusBuddy to your Home Screen first (Share → Add to Home Screen),
        then open it from there to turn on notifications. Alerts still appear in your inbox below.
      </p>
    )
  } else if (push && !push.supported) {
    deviceCard = <p className="alertsDeviceText">This browser can't show pop-up notifications, but alerts still appear in your inbox below.</p>
  } else if (push) {
    deviceCard = (
      <>
        <div className="alertsDeviceInfo">
          <strong>{push.enabled ? '🔔 Notifications are on for this device' : '🔕 Notifications are off for this device'}</strong>
          <span>
            {push.enabled
              ? "You'll get a pop-up for every alert — even when CampusBuddy is closed."
              : 'Turn them on to get alerts even when CampusBuddy is closed.'}
          </span>
        </div>
        <div className="alertsDeviceActions">
          {push.enabled ? (
            <>
              <button className="btnGlass" onClick={push.sendTest} disabled={push.busy}>Send a test</button>
              <button className="btnGlass" onClick={push.disable} disabled={push.busy}>Turn off</button>
            </>
          ) : (
            <button className="btnGlass btnPrimary" onClick={push.enable} disabled={push.busy}>
              {push.busy ? 'Turning on…' : 'Turn on notifications'}
            </button>
          )}
        </div>
        {push.message && <p className={`alertsMessage ${push.message.type}`}>{push.message.text}</p>}
      </>
    )
  }

  const eventLine = (item) => {
    if (!item.event) return null
    const date = formatLongDate(item.event.date)
    const repeat = item.event.repeat !== 'none' ? ` · 🔁 ${repeatLabel(item.event.repeat)}` : ''
    return `${item.kind === 'alert' ? 'Alert' : 'Event'}: ${formatTime12(item.event.time)}, ${date}${repeat}`
  }

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modalDialog hubModalDialog alertsDialog" onClick={(e) => e.stopPropagation()}>
        <button className="modalCloseBtn" onClick={onClose}>✕</button>

        <div className="hubModalBody alertsModalBody">
          <div className="modalHeader alertsHeader">
            <h2 className="modalHeading">Alerts</h2>
            <p className="modalCaption">Reminders for your events, delivered even when CampusBuddy is closed</p>
          </div>

          <div className="alertsDeviceCard">{deviceCard}</div>

          {userId && (
            <>
              <div className="alertsToolbar">
                <div className="alertsTabs">
                  <button className={`alertsTab ${tab === 'upcoming' ? 'active' : ''}`} onClick={() => setTab('upcoming')}>
                    Upcoming{upcoming.length > 0 && <span className="alertsTabCount">{upcoming.length}</span>}
                  </button>
                  <button className={`alertsTab ${tab === 'inbox' ? 'active' : ''}`} onClick={() => setTab('inbox')}>
                    Inbox{unreadCount > 0 && <span className="alertsBadge">{unreadCount}</span>}
                  </button>
                </div>
                {!form && (
                  <button className="btnGlass btnPrimary alertsNewBtn" onClick={() => { setForm({ editing: null }); setNotice(null); setFormError(''); setTab('upcoming') }}>
                    ＋ New alert
                  </button>
                )}
              </div>

              {notice && <p className={`alertsMessage ${notice.type}`}>{notice.text}</p>}
              {loadError && <p className="alertsMessage error">{loadError}</p>}

              {form ? (
                <EventForm
                  key={form.editing ? `edit-${form.editing.id}` : 'new-alert'}
                  mode="alert"
                  initial={form.editing}
                  defaultDate={todayKey()}
                  busy={busy}
                  error={formError}
                  push={push}
                  onSubmit={handleSubmit}
                  onCancel={() => setForm(null)}
                />
              ) : tab === 'upcoming' ? (
                upcoming.length === 0 ? (
                  <p className="alertsEmpty">
                    {loading ? 'Loading…' : 'No alerts scheduled. Tap “New alert”, or add an event with an alert on the Calendar.'}
                  </p>
                ) : (
                  <div className="alertsList">
                    {upcoming.map((item) => (
                      <article key={item.id} className="alertsItem">
                        <div className="alertsItemIcon">{item.kind === 'alert' ? '🔔' : '📅'}</div>
                        <div className="alertsItemMain">
                          <div className="alertsItemTitle">{item.title}</div>
                          <div className="alertsItemWhen">⏰ {formatMoment(item.fire_at)} · {item.offset_label}</div>
                          {item.event && <div className="alertsItemMeta">{eventLine(item)}</div>}
                        </div>
                        <div className="alertsItemActions">
                          {confirmDeleteId === item.id ? (
                            <>
                              <span className="alertsConfirmText">Delete it and all its alerts?</span>
                              <button className="btnGlass alertsDangerBtn" onClick={() => handleDelete(item)}>Yes, delete</button>
                              <button className="btnGlass" onClick={() => setConfirmDeleteId(null)}>Keep</button>
                            </>
                          ) : (
                            <>
                              {onOpenCalendar && item.event && (
                                <button className="btnGlass" onClick={() => onOpenCalendar(item.event.date)}>📅 Calendar</button>
                              )}
                              {item.event && (
                                <button className="btnGlass" onClick={() => { setForm({ editing: item.event }); setNotice(null); setFormError('') }}>Edit</button>
                              )}
                              <button className="btnGlass" onClick={() => setConfirmDeleteId(item.id)}>Delete</button>
                            </>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )
              ) : inbox.length === 0 ? (
                <p className="alertsEmpty">{loading ? 'Loading…' : 'Nothing here yet. Alerts you receive will be kept here.'}</p>
              ) : (
                <div className="alertsList">
                  {inbox.map((item) => (
                    <article key={item.id} className={`alertsItem inboxItem ${freshIds.has(item.id) ? 'fresh' : ''} ${item.status}`}>
                      <div className="alertsItemMain">
                        <div className="alertsItemTitle">{item.title}</div>
                        <div className="alertsItemBody">{item.body}</div>
                        <div className="alertsItemMeta">
                          {formatMoment(item.fire_at)}
                          {item.status === 'missed' && ' · Missed — CampusBuddy was offline at the time'}
                        </div>
                      </div>
                      {freshIds.has(item.id) && <span className="alertsNewDot" title="New" />}
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
