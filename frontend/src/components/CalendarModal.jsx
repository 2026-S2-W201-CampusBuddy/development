import { useState, useEffect, useMemo } from 'react'
import './CalendarModal.css'
import EventForm from './EventForm'
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '../api'
import {
  WEEKDAYS,
  COLORS,
  buildMonthGrid,
  gridRange,
  shiftMonth,
  formatMonthTitle,
  formatLongDate,
  formatTime12,
  describeReminders,
  repeatLabel,
  parseDateKey,
  todayKey,
} from '../utils/calendarUtils'

// The Calendar bubble. Events AND alerts both appear here (they are the same
// records), so anything added from the Alerts bubble shows up on the calendar too.
export default function CalendarModal({
  isOpen,
  onClose,
  currentUser,
  push,
  onChanged,
  initialDate,
  onOpenAlerts,
}) {
  const userId = currentUser?.id || currentUser?.user_id

  const [view, setView] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selectedKey, setSelectedKey] = useState(todayKey())
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [reloadTick, setReloadTick] = useState(0)

  const [form, setForm] = useState(null) // null | { mode: 'event'|'alert', editing: item|null }
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState(null) // { type: 'success'|'warn'|'error', text }
  const [confirmDeleteKey, setConfirmDeleteKey] = useState(null)

  // Every time the calendar opens: show today (or the day we were sent to)
  useEffect(() => {
    if (!isOpen) return
    const key = initialDate || todayKey()
    const date = parseDateKey(key)
    setView({ year: date.getFullYear(), month: date.getMonth() })
    setSelectedKey(key)
    setForm(null)
    setNotice(null)
    setFormError('')
    setConfirmDeleteKey(null)
  }, [isOpen, initialDate])

  // Load the visible month (plus the greyed days around it)
  useEffect(() => {
    if (!isOpen || !userId) return undefined
    let cancelled = false
    const { from, to } = gridRange(view.year, view.month)

    setLoading(true)
    setLoadError('')
    getCalendarEvents(userId, from, to)
      .then((res) => {
        if (!cancelled) setEvents(res.data)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || 'Could not load your calendar')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, userId, view.year, view.month, reloadTick])

  const cells = useMemo(() => buildMonthGrid(view.year, view.month), [view.year, view.month])

  const eventsByDate = useMemo(() => {
    const map = {}
    events.forEach((item) => {
      ;(map[item.date] = map[item.date] || []).push(item)
    })
    return map
  }, [events])

  if (!isOpen) return null

  const today = todayKey()
  const dayItems = eventsByDate[selectedKey] || []

  const goToMonth = (delta) => setView((v) => shiftMonth(v.year, v.month, delta))

  const goToToday = () => {
    const now = new Date()
    setView({ year: now.getFullYear(), month: now.getMonth() })
    setSelectedKey(todayKey())
  }

  const selectCell = (cell) => {
    setSelectedKey(cell.key)
    setConfirmDeleteKey(null)
    setNotice(null)
    if (!cell.inMonth) {
      const date = parseDateKey(cell.key)
      setView({ year: date.getFullYear(), month: date.getMonth() })
    }
  }

  const openForm = (mode, editing = null) => {
    setForm({ mode, editing })
    setFormError('')
    setNotice(null)
    setConfirmDeleteKey(null)
  }

  const handleSubmit = async (payload) => {
    setBusy(true)
    setFormError('')
    try {
      const editing = form.editing
      const res = editing
        ? await updateCalendarEvent(userId, editing.id, payload)
        : await createCalendarEvent(userId, payload)

      // Jump to the day it was saved on so the person sees it appear
      const saved = res.data
      const date = parseDateKey(saved.date)
      setView({ year: date.getFullYear(), month: date.getMonth() })
      setSelectedKey(saved.date)
      setForm(null)
      setNotice(
        res.warning
          ? { type: 'warn', text: res.warning }
          : { type: 'success', text: editing ? 'Changes saved.' : saved.kind === 'alert' ? 'Alert set.' : 'Added to your calendar.' }
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
      await deleteCalendarEvent(userId, item.id)
      setConfirmDeleteKey(null)
      setNotice({ type: 'success', text: 'Deleted.' })
      setReloadTick((t) => t + 1)
      onChanged?.()
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Could not delete' })
    }
  }

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modalDialog hubModalDialog calendarDialog" onClick={(e) => e.stopPropagation()}>
        <button className="modalCloseBtn" onClick={onClose}>✕</button>

        <div className="hubModalBody calendarModalBody">
          <div className="modalHeader calendarHeader">
            <h2 className="modalHeading">Calendar</h2>
            <p className="modalCaption">Your events and alerts in one place</p>
          </div>

          {!userId ? (
            <p className="calendarEmpty">Log in to use your calendar.</p>
          ) : (
            <div className="calendarLayout">
              {/* ---------------- Month grid ---------------- */}
              <section className="calendarMonthPane">
                <div className="calendarMonthNav">
                  <button className="calendarNavBtn" onClick={() => goToMonth(-1)} aria-label="Previous month">‹</button>
                  <div className="calendarMonthTitle">{formatMonthTitle(view.year, view.month)}</div>
                  <button className="calendarNavBtn" onClick={() => goToMonth(1)} aria-label="Next month">›</button>
                  <button className="btnGlass calendarTodayBtn" onClick={goToToday}>Today</button>
                </div>

                <div className="calendarWeekdays">
                  {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
                </div>

                <div className="calendarGrid">
                  {cells.map((cell) => {
                    const items = eventsByDate[cell.key] || []
                    const classes = [
                      'calendarCell',
                      cell.inMonth ? '' : 'outside',
                      cell.isToday ? 'today' : '',
                      cell.key === selectedKey ? 'selected' : '',
                    ].join(' ')
                    return (
                      <button
                        key={cell.key}
                        className={classes}
                        onClick={() => selectCell(cell)}
                        aria-label={`${formatLongDate(cell.key)}, ${items.length} ${items.length === 1 ? 'item' : 'items'}`}
                        aria-pressed={cell.key === selectedKey}
                      >
                        <span className="calendarCellNum">{cell.day}</span>
                        <span className="calendarDots">
                          {items.slice(0, 3).map((item, i) => (
                            <i key={i} style={{ background: COLORS[item.color] || COLORS.sky }} />
                          ))}
                          {items.length > 3 && <em>+{items.length - 3}</em>}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {loading && <p className="calendarHint">Loading…</p>}
                {loadError && <p className="calendarNotice error">{loadError}</p>}
              </section>

              {/* ---------------- Selected day ---------------- */}
              <section className="calendarDayPane">
                <div className="calendarDayHeader">
                  <h3 className="calendarDayTitle">{formatLongDate(selectedKey)}</h3>
                  <span className="calendarDaySub">
                    {selectedKey === today ? 'Today · ' : ''}
                    {dayItems.length === 0 ? 'Nothing planned' : `${dayItems.length} ${dayItems.length === 1 ? 'item' : 'items'}`}
                  </span>
                </div>

                {!form && (
                  <div className="calendarAddRow">
                    <button className="btnGlass btnPrimary" onClick={() => openForm('event')}>＋ Event</button>
                    <button className="btnGlass" onClick={() => openForm('alert')}>＋ Alert</button>
                    {onOpenAlerts && (
                      <button className="btnGlass calendarAlertsLink" onClick={onOpenAlerts}>🔔 All alerts</button>
                    )}
                  </div>
                )}

                {notice && <p className={`calendarNotice ${notice.type}`}>{notice.text}</p>}

                {form ? (
                  <EventForm
                    key={form.editing ? `edit-${form.editing.id}` : `new-${form.mode}-${selectedKey}`}
                    mode={form.mode}
                    initial={form.editing}
                    defaultDate={selectedKey}
                    busy={busy}
                    error={formError}
                    push={push}
                    onSubmit={handleSubmit}
                    onCancel={() => setForm(null)}
                  />
                ) : dayItems.length === 0 ? (
                  <p className="calendarEmpty">
                    Nothing on this day yet. Add an event, or set an alert to be reminded about something.
                  </p>
                ) : (
                  <div className="calendarItemList">
                    {dayItems.map((item) => {
                      const itemKey = `${item.id}-${item.date}`
                      return (
                        <article key={itemKey} className="calendarItem" style={{ '--itemColor': COLORS[item.color] || COLORS.sky }}>
                          <div className="calendarItemMain">
                            <div className="calendarItemTime">
                              {item.kind === 'alert' ? '🔔' : '📅'} {formatTime12(item.time)}
                              {item.end_time ? ` – ${formatTime12(item.end_time)}` : ''}
                            </div>
                            <div className="calendarItemTitle">{item.title}</div>
                            {item.location && <div className="calendarItemMeta">📍 {item.location}</div>}
                            {item.notes && <div className="calendarItemNotes">{item.notes}</div>}
                            <div className="calendarItemMeta">
                              {item.repeat !== 'none' && `🔁 ${repeatLabel(item.repeat)} · `}
                              🔔 {describeReminders(item.remind_offsets)}
                            </div>
                          </div>

                          <div className="calendarItemActions">
                            {confirmDeleteKey === itemKey ? (
                              <>
                                <span className="calendarConfirmText">
                                  {item.repeat !== 'none' ? 'Delete every repeat?' : 'Delete this?'}
                                </span>
                                <button className="btnGlass calendarDangerBtn" onClick={() => handleDelete(item)}>Yes, delete</button>
                                <button className="btnGlass" onClick={() => setConfirmDeleteKey(null)}>Keep</button>
                              </>
                            ) : (
                              <>
                                <button className="btnGlass" onClick={() => openForm(item.kind, item)}>Edit</button>
                                <button className="btnGlass" onClick={() => setConfirmDeleteKey(itemKey)}>Delete</button>
                              </>
                            )}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
