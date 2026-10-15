import { useState, useEffect } from 'react'
import './WeatherPushSettings.css'

// "12:05" style 24h value -> "12:05 PM" for friendlier display
function formatTime(value) {
  const [h, m] = value.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${suffix}`
}

export default function WeatherPushSettings({ push }) {
  const [draftTime, setDraftTime] = useState(push.notifyTime)

  // Keep the picker in step with the saved time (e.g. after it loads from the server)
  useEffect(() => {
    setDraftTime(push.notifyTime)
  }, [push.notifyTime])

  const timeIsValid = /^([01]\d|2[0-3]):[0-5]\d$/.test(draftTime)

  let body
  if (push.needsInstall) {
    body = (
      <p className="weatherPushHint">
        On iPhone and iPad, add CampusBuddy to your Home Screen first (Share → Add to Home Screen),
        then open it from there to turn on scheduled alerts.
      </p>
    )
  } else if (!push.supported) {
    body = <p className="weatherPushHint">Scheduled alerts aren't supported in this browser.</p>
  } else if (!push.loggedIn) {
    body = <p className="weatherPushHint">Log in to schedule a daily alert.</p>
  } else if (push.subscribed) {
    body = (
      <>
        <p className="weatherPushStatus">
          ✅ Scheduled daily at <strong>{formatTime(push.notifyTime)}</strong>
        </p>
        <div className="weatherPushTimeRow">
          <input
            type="time"
            className="liquidInput weatherPushTimeInput"
            value={draftTime}
            onChange={(e) => setDraftTime(e.target.value)}
            aria-label="Alert time"
          />
          <button
            className="btnGlass"
            onClick={() => push.updateTime(draftTime)}
            disabled={push.busy || !timeIsValid || draftTime === push.notifyTime}
          >
            Save time
          </button>
        </div>
        <div className="weatherPushActions">
          <button className="btnGlass" onClick={push.sendTest} disabled={push.busy}>
            Send a test now
          </button>
          <button className="btnGlass" onClick={push.unsubscribe} disabled={push.busy}>
            Turn off
          </button>
        </div>
      </>
    )
  } else {
    body = (
      <>
        <div className="weatherPushTimeRow">
          <input
            type="time"
            className="liquidInput weatherPushTimeInput"
            value={draftTime}
            onChange={(e) => setDraftTime(e.target.value)}
            aria-label="Alert time"
          />
          <button
            className="btnGlass btnPrimary"
            onClick={() => push.subscribe(draftTime)}
            disabled={push.busy || !timeIsValid}
          >
            {push.busy ? 'Setting up…' : 'Schedule daily alert'}
          </button>
        </div>
      </>
    )
  }

  return (
    <div className="weatherPushBox">
      <div className="weatherPushHeader">
        <span className="weatherPushIcon">⏰</span>
        <div>
          <div className="weatherPushTitle">Daily forecast alert</div>
          <div className="weatherPushSubtitle">
            Pick a time — it arrives even when CampusBuddy is closed
          </div>
        </div>
      </div>

      {body}

      {push.message && (
        <p className={`weatherPushMessage ${push.message.type}`}>{push.message.text}</p>
      )}
    </div>
  )
}
