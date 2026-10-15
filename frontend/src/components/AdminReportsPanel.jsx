import { useState, useEffect, useCallback } from 'react'
import { getAdminReports, getAdminReportDetail, resolveAdminReport } from '../api'
import './PeerReviewExtras.css'

const HOUR = 3600000

// "31h 12m left" / "Overdue by 5h 10m"
function timeLeft(dueIso, now) {
  const ms = new Date(dueIso).getTime() - now
  const abs = Math.abs(ms)
  const hours = Math.floor(abs / HOUR)
  const minutes = Math.floor((abs % HOUR) / 60000)
  const span = hours >= 1 ? `${hours}h ${String(minutes).padStart(2, '0')}m` : `${minutes}m`
  return ms > 0 ? `${span} left` : `Overdue by ${span}`
}

// Same thresholds as the server (overdue at 0, urgent under 6 hours)
function deadlineState(dueIso, now) {
  const hours = (new Date(dueIso).getTime() - now) / HOUR
  return hours <= 0 ? 'overdue' : hours < 6 ? 'urgent' : 'ok'
}

const when = (iso) => new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })

export default function AdminReportsPanel({ username, onCountsChange }) {
  const [reports, setReports] = useState([])
  const [counts, setCounts] = useState({ open: 0, overdue: 0, urgent: 0 })
  const [hours, setHours] = useState(48)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => Date.now())

  const [openId, setOpenId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [removeIds, setRemoveIds] = useState([])
  const [note, setNote] = useState('')
  const [confirmUphold, setConfirmUphold] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null) // { type, text }

  const load = useCallback(
    (silent = false) => {
      if (!silent) setLoading(true)
      getAdminReports(username)
        .then((json) => {
          setReports(json.data.reports)
          setCounts(json.data.counts)
          setHours(json.data.responseHours)
          setError('')
          onCountsChange?.(json.data.counts)
        })
        .catch((err) => setError(err.message || 'Could not load reports'))
        .finally(() => setLoading(false))
    },
    [username, onCountsChange]
  )

  // Load now, pick up new disputes every minute, and keep the countdowns ticking
  useEffect(() => {
    load()
    const refresh = setInterval(() => load(true), 60000)
    const tick = setInterval(() => setNow(Date.now()), 30000)
    return () => {
      clearInterval(refresh)
      clearInterval(tick)
    }
  }, [load])

  const closeCard = () => {
    setOpenId(null)
    setDetail(null)
    setRemoveIds([])
    setNote('')
    setConfirmUphold(false)
  }

  const openCard = (reportId) => {
    if (openId === reportId) return closeCard()
    closeCard()
    setOpenId(reportId)
    setMessage(null)
    setDetailLoading(true)
    getAdminReportDetail(username, reportId)
      .then((json) => setDetail(json.data))
      .catch((err) => setMessage({ type: 'error', text: err.message || 'Could not load the details' }))
      .finally(() => setDetailLoading(false))
  }

  const toggleRemove = (ratingId) => {
    setConfirmUphold(false)
    setRemoveIds((ids) => (ids.includes(ratingId) ? ids.filter((i) => i !== ratingId) : [...ids, ratingId]))
  }

  const resolve = async (reportId, outcome) => {
    setBusy(true)
    setMessage(null)
    try {
      await resolveAdminReport(username, reportId, { outcome, note, removeRatingIds: outcome === 'upheld' ? removeIds : [] })
      closeCard()
      setMessage({ type: 'success', text: 'Resolved and recorded.' })
      load(true)
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Could not resolve that' })
    } finally {
      setBusy(false)
    }
  }

  const openReports = reports.filter((r) => r.status === 'open')
  const doneReports = reports.filter((r) => r.status !== 'open')

  if (loading) return <p className="weatherStatusText">Loading reports...</p>
  if (error) return <p className="weatherStatusText">{error}</p>

  return (
    <div className="prPanel">
      <div className="adminReportsSummary">
        <span className="adminCountChip">{counts.open} open</span>
        {counts.overdue > 0 && <span className="adminCountChip overdue">{counts.overdue} overdue</span>}
        {counts.urgent > 0 && <span className="adminCountChip urgent">{counts.urgent} due within 6h</span>}
        <span className="adminCountChip">Target: reply within {hours}h</span>
      </div>

      {message && <p className={message.type === 'error' ? 'formError' : 'weatherStatusText'}>{message.text}</p>}

      {openReports.length === 0 && (
        <p className="weatherStatusText">Nothing waiting. New disputes and reports appear here with a {hours}-hour deadline.</p>
      )}

      {openReports.map((report) => {
        const state = deadlineState(report.dueAt, now)
        const isOpen = openId === report.reportId
        return (
          <div key={report.reportId} className={`adminReportCard ${state}`}>
            <div className="adminReportHeader">
              <div>
                <span className={`adminKindBadge ${report.kind}`}>{report.kind === 'dispute' ? 'Dispute' : 'Report'}</span>
                {report.kind === 'dispute'
                  ? <strong>{report.subject}</strong>
                  : <><strong>{report.reporter}</strong> → <strong>{report.subject}</strong></>}
                <div className="prReportMeta">{report.reasonLabel} · filed {when(report.createdAt)}</div>
              </div>
              <span className={`adminDeadline ${state}`} title={`Due ${when(report.dueAt)}`}>{timeLeft(report.dueAt, now)}</span>
            </div>

            {report.details && <div className="adminReportDetails">“{report.details}”</div>}

            <button className="btnGlass prSmallBtn" onClick={() => openCard(report.reportId)}>
              {isOpen ? 'Close' : 'Review'}
            </button>

            {isOpen && (
              <>
                {detailLoading && <p className="weatherStatusText">Loading ratings...</p>}
                {detail && (
                  <>
                    <div className="adminEvidence">
                      <div className="prSectionTitle">Ratings {report.subject} has received ({detail.ratings.length})</div>
                      {detail.ratings.length === 0 && <p className="prReportMeta">No ratings.</p>}
                      {detail.ratings.map((r) => (
                        <label key={r.ratingId} className={`adminEvidenceRow ${removeIds.includes(r.ratingId) ? 'selected' : ''}`}>
                          <input type="checkbox" checked={removeIds.includes(r.ratingId)} onChange={() => toggleRemove(r.ratingId)} />
                          <div>
                            <div>
                              <strong>{r.rater}</strong> · {r.groupName}
                              <span className={`adminCountsBadge ${r.countsTowardScore ? '' : 'waiting'}`}>
                                {r.countsTowardScore ? 'counts toward score' : 'not counted yet'}
                              </span>
                            </div>
                            <div className="prReportMeta">
                              Doc {r.documentationRating}★ · Product {r.productRating}★ · Attendance {r.attendanceRating}★ · Overall {r.overallRating}★
                            </div>
                            {r.behaviourTags.length > 0 && (
                              <div className="prTagChips">{r.behaviourTags.map((t) => <span key={t} className="prTagChip">{t}</span>)}</div>
                            )}
                            {r.note && <div className="adminReportDetails">“{r.note}”</div>}
                            <div className="prReportMeta">Last changed {when(r.updatedAt)}</div>
                          </div>
                        </label>
                      ))}
                    </div>

                    <div className="adminDecision">
                      <textarea
                        className="liquidInput"
                        placeholder="Record your reasoning (required) — kept in the admin record, not shown to the student"
                        maxLength={500}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                      <div className="adminDecisionButtons">
                        <button
                          className="btnGlass"
                          disabled={busy || note.trim().length < 3 || removeIds.length > 0}
                          title={removeIds.length > 0 ? 'Untick the ratings to dismiss instead' : ''}
                          onClick={() => resolve(report.reportId, 'dismissed')}
                        >
                          Dismiss — score stands
                        </button>

                        {removeIds.length > 0 && confirmUphold ? (
                          <>
                            <button className="btnGlass" disabled={busy} onClick={() => setConfirmUphold(false)}>Cancel</button>
                            <button
                              className="btnGlass adminDangerBtn"
                              disabled={busy || note.trim().length < 3}
                              onClick={() => resolve(report.reportId, 'upheld')}
                            >
                              Yes — permanently remove {removeIds.length} rating{removeIds.length === 1 ? '' : 's'}
                            </button>
                          </>
                        ) : (
                          <button
                            className="btnGlass btnPrimary"
                            disabled={busy || note.trim().length < 3}
                            onClick={() => (removeIds.length > 0 ? setConfirmUphold(true) : resolve(report.reportId, 'upheld'))}
                          >
                            {removeIds.length > 0 ? `Uphold & remove ${removeIds.length} rating${removeIds.length === 1 ? '' : 's'}` : 'Uphold'}
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )
      })}

      {doneReports.length > 0 && <div className="prSectionTitle">Recently resolved</div>}
      {doneReports.map((report) => (
        <div key={report.reportId} className="adminReportCard">
          <div className="adminReportHeader">
            <div>
              <span className={`adminKindBadge ${report.kind}`}>{report.kind === 'dispute' ? 'Dispute' : 'Report'}</span>
              {report.kind === 'dispute'
                ? <strong>{report.subject}</strong>
                : <><strong>{report.reporter}</strong> → <strong>{report.subject}</strong></>}
              <div className="prReportMeta">{report.reasonLabel} · filed {when(report.createdAt)}</div>
            </div>
            <span className={`prReportStatus prReportStatus-${report.status}`}>{report.status}</span>
          </div>
          <div className="prReportMeta">
            Resolved {when(report.resolvedAt)} by {report.resolvedBy}
            {report.ratingsRemoved > 0 && ` · ${report.ratingsRemoved} rating${report.ratingsRemoved === 1 ? '' : 's'} removed`}
          </div>
          {report.resolutionNote && <div className="adminReportDetails">“{report.resolutionNote}”</div>}
        </div>
      ))}
    </div>
  )
}
