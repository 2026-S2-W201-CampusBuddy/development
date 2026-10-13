import { useState, useEffect, useCallback } from 'react'
import {
  createPeerReviewGroup,
  invitePeerReviewMember,
  respondToPeerReviewInvite,
  submitPeerReviewRating,
  getMyPeerReviewGroups,
  getMyPeerReviewInvites,
  getMyPeerReviewRatingsGiven,
  getPeerReviewPublicScore,
  getTermsStatus,
  acceptTerms as acceptTermsRequest,
} from '../api'
import { TERMS_VERSION } from '../termsVersion'

export default function usePeerReview(currentUsername, isOpen) {
  const [myGroups, setMyGroups] = useState([])
  const [myInvites, setMyInvites] = useState([])
  const [myRatingsGiven, setMyRatingsGiven] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [termsNeeded, setTermsNeeded] = useState(false)

  const [lookupUsername, setLookupUsername] = useState('')
  const [lookupResult, setLookupResult] = useState(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState('')

  const refresh = useCallback(() => {
    if (!currentUsername) return
    setLoading(true)
    setError('')
    Promise.all([
      getMyPeerReviewGroups(currentUsername),
      getMyPeerReviewInvites(currentUsername),
      getMyPeerReviewRatingsGiven(currentUsername),
    ])
      .then(([groupsJson, invitesJson, ratingsJson]) => {
        setMyGroups(groupsJson.data.groups)
        setMyInvites(invitesJson.data.invites)
        setMyRatingsGiven(ratingsJson.data.ratings)
      })
      .catch((err) => setError(err.message || 'Could not load Peer Review data'))
      .finally(() => setLoading(false))
  }, [currentUsername])

  // Runs each time the modal opens (so invites are always fresh) — and not
  // at all for users who never open Peer Review. Terms are checked first:
  // anyone who hasn't accepted the current version sees the acceptance
  // screen instead of a wall of "please accept the terms" errors.
  useEffect(() => {
    if (!isOpen || !currentUsername) return
    getTermsStatus(currentUsername)
      .then((json) => {
        if (json.data.needsAcceptance) {
          setTermsNeeded(true)
          setLoading(false)
        } else {
          setTermsNeeded(false)
          refresh()
        }
      })
      .catch((err) => {
        setError(err.message || 'Could not load Peer Review data')
        setLoading(false)
      })
  }, [isOpen, currentUsername, refresh])

  const acceptTerms = useCallback(async () => {
    setActionError('')
    try {
      await acceptTermsRequest(currentUsername, TERMS_VERSION)
      setTermsNeeded(false)
      refresh()
      return true
    } catch (err) {
      setActionError(err.message || 'Could not accept the terms')
      return false
    }
  }, [currentUsername, refresh])

  const createGroup = useCallback(async (groupName) => {
    setActionError('')
    try {
      await createPeerReviewGroup(currentUsername, groupName)
      refresh()
      return true
    } catch (err) {
      setActionError(err.message || 'Could not create group')
      return false
    }
  }, [currentUsername, refresh])

  const inviteMember = useCallback(async (groupId, inviteeUsername) => {
    setActionError('')
    try {
      await invitePeerReviewMember(currentUsername, groupId, inviteeUsername)
      refresh()
      return true
    } catch (err) {
      setActionError(err.message || 'Could not send invite')
      return false
    }
  }, [currentUsername, refresh])

  const respondToInvite = useCallback(async (membershipId, action) => {
    setActionError('')
    try {
      await respondToPeerReviewInvite(membershipId, currentUsername, action)
      refresh()
      return true
    } catch (err) {
      setActionError(err.message || 'Could not respond to invite')
      return false
    }
  }, [currentUsername, refresh])

  const submitRating = useCallback(async (groupId, ratedUsername, scores) => {
    setActionError('')
    try {
      await submitPeerReviewRating(currentUsername, groupId, ratedUsername, scores)
      refresh()
      return true
    } catch (err) {
      setActionError(err.message || 'Could not submit rating')
      return false
    }
  }, [currentUsername, refresh])

  const lookupScore = useCallback((username) => {
    const term = username.trim()
    if (!term) {
      setLookupResult(null)
      return
    }
    setLookupLoading(true)
    setLookupError('')
    getPeerReviewPublicScore(term)
      .then((json) => setLookupResult(json.data))
      .catch((err) => {
        setLookupError(err.message || 'Could not find that user')
        setLookupResult(null)
      })
      .finally(() => setLookupLoading(false))
  }, [])

  return {
    myGroups,
    myInvites,
    myRatingsGiven,
    loading,
    error,
    actionError,
    termsNeeded,
    acceptTerms,
    createGroup,
    inviteMember,
    respondToInvite,
    submitRating,
    refresh,
    lookupUsername,
    setLookupUsername,
    lookupResult,
    lookupLoading,
    lookupError,
    lookupScore,
  }
}
