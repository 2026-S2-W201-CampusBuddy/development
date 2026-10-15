import { useState } from 'react'
import './PeerReviewExtras.css'

// Used for BOTH "Dispute my score" (kind = 'dispute') and "Report a concern
// about someone" (kind = 'report'). The result goes to the admin queue, which
// has a 48-hour deadline.
export default function PeerReviewReportForm({ kind, subjectUsername, options, onSubmit, onDone, onCancel }) {
  const isDispute = kind === 'dispute'
  const reasons = options?.reportReasons || []
  const hours = options?.policy?.responseHours || 48
  const maxLength = options?.detailsMaxLength || 500

  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sentMessage, setSentMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!reason) return setError('Please choose a reason')
    if (reason === 'other' && details.trim().length < 10) {
      return setError("Please add a few words explaining what's wrong")
    }
    setBusy(true)
    setError('')
    const result = await onSubmit({
      kind,
      subjectUsername: isDispute ? undefined : subjectUsername,
      reason,
      details: details.trim(),
    })
    setBusy(false)
    if (result.ok) setSentMessage(result.message)
    else setError(result.message)
  }

  if (sentMessage) {
    return (
      <div className="prSuccessBox">
        <p>{sentMessage}</p>
        <p className="prReportMeta">
          {isDispute ? <>You can follow it under <strong>My Score</strong>.</> : <>Thanks for helping keep Peer Review fair.</>}
        </p>
        <button className="btnGlass btnFullWidth" onClick={onDone}>OK</button>
      </div>
    )
  }

  return (
    <form className="prReportForm" onSubmit={handleSubmit}>
      <h3 className="prReportTitle">
        {isDispute ? 'Dispute my score' : `Report a concern about ${subjectUsername}`}
      </h3>
      <p className="prReportIntro">
        {isDispute
          ? `Tell us why you think your score is unfair. An admin will look at the ratings behind it and respond within ${hours} hours. Individual ratings stay private — you'll see the outcome, not who rated you.`
          : `Use this if something about ${subjectUsername}'s score looks fake or abusive — for example a made-up group. An admin will review it within ${hours} hours. They aren't told who reported it.`}
      </p>

      <div className="prReasonList" role="radiogroup" aria-label="Reason">
        {reasons.map((r) => (
          <label key={r.code} className={`prReasonOption ${reason === r.code ? 'prReasonOptionOn' : ''}`}>
            <input type="radio" name="report-reason" value={r.code} checked={reason === r.code} onChange={() => setReason(r.code)} />
            <span>{r.label}</span>
          </label>
        ))}
      </div>

      <textarea
        className="liquidInput prReportDetails"
        placeholder={reason === 'other' ? 'Please explain…' : 'Anything else we should know? (optional)'}
        maxLength={maxLength}
        value={details}
        onChange={(e) => setDetails(e.target.value)}
      />
      <div className="prCharCount">{details.length}/{maxLength}</div>

      {error && <p className="formError">{error}</p>}

      <div className="prReportActions">
        <button type="button" className="btnGlass" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className="btnGlass btnPrimary" disabled={busy}>
          {busy ? 'Sending…' : isDispute ? 'Send dispute' : 'Send report'}
        </button>
      </div>
    </form>
  )
}
