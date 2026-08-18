const BASE_URL = import.meta.env.VITE_API_URL

async function handleResponse(response) {
    const data = await response.json()
    if (!response.ok) {
        throw new Error(data.message || 'An error occurred')
    }
    return data
}

export async function registerUser(username, password) {
    const response = await fetch(`${BASE_URL}/api/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    })
    return handleResponse(response)
}

export async function loginUser(username, password) {
    const response = await fetch(`${BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    })
    return handleResponse(response)
}

export async function getAucklandWeather() {
    const response = await fetch(`${BASE_URL}/api/weather/auckland`)
    return handleResponse(response)
}

export async function getPosts() {
    const response = await fetch(`${BASE_URL}/api/posts`)
    return handleResponse(response)
}

export async function getPost(postId) {
    const response = await fetch(`${BASE_URL}/api/posts/${postId}`)
    return handleResponse(response)
}

export async function createPost(title, content, author) {
    const response = await fetch(`${BASE_URL}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, author }),
  })
    return handleResponse(response)
}

export async function getComments(postId) {
    const response = await fetch(`${BASE_URL}/api/posts/${postId}/comments`)
    return handleResponse(response)
}

export async function createComment(postId, content, author) {
    const response = await fetch(`${BASE_URL}/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, author }),
  })
    return handleResponse(response)
}