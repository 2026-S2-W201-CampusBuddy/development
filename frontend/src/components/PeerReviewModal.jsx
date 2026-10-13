import { useState } from 'react'
import usePeerReview from '../hooks/usePeerReview'
import TermsContent from './TermsContent'
import './PeerReviewModal.css'

const CATEGORIES = [
  { key: 'documentation', label: 'Documentation', hint: 'Trello board, diagrams, presentation' },
  { key: 'product', label: 'Product', hint: 'Code, GitHub, user stories, assets' },
  { key: 'attendance', label: 'Attendance', hint: 'At meetings, on time' },
  { key: 'overall', label: 'Overall', hint: "This one shapes their public score" },
]

function StarPicker({ value, onChange }) {
  return (
    <div className="prStarRow">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`prStarBtn ${n <= value ? 'prStarBtnActive' : ''}`}
          onClick={() => onChange(n)}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export default function PeerReviewModal({ isOpen, onClose, currentUser }) {
  const username = currentUser?.username || (typeof currentUser === 'string' ? currentUser : '')
  const {
    myGroups, myInvites, myRatingsGiven, loading, error, actionError,
    termsNeeded, acceptTerms,
    createGroup, inviteMember, respondToInvite, submitRating,
    lookupUsername, setLookupUsername, lookupResult, lookupLoading, lookupError, lookupScore,
  } = usePeerReview(username, isOpen)

  const [tab, setTab] = useState('groups')
  const [termsTicked, setTermsTicked] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [inviteInputs, setInviteInputs] = useState({}) // groupId -> username being typed

  const [rateGroupId, setRateGroupId] = useState(null)
  const [rateTarget, setRateTarget] = useState(null)
  const [scores, setScores] = useState({
    documentation_rating: 0, documentation_comment: '',
    product_rating: 0, product_comment: '',
    attendance_rating: 0, attendance_comment: '',
    overall_rating: 0, overall_comment: '',
  })
  const [rateSubmitting, setRateSubmitting] = useState(false)
  const [rateSuccess, setRateSuccess] = useState(false)

  if (!isOpen) return null

  // Anyone who hasn't accepted the CURRENT terms (e.g. accounts created
  // before Peer Review existed) must do so before using it.
  if (termsNeeded) {
    return (
      <div className="modalBackdrop" onClick={onClose}>
        <div className="modalDialog peerReviewDialog" onClick={(e) => e.stopPropagation()}>
          <button className="modalCloseBtn" onClick={onClose}>✕</button>

          <div className="modalHeader">
            <h2 className="modalHeading">Updated Terms</h2>
            <p className="modalCaption">Please read and accept these before using Peer Review</p>
          </div>

          <TermsContent />

          <label className="termsCheckboxRow prTermsCheckbox">
            <input
              type="checkbox"
              checked={termsTicked}
              onChange={(e) => setTermsTicked(e.target.checked)}
            />
            <span>I have read and agree to the Terms and Conditions</span>
          </label>

          {actionError && <p className="formError">{actionError}</p>}

          <button
            className="btnGlass btnPrimary btnFullWidth"
            disabled={!termsTicked}
            onClick={acceptTerms}
          >
            Accept and continue
          </button>
        </div>
      </div>
    )
  }

  const handleCreateGroup = async (e) => {
    e.preventDefault()
    if (!newGroupName.trim()) return
    const ok = await createGroup(newGroupName)
    if (ok) setNewGroupName('')
  }

  const handleInvite = async (groupId) => {
    const invitee = (inviteInputs[groupId] || '').trim()
    if (!invitee) return
    const ok = await inviteMember(groupId, invitee)
    if (ok) setInviteInputs((prev) => ({ ...prev, [groupId]: '' }))
  }

  const openRateForm = (groupId, memberUsername) => {
    setRateGroupId(groupId)
    setRateTarget(memberUsername)
    setRateSuccess(false)
    setScores({
      documentation_rating: 0, documentation_comment: '',
      product_rating: 0, product_comment: '',
      attendance_rating: 0, attendance_comment: '',
      overall_rating: 0, overall_comment: '',
    })
    setTab('rate')
  }

  const handleSubmitRating = async (e) => {
    e.preventDefault()
    const incomplete = CATEGORIES.some((c) => scores[`${c.key}_rating`] < 1)
    if (incomplete) return

    setRateSubmitting(true)
    const ok = await submitRating(rateGroupId, rateTarget, scores)
    setRateSubmitting(false)
    if (ok) setRateSuccess(true)
  }

  const handleLookupSubmit = (e) => {
    e.preventDefault()
    lookupScore(lookupUsername)
  }

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modalDialog peerReviewDialog" onClick={(e) => e.stopPropagation()}>
        <button className="modalCloseBtn" onClick={onClose}>✕</button>

        <div className="modalHeader">
          <h2 className="modalHeading">Peer Review</h2>
          <p className="modalCaption">Rate your group, privately — only an overall score is ever public</p>
        </div>

        <div className="prTabRow">
          <button className={`prTab ${tab === 'groups' ? 'prTabActive' : ''}`} onClick={() => setTab('groups')}>
            My Groups
          </button>
          <button className={`prTab ${tab === 'invites' ? 'prTabActive' : ''}`} onClick={() => setTab('invites')}>
            Invites{myInvites.length > 0 ? ` (${myInvites.length})` : ''}
          </button>
          <button className={`prTab ${tab === 'mine' ? 'prTabActive' : ''}`} onClick={() => setTab('mine')}>
            My Ratings
          </button>
          <button className={`prTab ${tab === 'lookup' ? 'prTabActive' : ''}`} onClick={() => setTab('lookup')}>
            Look Up
          </button>
        </div>

        {actionError && <p className="formError">{actionError}</p>}

        {tab === 'groups' && (
          <div className="prPanel">
            <form className="prCreateGroupRow" onSubmit={handleCreateGroup}>
              <input
                type="text"
                className="liquidInput"
                placeholder="New group name (e.g. COMP101 Assignment 2)"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <button type="submit" className="btnGlass btnPrimary">Create</button>
            </form>

            {loading && <p className="weatherStatusText">Loading your groups...</p>}
            {!loading && error && <p className="weatherStatusText">{error}</p>}
            {!loading && !error && myGroups.length === 0 && (
              <p className="weatherStatusText">You're not in any groups yet — create one above.</p>
            )}

            {myGroups.map((group) => (
              <div key={group.groupId} className="prGroupCard">
                <div className="prGroupName">{group.groupName}</div>
                <div className="prMemberList">
                  {group.members.map((m) => (
                    <div key={m.username} className="prMemberRow">
                      <span className="prMemberName">
                        {m.username}
                        {m.username === username && ' (you)'}
                        <span className={`prStatusBadge prStatusBadge-${m.status}`}>{m.status}</span>
                      </span>
                      {m.username !== username && (
                        <button className="btnGlass prSmallBtn" onClick={() => openRateForm(group.groupId, m.username)}>
                          Rate
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="prInviteRow">
                  <input
                    type="text"
                    className="liquidInput prInviteInput"
                    placeholder="Add teammate by username"
                    value={inviteInputs[group.groupId] || ''}
                    onChange={(e) => setInviteInputs((prev) => ({ ...prev, [group.groupId]: e.target.value }))}
                  />
                  <button className="btnGlass prSmallBtn" onClick={() => handleInvite(group.groupId)}>
                    Invite
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'invites' && (
          <div className="prPanel">
            {myInvites.length === 0 && <p className="weatherStatusText">No pending invites.</p>}
            {myInvites.map((inv) => (
              <div key={inv.membershipId} className="prInviteCard">
                <div>
                  <strong>{inv.invitedBy}</strong> says you worked together in
                  <div className="prInviteGroupName">"{inv.groupName}"</div>
                </div>
                <div className="prInviteActions">
                  <button
                    className="btnGlass btnPrimary prSmallBtn"
                    onClick={() => respondToInvite(inv.membershipId, 'accept')}
                  >
                    Confirm
                  </button>
                  <button
                    className="btnGlass prSmallBtn"
                    onClick={() => respondToInvite(inv.membershipId, 'decline')}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'rate' && rateGroupId && (
          <div className="prPanel">
            <p className="prRatingSubject">Rating <strong>{rateTarget}</strong></p>

            {rateSuccess ? (
              <div className="prSuccessBox">
                <p>Rating submitted. Only you can see what you wrote.</p>
                <button className="btnGlass btnFullWidth" onClick={() => setTab('groups')}>
                  Back to groups
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitRating}>
                {CATEGORIES.map((cat) => (
                  <div key={cat.key} className="prCategoryBlock">
                    <div className="prCategoryLabelRow">
                      <span className="prCategoryLabel">{cat.label}</span>
                      <span className="prCategoryHint">{cat.hint}</span>
                    </div>
                    <StarPicker
                      value={scores[`${cat.key}_rating`]}
                      onChange={(n) => setScores((prev) => ({ ...prev, [`${cat.key}_rating`]: n }))}
                    />
                    <textarea
                      className="liquidInput prCommentBox"
                      placeholder="Optional comment..."
                      value={scores[`${cat.key}_comment`]}
                      onChange={(e) => setScores((prev) => ({ ...prev, [`${cat.key}_comment`]: e.target.value }))}
                    />
                  </div>
                ))}

                <button type="submit" className="btnGlass btnPrimary btnFullWidth" disabled={rateSubmitting}>
                  {rateSubmitting ? 'Submitting...' : 'Submit Rating'}
                </button>
              </form>
            )}
          </div>
        )}

        {tab === 'mine' && (
          <div className="prPanel">
            {myRatingsGiven.length === 0 && (
              <p className="weatherStatusText">You haven't rated anyone yet.</p>
            )}
            {myRatingsGiven.map((r) => (
              <div key={r.ratingId} className="prMyRatingCard">
                <div className="prMyRatingHeader">
                  <strong>{r.ratedUsername}</strong>
                  <span className="prMyRatingGroup">{r.groupName}</span>
                </div>
                <div className="prMyRatingGrid">
                  <span>Documentation: {r.documentationRating}★</span>
                  <span>Product: {r.productRating}★</span>
                  <span>Attendance: {r.attendanceRating}★</span>
                  <span>Overall: {r.overallRating}★</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'lookup' && (
          <div className="prPanel">
            <form className="prLookupRow" onSubmit={handleLookupSubmit}>
              <input
                type="text"
                className="liquidInput"
                placeholder="Search a username..."
                value={lookupUsername}
                onChange={(e) => setLookupUsername(e.target.value)}
              />
              <button type="submit" className="btnGlass btnPrimary">Search</button>
            </form>

            {lookupLoading && <p className="weatherStatusText">Searching...</p>}
            {lookupError && <p className="weatherStatusText">{lookupError}</p>}

            {lookupResult && !lookupLoading && (
              <div className="prScoreCard">
                <div className="prScoreUsername">{lookupResult.username}</div>
                {lookupResult.meetsThreshold ? (
                  <>
                    <div className="prScoreNumber">{lookupResult.overallScore} / 5</div>
                    <div className="prScoreSubtext">Based on {lookupResult.raterCount} confirmed group members</div>
                  </>
                ) : (
                  <div className="prScoreSubtext">
                    Not enough ratings yet ({lookupResult.raterCount}/3 needed)
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
