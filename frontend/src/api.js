const BASE_URL = import.meta.env.VITE_API_URL || ''

async function handleResponse(response) {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'An error occurred')
  }
  return data
}

export async function getPosts(category) {
  const url = category ? `${BASE_URL}/api/posts?category=${category}` : `${BASE_URL}/api/posts`
  const response = await fetch(url)
  return handleResponse(response)
}

export async function getPost(postId) {
  const response = await fetch(`${BASE_URL}/api/posts/${postId}`)
  return handleResponse(response)
}

export async function createPost(title, content, author, category = 'general', eventDate = null, eventLocation = null) {
  const response = await fetch(`${BASE_URL}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, author, category, event_date: eventDate, event_location: eventLocation }),
  })
  return handleResponse(response)
}

// Update post
export async function updatePost(postId, title, content, author) {
  const response = await fetch(`${BASE_URL}/api/posts/${postId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, author }),
  })
  return handleResponse(response)
}

// Delete post
export async function deletePost(postId, author) {
  const response = await fetch(`${BASE_URL}/api/posts/${postId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author }),
  })
  return handleResponse(response)
}

export async function getComments(postId) {
  const response = await fetch(`${BASE_URL}/api/posts/${postId}/comments`)
  return handleResponse(response)
}

export async function createComment(postId, content, author, parentId = null) {
  const response = await fetch(`${BASE_URL}/api/posts/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, author, parent_id: parentId }),
  })
  return handleResponse(response)
}

// Update comment
export async function updateComment(postId, commentId, content, author) {
  const response = await fetch(`${BASE_URL}/api/posts/${postId}/comments/${commentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, author }),
  })
  return handleResponse(response)
}

// Delete comment
export async function deleteComment(postId, commentId, author) {
  const response = await fetch(`${BASE_URL}/api/posts/${postId}/comments/${commentId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author }),
  })
  return handleResponse(response)
}

export async function getAucklandWeather() {
  const response = await fetch(`${BASE_URL}/api/weather/auckland`)
  return handleResponse(response)
}

export async function getWorldClockTimes(zones) {
  const zonesParam = encodeURIComponent(zones.join(','))
  const response = await fetch(`${BASE_URL}/api/worldclock?zones=${zonesParam}`)
  return handleResponse(response)
}

export async function searchWorldClockCities(query) {
  const response = await fetch(`${BASE_URL}/api/worldclock/cities?search=${encodeURIComponent(query)}`)
  return handleResponse(response)
}

export async function getRentAreas() {
  const response = await fetch(`${BASE_URL}/api/rent/areas`)
  return handleResponse(response)
}

export async function getRentForArea(areaId) {
  const response = await fetch(`${BASE_URL}/api/rent/areas/${areaId}`)
  return handleResponse(response)
}

export async function getCheapestRentAreas() {
  const response = await fetch(`${BASE_URL}/api/rent/cheapest`)
  return handleResponse(response)
}

export async function registerUser(username, email, password, agreedToTerms, termsVersion) {
  const response = await fetch(`${BASE_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password, agreedToTerms, termsVersion }),
  })
  return handleResponse(response)
}

export async function verifyEmail(email, code) {
  const response = await fetch(`${BASE_URL}/api/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  })
  return handleResponse(response)
}

export async function loginUser(email, password) {
  const response = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return handleResponse(response)
}
export async function resendCode(email) {
  const response = await fetch(`${BASE_URL}/api/resend-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  return handleResponse(response)
}
export async function changeUsername(username, currentPassword, newUsername) {
  const response = await fetch(`${BASE_URL}/api/user/username`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, current_password: currentPassword, new_username: newUsername }),
  })
  return handleResponse(response)
}

export async function changePassword(username, currentPassword, newPassword) {
  const response = await fetch(`${BASE_URL}/api/user/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, current_password: currentPassword, new_password: newPassword }),
  })
  return handleResponse(response)
}

export async function deleteAccount(username, currentPassword) {
  const response = await fetch(`${BASE_URL}/api/user/account`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, current_password: currentPassword }),
  })
  return handleResponse(response)
}

export async function updateNotifications(username, enabled) {
  const response = await fetch(`${BASE_URL}/api/user/notifications`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, enabled }),
  })
  return handleResponse(response)
}
export async function getUserLocation(username) {
  const response = await fetch(`${BASE_URL}/api/user/location/${username}`)
  return handleResponse(response)
}

export async function updateUserLocation(username, location) {
  const response = await fetch(`${BASE_URL}/api/user/location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, location }),
  })
  return handleResponse(response)
}

const FRANKFURTER_URL = 'https://api.frankfurter.dev/v1'

export async function convertCurrency(amount, fromCurrency, toCurrency) {
  const response = await fetch(`${FRANKFURTER_URL}/latest?base=${fromCurrency}&symbols=${toCurrency}`)
  if (!response.ok) {
    throw new Error('Could not fetch exchange rate')
  }
  const data = await response.json()
  const rate = data.rates[toCurrency]
  return {
    rate,
    convertedAmount: amount * rate,
    date: data.date,
  }
}

export async function getSupportedCurrencies() {
  const response = await fetch(`${FRANKFURTER_URL}/currencies`)
  if (!response.ok) {
    throw new Error('Could not fetch currency list')
  }
  return response.json()
}

export async function createPeerReviewGroup(username, groupName) {
  const response = await fetch(`${BASE_URL}/api/peer-review/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, groupName }),
  })
  return handleResponse(response)
}

export async function invitePeerReviewMember(username, groupId, inviteeUsername) {
  const response = await fetch(`${BASE_URL}/api/peer-review/groups/${groupId}/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, inviteeUsername }),
  })
  return handleResponse(response)
}

export async function respondToPeerReviewInvite(membershipId, username, action) {
  const response = await fetch(`${BASE_URL}/api/peer-review/invites/${membershipId}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, action }),
  })
  return handleResponse(response)
}

export async function submitPeerReviewRating(username, groupId, ratedUsername, scores) {
  const response = await fetch(`${BASE_URL}/api/peer-review/ratings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, groupId, ratedUsername, scores }),
  })
  return handleResponse(response)
}

export async function getMyPeerReviewGroups(username) {
  const response = await fetch(`${BASE_URL}/api/peer-review/my-groups?username=${encodeURIComponent(username)}`)
  return handleResponse(response)
}

export async function getMyPeerReviewInvites(username) {
  const response = await fetch(`${BASE_URL}/api/peer-review/my-invites?username=${encodeURIComponent(username)}`)
  return handleResponse(response)
}

export async function getMyPeerReviewRatingsGiven(username) {
  const response = await fetch(`${BASE_URL}/api/peer-review/my-ratings-given?username=${encodeURIComponent(username)}`)
  return handleResponse(response)
}

export async function getPeerReviewPublicScore(targetUsername) {
  const response = await fetch(`${BASE_URL}/api/peer-review/score/${encodeURIComponent(targetUsername)}`)
  return handleResponse(response)
}

export async function getAdminAllRatings(username) {
  const response = await fetch(`${BASE_URL}/api/admin/peer-review/ratings?username=${encodeURIComponent(username)}`)
  return handleResponse(response)
}

export async function getAdminAllGroups(username) {
  const response = await fetch(`${BASE_URL}/api/admin/peer-review/groups?username=${encodeURIComponent(username)}`)
  return handleResponse(response)
}


export async function getTermsStatus(username) {
  const response = await fetch(`${BASE_URL}/api/terms-status?username=${encodeURIComponent(username)}`)
  return handleResponse(response)
}

export async function acceptTerms(username, termsVersion) {
  const response = await fetch(`${BASE_URL}/api/accept-terms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, termsVersion }),
  })
  return handleResponse(response)
}

// ---------------------------------------------------------------------------
// Scheduled weather alerts (Web Push)
// ---------------------------------------------------------------------------
export async function getWeatherPushPublicKey() {
  const response = await fetch(`${BASE_URL}/api/weather/push/public-key`)
  return handleResponse(response)
}

export async function getWeatherPushStatus(userId, endpoint) {
  const params = new URLSearchParams({ user_id: userId, endpoint })
  const response = await fetch(`${BASE_URL}/api/weather/push/status?${params}`)
  return handleResponse(response)
}

export async function subscribeWeatherPush(userId, subscription, notifyTime, timezone) {
  const response = await fetch(`${BASE_URL}/api/weather/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, subscription, notify_time: notifyTime, timezone }),
  })
  return handleResponse(response)
}

export async function updateWeatherPushTime(userId, endpoint, notifyTime, timezone) {
  const response = await fetch(`${BASE_URL}/api/weather/push/time`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, endpoint, notify_time: notifyTime, timezone }),
  })
  return handleResponse(response)
}

export async function unsubscribeWeatherPush(userId, endpoint) {
  const response = await fetch(`${BASE_URL}/api/weather/push/unsubscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, endpoint }),
  })
  return handleResponse(response)
}

export async function sendWeatherPushTest(userId, endpoint) {
  const response = await fetch(`${BASE_URL}/api/weather/push/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, endpoint }),
  })
  return handleResponse(response)
}

// ---------------------------------------------------------------------------
// Calendar + Alerts
// ---------------------------------------------------------------------------
export async function getCalendarEvents(userId, from, to) {
  const params = new URLSearchParams({ user_id: userId, from, to })
  const response = await fetch(`${BASE_URL}/api/calendar/events?${params}`)
  return handleResponse(response)
}

export async function createCalendarEvent(userId, payload) {
  const response = await fetch(`${BASE_URL}/api/calendar/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, user_id: userId }),
  })
  return handleResponse(response)
}

export async function updateCalendarEvent(userId, eventId, payload) {
  const response = await fetch(`${BASE_URL}/api/calendar/events/${eventId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, user_id: userId }),
  })
  return handleResponse(response)
}

export async function deleteCalendarEvent(userId, eventId) {
  const response = await fetch(`${BASE_URL}/api/calendar/events/${eventId}?user_id=${userId}`, {
    method: 'DELETE',
  })
  return handleResponse(response)
}

export async function getAlertsSummary(userId, date) {
  const params = new URLSearchParams({ user_id: userId, date })
  const response = await fetch(`${BASE_URL}/api/alerts/summary?${params}`)
  return handleResponse(response)
}

export async function getUpcomingAlerts(userId) {
  const response = await fetch(`${BASE_URL}/api/alerts/upcoming?user_id=${userId}`)
  return handleResponse(response)
}

export async function getAlertInbox(userId) {
  const response = await fetch(`${BASE_URL}/api/alerts/inbox?user_id=${userId}`)
  return handleResponse(response)
}

export async function markAlertsRead(userId, { ids = [], all = false } = {}) {
  const response = await fetch(`${BASE_URL}/api/alerts/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, ids, all }),
  })
  return handleResponse(response)
}

export async function getReminderDeviceStatus(userId, endpoint) {
  const params = new URLSearchParams({ user_id: userId, endpoint })
  const response = await fetch(`${BASE_URL}/api/alerts/devices/status?${params}`)
  return handleResponse(response)
}

export async function subscribeReminderDevice(userId, subscription) {
  const response = await fetch(`${BASE_URL}/api/alerts/devices/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, subscription }),
  })
  return handleResponse(response)
}

export async function unsubscribeReminderDevice(userId, endpoint) {
  const response = await fetch(`${BASE_URL}/api/alerts/devices/unsubscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, endpoint }),
  })
  return handleResponse(response)
}

export async function sendReminderTest(userId, endpoint) {
  const response = await fetch(`${BASE_URL}/api/alerts/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, endpoint }),
  })
  return handleResponse(response)
}
