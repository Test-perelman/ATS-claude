# Supabase Auth Complete Guide - Perelman ATS

## Overview

This guide explains how Supabase Authentication is currently implemented in Perelman ATS, what features exist, what needs fixing, and how to implement missing features.

---

## Current Auth Architecture

### How Supabase Auth Works in This App

```
Supabase has TWO separate systems:
1. Supabase Auth (PostgreSQL auth.users table)
2. Your custom users table (public.users)

They MUST be synced:
- When user signs up → create auth user + public user record
- When user updates profile → update both tables
- When user deletes → delete from both
```

### Authentication Flow

```
1. User Signs Up
   ├─ POST /auth/signup
   ├─ supabase.auth.signUp(email, password)
   │  └─ Creates: auth.users record + sends verification email
   ├─ Creates: public.users record linked to auth.users.id
   └─ Redirects to onboarding (/onboarding)

2. Email Verification (Automatic via Link)
   ├─ User checks email
   ├─ Clicks verification link
   └─ Supabase automatically marks email_confirmed_at

3. Onboarding Flow (POST signup)
   ├─ /onboarding page: Choose "Create Team" or "Join Team"
   │
   ├─ If Create Team:
   │  ├─ POST /api/auth/create-team
   │  ├─ Creates: teams record
   │  ├─ Creates: roles (Local Admin, Recruiter, etc.)
   │  ├─ Updates: public.users with team_id + role_id
   │  └─ Creates: team_memberships record (approved)
   │
   └─ If Join Team:
      ├─ POST /api/auth/join-team
      ├─ Creates: public.users record (no role_id)
      ├─ Creates: team_memberships record (pending)
      └─ Redirects to /onboarding/pending

4. Admin Approves (if user joined)
   ├─ Admin views: /settings/access-requests
   ├─ Admin clicks: "Approve"
   ├─ POST /api/admin/approve-membership
   ├─ Updates: team_memberships (status=approved)
   ├─ Assigns: role_id to public.users
   └─ User gains access

5. User Logs In
   ├─ POST /auth/login
   ├─ supabase.auth.signInWithPassword(email, password)
   ├─ Returns: JWT session token
   ├─ Stored in: Supabase session cookie (secure, httpOnly)
   └─ Middleware refreshes session on every request
```

---

## Current Features Status

### ✅ FULLY IMPLEMENTED

| Feature | Location | Status |
|---------|----------|--------|
| Sign Up (email/password) | `/auth/signup` | ✅ Working |
| Email Verification | Via Supabase link click | ✅ Works (auto) |
| Sign In | `/auth/login` | ✅ Working |
| Sign Out | via auth context | ✅ Working |
| Session Management | Middleware + Auth Context | ✅ Working |
| Team Creation (post-signup) | `/onboarding` → `/api/auth/create-team` | ✅ Working (after fixes) |
| Team Joining Request | `/onboarding` → `/api/auth/join-team` | ✅ Working |
| Admin Approval System | `/settings/access-requests` + API | ✅ Working (after fixes) |
| Role-based Access | RLS Policies | ✅ Implemented |

### 🟡 PARTIALLY IMPLEMENTED

| Feature | Current State | Missing |
|---------|---------------|---------|
| Password Reset | Form exists (`/auth/reset-password`) | Need "Forgot Password" flow to trigger reset |
| Change Password | Form exists (should be in settings) | Not linked in UI |
| Email Confirmation | Auto via link click | No explicit confirmation page |

### ❌ NOT FULLY INVESTIGATED

| Issue | Impact | Status |
|-------|--------|--------|
| Auth Rate Limiting | Might block users after N signup attempts | 🔍 Unknown |
| Email Delivery | Verification emails must work | 🔍 Check SendGrid config |
| Magic Links | OTP authentication | 🔍 Not configured? |

---

## Detailed Feature Breakdown

### 1. Sign Up Flow (✅ FIXED)

**Flow:**
```
User → SignupPage (/auth/signup)
  ↓
Enter email + password
  ↓
POST /auth/signup → signUp(email, password)
  ↓
Supabase creates auth user
  ↓
public.users record created
  ↓
Verification email sent
  ↓
User clicks link in email
  ↓
Email auto-verified
  ↓
Redirect to /onboarding
```

**Code:**
```typescript
// src/lib/auth-actions.ts
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) return { error: error.message }

  // Create public user record
  await createUserRecord(data.user.id, email)

  return { success: true }
}
```

**Status:** ✅ WORKING (after role fix)

---

### 2. Email Verification (✅ AUTOMATIC)

**How it works:**
1. User receives email with verification link
2. Link contains: `email_confirmation_token` in URL
3. User clicks link
4. Supabase automatically:
   - Verifies token
   - Sets `email_confirmed_at` timestamp
   - Redirects to callback URL

**Code:**
```typescript
// src/app/auth/callback/route.ts
// Handles the redirect from email verification link
export async function GET(request: NextRequest) {
  const code = searchParams.get('code')

  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(origin + '/onboarding')
}
```

**Status:** ✅ AUTOMATIC (no user action needed)

---

### 3. Password Reset (🟡 PARTIALLY DONE)

**What Exists:**
- Reset password form: `/auth/reset-password`
- Takes recovery token from URL: `#access_token=xxx&refresh_token=xxx`
- Validates token via: `getPasswordRecoverySession()`
- Updates password via: `updatePassword(newPassword)`

**What's Missing:**
- "Forgot Password" button/flow on login page
- API endpoint that sends reset email

**How to Implement:**

```typescript
// 1. Add "Forgot Password" endpoint
// POST /api/auth/forgot-password

import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { email } = await request.json()

  const supabase = await createServerClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({
    message: 'Check your email for password reset link',
  })
}

// 2. Create forgot password page/modal
// /auth/forgot-password

'use client'
import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to send reset email')
        return
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error sending email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-6">Forgot Password</h1>

        {success ? (
          <div className="p-4 bg-green-50 text-green-700 rounded">
            Check your email for password reset instructions.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Email'}
            </button>
          </form>
        )}

        <p className="text-center text-sm mt-6">
          <a href="/auth/login" className="text-blue-600 hover:underline">
            Back to Login
          </a>
        </p>
      </div>
    </div>
  )
}

// 3. Update login page to link to forgot password
// src/app/auth/login/page.tsx

// ADD THIS LINE IN THE FORM:
<Link href="/auth/forgot-password" className="text-blue-600 hover:underline text-sm">
  Forgot password?
</Link>
```

**Status:** 🟡 PARTIALLY IMPLEMENTED (missing trigger)

---

### 4. Sign In / Login (✅ WORKING)

**Flow:**
```
LoginPage (/auth/login)
  ↓
Enter email + password
  ↓
POST supabase.auth.signInWithPassword(email, password)
  ↓
Supabase validates credentials
  ↓
Returns JWT session + refresh token
  ↓
Stored in: httpOnly cookie (secure)
  ↓
Middleware refreshes session
  ↓
Redirect to /dashboard
```

**Code:**
```typescript
// src/app/auth/login/page.tsx
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
})

if (error) return { error: error.message }
router.push('/dashboard')
```

**Status:** ✅ WORKING

---

### 5. Session Management (✅ WORKING)

**Middleware automatically:**
- Refreshes session on every request
- Checks `auth.uid()` for authenticated status
- Updates RLS policies based on logged-in user

**Code:**
```typescript
// src/middleware.ts
export async function middleware(request: NextRequest) {
  let supabaseResponse = await supabase.auth.refreshSession()

  const { data: { session } } = supabaseResponse

  // Protect routes - redirect unauthenticated users
  if (!session && !isPublicRoute(request.pathname)) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
}
```

**Status:** ✅ WORKING

---

## Supabase Auth Configuration

### Environment Variables Required

```bash
NEXT_PUBLIC_SUPABASE_URL=https://awujhuncfghjshggkqyo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Email Provider (CRITICAL)

**Status:** ❓ NEEDS VERIFICATION

In Supabase Dashboard:
1. Go to **Auth** → **Providers** → **Email**
2. Check which provider is configured:
   - ❌ Built-in (limited to 5 emails/day)
   - ✅ SendGrid (unlimited)
   - ✅ AWS SES
   - ✅ Custom SMTP

**If using Built-in:**
- Only 5 test emails per day
- User's in production might not receive emails
- **MUST upgrade to SendGrid or AWS SES**

**To set up SendGrid:**
1. Get API key from SendGrid
2. In Supabase Dashboard:
   - Auth → Providers → Email
   - Enable "Custom SMTP"
   - Enter SendGrid credentials
3. Test: Try signing up, check email

### Authentication URL Configuration

In Supabase Dashboard:
1. **Auth** → **URL Configuration**
2. **Authorized redirect URLs** should include:
   - `https://your-domain.com/**`
   - `http://localhost:3000/**` (local development)
   - `https://ats-claude.vercel.app/**` (from .env)

---

## Known Issues & Debugging

### Issue #1: Verification Emails Not Received

**Symptoms:** Users can't click email verification link, can't sign up

**Possible Causes:**
1. Email provider not configured (using built-in, limited to 5/day)
2. Redirect URL not whitelisted
3. Email template broken
4. User's email in spam folder

**How to Debug:**
```bash
# Check email queue in Supabase Dashboard:
# Auth → Logs → Look for email sends

# Check if email provider is configured:
# Auth → Providers → Email
```

**Solution:**
- Configure SendGrid or AWS SES
- Whitelist your domain
- Check Supabase email logs

---

### Issue #2: Auth Rate Limiting

**Symptoms:** "Too many requests" after several signup attempts

**Possible Causes:**
1. Supabase has built-in rate limiting:
   - 5 signup attempts per hour per IP
   - 10 password reset attempts per hour per email
2. Brute force protection

**How to Check:**
- Supabase Dashboard → Auth → Logs
- Look for 429 (Too Many Requests) errors

**Solution:**
- Wait 1 hour before retrying from same IP
- Use different IP/device
- In production, this protects against attacks (good!)
- Can be disabled in Supabase settings (not recommended)

---

### Issue #3: Password Reset Token Expired

**Symptoms:** "Invalid or expired reset link"

**Details:**
- Reset tokens expire after 24 hours
- Token is single-use

**Solution:**
- User needs to click "Forgot Password" again
- Send new reset email

---

## Testing Checklist

### Local Testing (http://localhost:3000)

- [ ] Can sign up with new email
- [ ] Receive verification email
- [ ] Can click verification link
- [ ] Redirected to onboarding
- [ ] Can create team
- [ ] Can see dashboard
- [ ] Can log out
- [ ] Can log back in

### Password Reset Testing

- [ ] Can click "Forgot Password" on login
- [ ] Receive reset email
- [ ] Can click reset link
- [ ] Can set new password
- [ ] Can log in with new password

### Admin Approval Testing

- [ ] Create 2 accounts
- [ ] Account 1: Create team (becomes admin)
- [ ] Account 2: Join team (pending status)
- [ ] Account 1: Go to Settings → Access Requests
- [ ] Account 1: Approve Account 2
- [ ] Account 2: Can now see team data

---

## Supabase Auth Best Practices

### 1. Never expose service role key in client code
❌ WRONG:
```typescript
// Client code
const response = await fetch('...',{
  headers: {
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
  }
})
```

✅ RIGHT:
```typescript
// Only in server-side code or API routes
const admin = await createAdminClient() // Uses service key securely
```

### 2. Always use httpOnly cookies for tokens
❌ WRONG:
```typescript
localStorage.setItem('token', session.access_token)
```

✅ RIGHT (Supabase does this automatically):
```typescript
// Supabase stores JWT in httpOnly cookie automatically
// Can't be accessed by JavaScript
```

### 3. Refresh session on every request
✅ DONE in middleware.ts

### 4. Validate user on backend before database access
✅ DONE via RLS policies

### 5. Handle token expiration gracefully
✅ DONE in middleware with refreshSession()

---

## Reference: Supabase Auth URLs

| Action | URL | Method |
|--------|-----|--------|
| Sign Up | `/auth/signup` | GET (page) |
| Sign In | `/auth/login` | GET (page) |
| Verify Email | *Link in email* | GET (callback) |
| Forgot Password | `/auth/forgot-password` | GET (needs implementation) |
| Reset Password | `/auth/reset-password` | GET (page) |
| Change Password | *Settings page (todo)* | - |

---

## Implementation Priority

### 🔴 CRITICAL (Do First)
- [x] Fix schema mismatch (is_admin_role → is_admin)
- [x] Fix role creation fallback
- [ ] Verify email delivery working (check SendGrid)
- [ ] Test signup flow end-to-end

### 🟡 HIGH (Do Soon)
- [ ] Implement forgot password flow
- [ ] Add change password to settings
- [ ] Add email confirmation explicit page
- [ ] Test admin approval workflow

### 🟢 MEDIUM (Can Do Later)
- [ ] Implement magic link (passwordless)
- [ ] Add social auth (Google, GitHub)
- [ ] Add 2FA/MFA support
- [ ] Add logout from all devices

---

## Questions to Answer

1. **Email Delivery:** Is SendGrid configured or using built-in?
   - Check: Supabase Dashboard → Auth → Providers → Email

2. **Rate Limiting:** Is it actually a problem?
   - Users can wait 1 hour or use different IP
   - Is production ready for this?

3. **Custom Auth:** Do you really need Supabase Auth?
   - **Answer:** YES! Supabase Auth is mature and secure
   - Better than custom email auth (easier to maintain)
   - Handles: Hashing, tokens, rate limiting, email validation

---

## Summary

Your Supabase Auth implementation is **solid and mostly working**. The issues were:

1. ✅ **FIXED:** Database schema column mismatch (is_admin vs is_admin_role)
2. ✅ **FIXED:** Missing fallback for role creation
3. 🟡 **TODO:** Implement forgot password flow
4. 🔍 **VERIFY:** Email delivery (SendGrid configuration)
5. 🟡 **TODO:** Add change password UI to settings

Prefer Supabase Auth over custom email auth because:
- ✅ Battle-tested security
- ✅ Handles password hashing, salting, token generation
- ✅ Rate limiting for DDoS protection
- ✅ Email verification with tokens
- ✅ Password reset flow
- ✅ Future: 2FA, social auth, etc.

