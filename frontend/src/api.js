const BASE_URL = import.meta.env.VITE_API_URL

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

export async function createPost(title, content, author, category = 'general') {
  const response = await fetch(`${BASE_URL}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, author, category }),
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

export async function registerUser(username, email, password) {
  const response = await fetch(`${BASE_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
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