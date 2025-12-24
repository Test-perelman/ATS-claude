/**
 * API Client Utility
 * Provides fetch wrapper with automatic credential handling for authenticated API calls
 * On Vercel, sends Supabase access token as Bearer header since cookies don't work reliably
 */

import { supabase } from '@/lib/supabase/client'

export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get the current session synchronously from localStorage
  // This is set by Supabase and is immediately available after login
  let authHeader: string | undefined = undefined
  
  try {
    // Try to get session - this works in browser
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session?.access_token) {
      authHeader = `Bearer ${session.access_token}`
      console.log('[apiFetch] Sending Bearer token')
    }
  } catch (err) {
    console.log('[apiFetch] Session retrieval failed, trying localStorage fallback')
    
    // Fallback: check localStorage directly (Supabase stores it there)
    try {
      const session = localStorage.getItem('sb-awujhuncfghjshggkqyo-auth-token');
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed?.access_token) {
          authHeader = `Bearer ${parsed.access_token}`
          console.log('[apiFetch] Got token from localStorage')
        }
      }
    } catch (e) {
      // localStorage unavailable or session not parseable
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }

  // Add Bearer token if available
  if (authHeader && !headers['Authorization']) {
    headers['Authorization'] = authHeader
    console.log('[apiFetch] Added Authorization header')
  } else if (!authHeader) {
    console.log('[apiFetch] No token found, relying on cookies')
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
