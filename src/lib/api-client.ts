/**
 * API Client Utility
 * Provides fetch wrapper with automatic credential handling for authenticated API calls
 * Ensures cookies are sent with all API requests from client-side code
 * ALSO sends Bearer token as fallback for session verification on Vercel
 */

export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Try to get the session token from Supabase as a fallback
  let authHeader: string | undefined = undefined
  try {
    const { supabase } = await import('@/lib/supabase/client')
    const { data: sessionData } = await supabase.auth.getSession()
    if (sessionData?.session?.access_token) {
      authHeader = `Bearer ${sessionData.session.access_token}`
    }
  } catch (err) {
    // Silently fail if we can't get token - rely on cookies instead
    // console.log('[apiFetch] Token retrieval failed, using cookies')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }

  // Add Bearer token if available and not already set
  if (authHeader && !headers['Authorization']) {
    headers['Authorization'] = authHeader
  }

  return fetch(url, {
    ...options,
    credentials: 'include',
    headers,
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
