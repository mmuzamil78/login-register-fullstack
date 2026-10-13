const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'
).replace(/\/$/, '')

const ACCESS_TOKEN_KEY = 'dayboard_access_token'
const REFRESH_TOKEN_KEY = 'dayboard_refresh_token'

export function getAccessToken() {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY)
}

export function saveTokens(tokens) {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.access)
  sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh)
}

export function clearTokens() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  sessionStorage.removeItem(REFRESH_TOKEN_KEY)
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = data.detail || Object.entries(data)
      .map(([field, errors]) => {
        const explanation = Array.isArray(errors) ? errors.join(' ') : String(errors)
        return field === 'non_field_errors' ? explanation : `${field}: ${explanation}`
      })
      .join(' ')
    const error = new Error(message || `Request failed (${response.status}).`)
    error.status = response.status
    throw error
  }
  return data
}

async function send(path, { method, body, accessToken } = {}) {
  const headers = new Headers()
  let requestBody

  if (body instanceof FormData) {
    requestBody = body
  } else if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
    requestBody = JSON.stringify(body)
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: method || 'GET',
    headers,
    body: requestBody,
  })
  return readResponse(response)
}

async function refreshAccessToken() {
  const refresh = sessionStorage.getItem(REFRESH_TOKEN_KEY)
  if (!refresh) return null

  try {
    const tokens = await send('/auth/token/refresh/', {
      method: 'POST',
      body: { refresh },
    })
    sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.access)
    return tokens.access
  } catch {
    clearTokens()
    return null
  }
}

export async function apiRequest(path, options = {}) {
  const { authenticated = true, ...requestOptions } = options
  const accessToken = authenticated ? getAccessToken() : null

  try {
    return await send(path, { ...requestOptions, accessToken })
  } catch (error) {
    if (!authenticated || !accessToken || error.status !== 401) {
      throw error
    }

    const refreshedToken = await refreshAccessToken()
    if (!refreshedToken) throw error
    try {
      return await send(path, { ...requestOptions, accessToken: refreshedToken })
    } catch (retryError) {
      if (retryError.status === 401) clearTokens()
      throw retryError
    }
  }
}
