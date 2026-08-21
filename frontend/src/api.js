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