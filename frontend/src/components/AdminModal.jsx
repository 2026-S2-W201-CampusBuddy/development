import { useState, useEffect, useCallback } from 'react'
import { getAdminAllRatings, getAdminAllGroups, getAdminReports } from '../api'
import AdminReportsPanel from './AdminReportsPanel'
import './AdminModal.css'
import './PeerReviewExtras.css'

export default function AdminModal({ isOpen, onClose, currentUser }) {
  const username = currentUser?.username || (typeof currentUser === 'string' ? currentUser : '')
  const [tab, setTab] = useState('reports')
  const [reportCounts, setReportCounts] = useState(null) // open / overdue / urgent disputes
  const [ratings, setRatings] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(() => {
    if (!username) return
    setLoading(true)
    setError('')
    Promise.all([getAdminAllRatings(username), getAdminAllGroups(username), getAdminReports(username)])
      .then(([ratingsJson, groupsJson, reportsJson]) => {
        setRatings(ratingsJson.data.ratings)
        setGroups(groupsJson.data.groups)
        setReportCounts(reportsJson.data.counts)
      })
      .catch((err) => setError(err.message || 'Could not load admin data — are you sure this account has admin access?'))
      .finally(() => setLoading(false))
  }, [username])

  useEffect(() => {
    if (isOpen) refresh()
  }, [isOpen, refresh])

  if (!isOpen) return null

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modalDialog adminDialog" onClick={(e) => e.stopPropagation()}>
        <button className="modalCloseBtn" onClick={onClose}>✕</button>

        <div className="modalHeader">
          <h2 className="modalHeading">Peer Review — Admin</h2>
          <p className="modalCaption">Raw, attributed data — for investigating fake or fabricated ratings</p>
        </div>

        <div className="prTabRow">
          <button className={`prTab ${tab === 'reports' ? 'prTabActive' : ''}`} onClick={() => setTab('reports')}>
            Disputes
            {reportCounts?.open > 0 && <span className="adminBadge">{reportCounts.open}</span>}
          </button>
          <button className={`prTab ${tab === 'ratings' ? 'prTabActive' : ''}`} onClick={() => setTab('ratings')}>
            All Ratings
          </button>
          <button className={`prTab ${tab === 'groups' ? 'prTabActive' : ''}`} onClick={() => setTab('groups')}>
            All Groups
          </button>
        </div>

        {loading && <p className="weatherStatusText">Loading...</p>}
        {!loading && error && <p className="weatherStatusText">{error}</p>}

        {!loading && !error && tab === 'reports' && (
          <AdminReportsPanel username={username} onCountsChange={setReportCounts} />
        )}

        {!loading && !error && tab === 'ratings' && (
          <div className="prPanel">
            {ratings.length === 0 && <p className="weatherStatusText">No ratings submitted yet.</p>}
            {ratings.map((r) => (
              <div key={r.ratingId} className={`adminRatingCard ${r.flaggedSubmittedQuickly ? 'adminFlagged' : ''}`}>
                <div className="adminRatingHeader">
                  <span><strong>{r.rater}</strong> → <strong>{r.rated}</strong></span>
                  <span className="adminGroupTag">{r.groupName}</span>
                </div>
                {r.flaggedSubmittedQuickly && (
                  <div className="adminFlagNote">⚠ Submitted within 60s of group creation</div>
                )}
                <div className="prMyRatingGrid">
                  <span>Documentation: {r.documentationRating}★</span>
                  <span>Product: {r.productRating}★</span>
                  <span>Attendance: {r.attendanceRating}★</span>
                  <span>Overall: {r.overallRating}★</span>
                </div>
                {r.behaviourTags?.length > 0 && (
                  <div className="prTagChips">
                    {r.behaviourTags.map((t) => <span key={t} className="prTagChip">{t}</span>)}
                  </div>
                )}
                {(r.documentationComment || r.productComment || r.attendanceComment || r.overallComment) && (
                  <div className="adminComments">
                    {r.documentationComment && <p><em>Documentation:</em> {r.documentationComment}</p>}
                    {r.productComment && <p><em>Product:</em> {r.productComment}</p>}
                    {r.attendanceComment && <p><em>Attendance:</em> {r.attendanceComment}</p>}
                    {r.overallComment && <p><em>Overall:</em> {r.overallComment}</p>}
                  </div>
                )}
                <div className="adminTimestamp">{new Date(r.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && tab === 'groups' && (
          <div className="prPanel">
            {groups.length === 0 && <p className="weatherStatusText">No groups created yet.</p>}
            {groups.map((g) => (
              <div key={g.groupId} className={`adminRatingCard ${g.flaggedProlificCreator ? 'adminFlagged' : ''}`}>
                <div className="adminRatingHeader">
                  <span><strong>{g.groupName}</strong></span>
                  <span className="adminGroupTag">by {g.creator}</span>
                </div>
                {g.flaggedProlificCreator && (
                  <div className="adminFlagNote">⚠ Creator has made an unusual number of groups in 24h</div>
                )}
                <div className="prMemberList">
                  {g.members.map((m) => (
                    <div key={m.username} className="prMemberRow">
                      <span className="prMemberName">
                        {m.username}
                        <span className={`prStatusBadge prStatusBadge-${m.status}`}>{m.status}</span>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="adminTimestamp">Created {new Date(g.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
