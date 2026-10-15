import { useState } from 'react'
import './EventForm.css'
import { userTimezone } from '../utils/pushHelpers'
import {
  COLORS,
  COLOR_KEYS,
  REMINDER_PRESETS,
  MAX_OFFSETS,
  customToMinutes,
  offsetLabel,
  defaultStart,
  isInPast,
  isReminderPast,
  todayKey,
} from '../utils/calendarUtils'

// One form for both bubbles. `mode` decides the wording and defaults:
//   'event' -> Calendar bubble (has an end time, location, colour; reminder defaults to 15 min before)
//   'alert' -> Alerts bubble   (just "remind me about X at this time"; defaults to firing at the time)
// Whatever is saved from either lands in the same place, so it shows up in both bubbles.
export default function EventForm({
  mode = 'event',
  initial = null,
  defaultDate,
  busy = false,
  error = '',
  push,
  onSubmit,
  onCancel,
}) {
  const isEditing = Boolean(initial)
  const isAlert = (initial?.kind || mode) === 'alert'
  const start = defaultStart(defaultDate || todayKey())

  const [title, setTitle] = useState(initial?.title || '')
  const [date, setDate] = useState(initial?.series_date || start.date)
  const [time, setTime] = useState(initial?.series_time || start.time)
  const [endTime, setEndTime] = useState(initial?.end_time || '')
  const [location, setLocation] = useState(initial?.location || '')
  const [notes, setNotes] = useState(initial?.notes || '')
  const [repeat, setRepeat] = useState(initial?.repeat || 'none')
  const [color, setColor] = useState(initial?.color || (isAlert ? 'rose' : 'sky'))
  const [offsets, setOffsets] = useState(initial ? initial.remind_offsets : isAlert ? [0] : [15])
  const [customAmount, setCustomAmount] = useState('')
  const [customUnit, setCustomUnit] = useState('minutes')
  const [localError, setLocalError] = useState('')

  const presetMinutes = REMINDER_PRESETS.map((p) => p.minutes)
  const customOffsets = offsets.filter((m) => !presetMinutes.includes(m))

  const toggleOffset = (minutes) => {
    setLocalError('')
    setOffsets((current) => {
      if (current.includes(minutes)) return current.filter((m) => m !== minutes)
      if (current.length >= MAX_OFFSETS) {
        setLocalError(`You can add up to ${MAX_OFFSETS} reminders`)
        return current
      }
      return [...current, minutes]
    })
  }

  const addCustom = () => {
    const minutes = customToMinutes(customAmount, customUnit)
    if (minutes === null) {
      setLocalError('Enter a whole number — up to 30 days before')
      return
    }
    if (!offsets.includes(minutes)) toggleOffset(minutes)
    setCustomAmount('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setLocalError('')

    if (!title.trim()) return setLocalError('Please give it a title')
    if (!date || !time) return setLocalError('Please pick a date and time')
    if (!isAlert && endTime && endTime <= time) return setLocalError('The end time must be after the start time')
    if (isAlert && repeat === 'none' && isInPast(date, time)) {
      return setLocalError('That time has already passed — pick a time in the future')
    }

    onSubmit({
      kind: isAlert ? 'alert' : 'event',
      title: title.trim(),
      start_date: date,
      start_time: time,
      end_time: !isAlert && endTime ? endTime : null,
      location: isAlert ? '' : location.trim(),
      notes: notes.trim(),
      repeat,
      color,
      remind_offsets: [...offsets].sort((a, b) => a - b),
      timezone: userTimezone(),
    })
  }

  const wantsAlert = offsets.length > 0

  // One-off items only: warn about reminders whose time has already gone by (they would never be sent)
  const passedOffsets =
    repeat === 'none' && date && time ? offsets.filter((m) => isReminderPast(date, time, m)).sort((a, b) => a - b) : []
  let pushHint = null
  if (wantsAlert && push && push.loggedIn) {
    if (push.enabled) {
      pushHint = <p className="eventFormPushHint ok">🔔 You'll be notified on this device — even when CampusBuddy is closed.</p>
    } else if (push.needsInstall) {
      pushHint = <p className="eventFormPushHint">📱 To get alerts on iPhone, add CampusBuddy to your Home Screen first. You'll still see them in Alerts.</p>
    } else if (!push.supported) {
      pushHint = <p className="eventFormPushHint">This browser can't show pop-up notifications — you'll still see it in Alerts.</p>
    } else {
      pushHint = (
        <div className="eventFormPushHint">
          <span>🔕 Notifications aren't on for this device yet, so this alert would only show inside CampusBuddy.</span>
          <button type="button" className="btnGlass" onClick={push.enable} disabled={push.busy}>
            {push.busy ? 'Turning on…' : 'Turn on notifications'}
          </button>
        </div>
      )
    }
  }

  return (
    <form className="eventForm" onSubmit={handleSubmit} noValidate>
      <div className="eventFormHeading">
        {isEditing ? (isAlert ? 'Edit alert' : 'Edit event') : isAlert ? '🔔 New alert' : '📅 New event'}
      </div>

      <div className="eventFormGroup">
        <label className="fieldLabel" htmlFor="ef-title">{isAlert ? 'Remind me about' : 'Title'}</label>
        <input
          id="ef-title"
          className="liquidInput"
          value={title}
          maxLength={120}
          placeholder={isAlert ? 'e.g. Submit essay' : 'e.g. Algorithms lecture'}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
      </div>

      <div className="eventFormRow">
        <div className="eventFormGroup">
          <label className="fieldLabel" htmlFor="ef-date">{repeat !== 'none' ? 'Starts on' : 'Date'}</label>
          <input id="ef-date" type="date" className="liquidInput eventFormDate" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="eventFormGroup">
          <label className="fieldLabel" htmlFor="ef-time">{isAlert ? 'Alert time' : 'Starts'}</label>
          <input id="ef-time" type="time" className="liquidInput eventFormDate" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        {!isAlert && (
          <div className="eventFormGroup">
            <label className="fieldLabel" htmlFor="ef-end">Ends (optional)</label>
            <input id="ef-end" type="time" className="liquidInput eventFormDate" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        )}
      </div>

      {!isAlert && (
        <div className="eventFormGroup">
          <label className="fieldLabel" htmlFor="ef-location">Location (optional)</label>
          <input id="ef-location" className="liquidInput" value={location} maxLength={120} placeholder="e.g. WG404" onChange={(e) => setLocation(e.target.value)} />
        </div>
      )}

      <div className="eventFormGroup">
        <label className="fieldLabel" htmlFor="ef-repeat">Repeat</label>
        <select id="ef-repeat" className="liquidInput" value={repeat} onChange={(e) => setRepeat(e.target.value)}>
          <option value="none">Does not repeat</option>
          <option value="daily">Every day</option>
          <option value="weekly">Every week</option>
          <option value="monthly">Every month</option>
        </select>
        {isEditing && repeat !== 'none' && (
          <span className="eventFormNote">Changes apply to every repeat of this {isAlert ? 'alert' : 'event'}.</span>
        )}
      </div>

      <div className="eventFormGroup">
        <span className="fieldLabel">{isAlert ? 'Alert me' : 'Alert me (optional)'}</span>
        <div className="eventFormChips">
          {REMINDER_PRESETS.map((preset) => (
            <button
              type="button"
              key={preset.minutes}
              className={`eventFormChip ${offsets.includes(preset.minutes) ? 'on' : ''}`}
              onClick={() => toggleOffset(preset.minutes)}
              aria-pressed={offsets.includes(preset.minutes)}
            >
              {preset.label}
            </button>
          ))}
          {customOffsets.map((minutes) => (
            <button type="button" key={minutes} className="eventFormChip on" onClick={() => toggleOffset(minutes)} title="Remove">
              {offsetLabel(minutes)} ✕
            </button>
          ))}
        </div>
        <div className="eventFormCustom">
          <span>Custom:</span>
          <input
            type="number"
            min="1"
            inputMode="numeric"
            className="liquidInput eventFormCustomAmount"
            value={customAmount}
            placeholder="e.g. 45"
            onChange={(e) => setCustomAmount(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
          />
          <select className="liquidInput eventFormCustomUnit" value={customUnit} onChange={(e) => setCustomUnit(e.target.value)}>
            <option value="minutes">minutes</option>
            <option value="hours">hours</option>
            <option value="days">days</option>
          </select>
          <button type="button" className="btnGlass" onClick={addCustom}>Add</button>
        </div>
        {!wantsAlert && !isAlert && <span className="eventFormNote">No alert — it will only appear on your calendar.</span>}
        {passedOffsets.length > 0 && (
          <span className="eventFormNote warn">
            ⚠️ {passedOffsets.map(offsetLabel).join(' and ')} {passedOffsets.length === 1 ? 'has' : 'have'} already passed, so
            {passedOffsets.length === 1 ? ' that alert' : ' those alerts'} won't be sent.
          </span>
        )}
      </div>

      {pushHint}

      {!isAlert && (
        <div className="eventFormGroup">
          <span className="fieldLabel">Colour</span>
          <div className="eventFormSwatches">
            {COLOR_KEYS.map((key) => (
              <button
                type="button"
                key={key}
                className={`eventFormSwatch ${color === key ? 'on' : ''}`}
                style={{ background: COLORS[key] }}
                onClick={() => setColor(key)}
                aria-label={key}
                aria-pressed={color === key}
              />
            ))}
          </div>
        </div>
      )}

      <div className="eventFormGroup">
        <label className="fieldLabel" htmlFor="ef-notes">Notes (optional)</label>
        <textarea id="ef-notes" className="liquidInput eventFormNotes" rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {(localError || error) && <p className="eventFormError">{localError || error}</p>}

      <div className="eventFormActions">
        <button type="button" className="btnGlass" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className="btnGlass btnPrimary" disabled={busy}>
          {busy ? 'Saving…' : isEditing ? 'Save changes' : isAlert ? 'Set alert' : 'Add to calendar'}
        </button>
      </div>
    </form>
  )
}
