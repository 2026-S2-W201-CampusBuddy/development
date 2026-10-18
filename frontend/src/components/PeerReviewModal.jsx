import { useState } from 'react'
import usePeerReview from '../hooks/usePeerReview'
import TermsContent from './TermsContent'
import PeerReviewReportForm from './PeerReviewReportForm'
import usePeerScore from '../hooks/usePeerScore'
import './PeerReviewModal.css'
import './PeerReviewExtras.css'

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

const REPORT_STATUS_LABEL = { open: 'Open', upheld: 'Upheld', dismissed: 'No change' }

function formatWhen(iso) {
  return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

// The score itself, explained in words that match whichever rule-set is live
// (the server tells us in `policy`). In the full safeguards it never shows an
// exact rating count; in the demo profile it says "Average of N ratings".
function ScoreBody({ view, isSelf = false }) {
  const policy = view.policy || {}
  const delay = policy.delayDays ?? 0
  const minRaters = policy.minRaters ?? 3
  const minGroups = policy.minGroups ?? 1

  if (!isSelf && !view.scoreVisible) {
    return <div className="prScoreSubtext">This student hasn't chosen to show their score.</div>
  }
  if (view.meetsThreshold) {
    const basis = view.ratingCount
      ? `Average of ${view.ratingCount} rating${view.ratingCount === 1 ? '' : 's'}`
      : `Based on ratings from ${view.raterCountLabel} group members${minGroups > 1 ? ' across different groups' : ''}`
    return (
      <>
        <div className="prScoreNumber">{Number(view.overallScore).toFixed(1)} / 5</div>
        <div className="prScoreSubtext">
          {basis}.
          {delay > 0 ? ` New ratings take ${delay} days to count.` : ''}
          {(policy.roundingStep ?? 0) >= 0.5 ? ' Scores are rounded to the nearest half point.' : ''}
        </div>
      </>
    )
  }
  return (
    <div className="prScoreSubtext">
      {isSelf ? "You don't have a public score yet." : 'No public score yet.'} One appears once at least {minRaters} group
      members{minGroups > 1 ? `, across ${minGroups} different groups,` : ''} have rated {isSelf ? 'you' : 'them'}
      {delay > 0 ? ` and each rating is ${delay} days old` : ''}.
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
  const { options, myScore, scoreLoading, scoreError, loadMyScore, setVisibility, fileReport } = usePeerScore(username, isOpen)

  const [tab, setTab] = useState('groups')
  const [termsTicked, setTermsTicked] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [inviteInputs, setInviteInputs] = useState({}) // groupId -> username being typed

  const [rateGroupId, setRateGroupId] = useState(null)
  const [rateTarget, setRateTarget] = useState(null)
  const emptyScores = () => ({
    documentation_rating: 0,
    product_rating: 0,
    attendance_rating: 0,
    overall_rating: 0,
    behaviour_tags: [],
    overall_comment: '', // the one short optional note — admins only
  })
  const [scores, setScores] = useState(emptyScores)
  const [reportDraft, setReportDraft] = useState(null) // { kind: 'dispute' | 'report', subject }
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
    setScores(emptyScores())
    setTab('rate')
  }

  // Ticking a behaviour un-ticks its opposite (you can't have both met AND missed deadlines)
  const toggleTag = (code) => {
    setScores((prev) => {
      if (prev.behaviour_tags.includes(code)) {
        return { ...prev, behaviour_tags: prev.behaviour_tags.filter((t) => t !== code) }
      }
      const opposites = (options?.conflicts || [])
        .filter((pair) => pair.includes(code))
        .map((pair) => pair.find((t) => t !== code))
      return { ...prev, behaviour_tags: [...prev.behaviour_tags.filter((t) => !opposites.includes(t)), code] }
    })
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
          <button className={`prTab ${tab === 'score' ? 'prTabActive' : ''}`} onClick={() => { setTab('score'); loadMyScore() }}>
            My Score
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
                <p>Rating submitted. The person you rated can't see it — only you and CampusBuddy admins can. It counts towards their public score after {options?.policy?.delayDays ?? 7} days.</p>
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
                  </div>
                ))}

                <div className="prCategoryBlock">
                  <div className="prCategoryLabelRow">
                    <span className="prCategoryLabel">Behaviours</span>
                    <span className="prCategoryHint">Tick any that apply (optional)</span>
                  </div>
                  {[{ title: 'Went well', positive: true }, { title: 'Could improve', positive: false }].map((group) => (
                    <div key={group.title} className="prTagGroup">
                      <div className="prTagGroupTitle">{group.title}</div>
                      <div className="prTagList">
                        {(options?.tags || []).filter((t) => t.positive === group.positive).map((t) => {
                          const on = scores.behaviour_tags.includes(t.code)
                          return (
                            <label key={t.code} className={`prTagPill ${on ? `prTagPillOn ${group.positive ? 'prTagPositive' : 'prTagNegative'}` : ''}`}>
                              <input type="checkbox" checked={on} onChange={() => toggleTag(t.code)} />
                              {t.label}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  {!options && <p className="prAdminOnlyNote">Loading options…</p>}
                </div>

                <div className="prCategoryBlock">
                  <div className="prCategoryLabelRow">
                    <span className="prCategoryLabel">Short note</span>
                    <span className="prCategoryHint">Optional</span>
                  </div>
                  <p className="prAdminOnlyNote">
                    Only CampusBuddy admins can read this — never the person you're rating. Keep it factual.
                  </p>
                  <textarea
                    className="liquidInput prNoteBox"
                    placeholder="e.g. Missed the last two team meetings"
                    maxLength={options?.noteMaxLength || 300}
                    value={scores.overall_comment}
                    onChange={(e) => setScores((prev) => ({ ...prev, overall_comment: e.target.value }))}
                  />
                  <div className="prCharCount">{scores.overall_comment.length}/{options?.noteMaxLength || 300}</div>
                </div>

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
                {r.behaviourTags?.length > 0 && (
                  <div className="prTagChips">
                    {r.behaviourTags.map((t) => <span key={t.code} className="prTagChip">{t.label}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'score' && (
          <div className="prPanel">
            {scoreLoading && !myScore && <p className="weatherStatusText">Loading your score...</p>}
            {scoreError && <p className="weatherStatusText">{scoreError}</p>}

            {myScore && (
              <>
                <div className="prScoreCard">
                  <div className="prScoreUsername">Your score</div>
                  {myScore.underReview && <div className="prUnderReview">⚖️ Under review</div>}
                  <ScoreBody view={myScore} isSelf />
                </div>

                {myScore.displayMode === 'opt_in' && (
                  <label className="prToggleRow">
                    <input type="checkbox" checked={myScore.optedIn} onChange={(e) => setVisibility(e.target.checked)} />
                    <span>
                      Show my score to other CampusBuddy students
                      <span className="prReportMeta"> — {myScore.optedIn ? 'it is visible when someone looks you up.' : 'right now only you can see it.'}</span>
                    </span>
                  </label>
                )}

                <div className="prDisputeBox">
                  <div>
                    <strong>Think your score is unfair?</strong>
                    <div>An admin reviews every dispute within {myScore.policy.responseHours} hours.</div>
                    {!myScore.canDispute && <div className="prReportMeta">You already have a dispute open.</div>}
                  </div>
                  <button
                    className="btnGlass"
                    disabled={!myScore.canDispute}
                    onClick={() => { setReportDraft({ kind: 'dispute', subject: username }); setTab('report') }}
                  >
                    Dispute my score
                  </button>
                </div>

                {myScore.reports.length > 0 && <div className="prSectionTitle">Your disputes and reports</div>}
                {myScore.reports.map((r) => (
                  <div key={r.reportId} className="prReportItem">
                    <div className="prReportItemHeader">
                      <span>{r.kind === 'dispute' ? 'Dispute of my score' : `Report about ${r.subject}`}</span>
                      <span className={`prReportStatus prReportStatus-${r.status}`}>{REPORT_STATUS_LABEL[r.status]}</span>
                    </div>
                    <div className="prReportMeta">{r.reasonLabel} · filed {formatWhen(r.createdAt)}</div>
                    <div className="prReportMeta">
                      {r.status === 'open' && `An admin will respond by ${formatWhen(r.dueAt)}.`}
                      {r.status === 'upheld' && `Reviewed ${formatWhen(r.resolvedAt)} — upheld${r.ratingsRemoved ? `, ${r.ratingsRemoved} rating${r.ratingsRemoved === 1 ? '' : 's'} removed` : ''}.`}
                      {r.status === 'dismissed' && `Reviewed ${formatWhen(r.resolvedAt)} — no change was made.`}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {tab === 'report' && reportDraft && (
          <div className="prPanel">
            <PeerReviewReportForm
              kind={reportDraft.kind}
              subjectUsername={reportDraft.subject}
              options={options}
              onSubmit={fileReport}
              onCancel={() => setTab(reportDraft.kind === 'dispute' ? 'score' : 'lookup')}
              onDone={() => {
                const back = reportDraft.kind === 'dispute' ? 'score' : 'lookup'
                setReportDraft(null)
                setTab(back)
                if (back === 'score') loadMyScore()
              }}
            />
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
                {lookupResult.underReview && <div className="prUnderReview">⚖️ Under review</div>}
                {lookupResult.username === username ? (
                  <div className="prScoreSubtext">That's you — open My Score to see your score and manage disputes.</div>
                ) : (
                  <ScoreBody view={lookupResult} />
                )}
                <div className="prScoreActions">
                  {lookupResult.username === username ? (
                    <button className="btnGlass prSmallBtn" onClick={() => { setTab('score'); loadMyScore() }}>Go to My Score</button>
                  ) : (
                    <button
                      className="btnGlass prSmallBtn"
                      onClick={() => { setReportDraft({ kind: 'report', subject: lookupResult.username }); setTab('report') }}
                    >
                      Report a concern
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
