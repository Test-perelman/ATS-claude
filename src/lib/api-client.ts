/**
 * API Client Utility
 * Provides fetch wrapper with automatic credential handling for authenticated API calls
 * Ensures cookies are sent with all API requests from client-side code
 */

export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

export async function apiGet(url: string) {
  return apiFetch(url, { method: 'GET' })
}

export async function apiPost(url: string, body?: any) {
  return apiFetch(url, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  })
}

export async function apiPut(url: string, body?: any) {
  return apiFetch(url, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  })
}

export async function apiDelete(url: string) {
  return apiFetch(url, { method: 'DELETE' })
}
