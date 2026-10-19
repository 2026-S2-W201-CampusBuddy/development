import { useState, useEffect, useCallback } from 'react'
import {
  getPeerReviewOptions,
  getPeerReviewMyScore,
  setPeerReviewScoreVisibility,
  createPeerReviewReport,
} from '../api'

// The Peer Review safeguards: the preset options, the person's own score,
// the show-my-score switch (only used when scores are opt-in), and filing a
// dispute or report. Kept separate from usePeerReview so that file is untouched.
export default function usePeerScore(username, isOpen) {
  const [options, setOptions] = useState(null)
  const [myScore, setMyScore] = useState(null)
  const [scoreLoading, setScoreLoading] = useState(false)
  const [scoreError, setScoreError] = useState('')

  // The presets and rules rarely change, so fetch them once per open
  useEffect(() => {
    if (!isOpen) return
    getPeerReviewOptions()
      .then((json) => setOptions(json.data))
      .catch(() => {})
  }, [isOpen])

  const loadMyScore = useCallback(() => {
    if (!username) return
    setScoreLoading(true)
    setScoreError('')
    getPeerReviewMyScore(username)
      .then((json) => setMyScore(json.data))
      .catch((err) => setScoreError(err.message || 'Could not load your score'))
      .finally(() => setScoreLoading(false))
  }, [username])

  // The switch flips instantly; if saving fails we reload the real value so it springs back
  const setVisibility = useCallback(
    async (show) => {
      setScoreError('')
      setMyScore((prev) => (prev ? { ...prev, optedIn: show } : prev))
      try {
        await setPeerReviewScoreVisibility(username, show)
      } catch (err) {
        setScoreError(err.message || 'Could not save that')
      }
      loadMyScore()
    },
    [username, loadMyScore]
  )

  // Returns { ok, message } so the form can show what happened
  const fileReport = useCallback(
    async (payload) => {
      try {
        const json = await createPeerReviewReport(username, payload)
        return { ok: true, message: json.message }
      } catch (err) {
        return { ok: false, message: err.message || 'Could not send that' }
      }
    },
    [username]
  )

  return { options, myScore, scoreLoading, scoreError, loadMyScore, setVisibility, fileReport }
}
