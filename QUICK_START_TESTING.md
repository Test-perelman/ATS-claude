# Quick Start Testing Guide

## 1. Start Dev Server (30 seconds)

```bash
npm run dev
```

Expected output:
```
> next dev
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
```

## 2. Test Login Flow (1 minute)

1. Open: http://localhost:3000/auth/login
2. Sign in with your test credentials
3. **Check terminal output:**

```
[Middleware] Processing POST /auth/callback
[Middleware] Request cookies: sb-awujhuncfghjshggkqyo-auth-token
[Middleware] ✅ User authenticated: [UUID]
```

If you see these logs → **Middleware is working ✓**

## 3. Test Diagnostic Endpoint (1 minute)

After login, open browser DevTools console and paste:

```javascript
fetch('/api/test-auth-flow', {method: 'POST'})
  .then(r => r.json())
  .then(d => console.log(JSON.stringify(d, null, 2)))
```

Expected response:
```json
{
  "success": true,
  "cookies": {
    "total": 1,
    "names": "sb-awujhuncfghjshggkqyo-auth-token"
  },
  "user": {
    "authenticated": true,
    "userId": "[UUID]",
    "email": "your@email.com"
  },
  "diagnostics": {
    "A1": "PASS - Env vars present",
    "B1": "PASS - Found Supabase cookie(s)",
    "D2": "PASS - Client initialized with cookies"
  }
}
```

If you see `"authenticated": true` → **Fix is working ✓**

## 4. Test Candidates API (1 minute)

In browser console:

```javascript
fetch('/api/candidates')
  .then(r => r.json())
  .then(d => console.log(JSON.stringify(d, null, 2)))
```

Expected response:
```json
{
  "success": true,
  "data": [
    { "id": "...", "first_name": "John", ... },
    { "id": "...", "first_name": "Jane", ... }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 2
  }
}
```

If you see candidate data → **Fix is working ✓**

## 5. Check Terminal Logs (1 minute)

You should see this sequence:

```
[Middleware] Processing GET /api/candidates
[Middleware] Request cookies: sb-awujhuncfghjshggkqyo-auth-token
[Middleware] getAll() called, returning: sb-awujhuncfghjshggkqyo-auth-token
[Middleware] ✅ User authenticated: [UUID]
[Middleware] Forwarding cookies: 1 cookie headers

[API GET /candidates] ========== COOKIE DEBUG ==========
[API GET /candidates] Available cookies: sb-awujhuncfghjshggkqyo-auth-token
[API GET /candidates] Total cookie count: 1

[createClient] ========== INITIALIZING ==========
[createClient] Total cookies available: 1
[createClient] Cookie names: sb-awujhuncfghjshggkqyo-auth-token

[getCurrentUser] ========== STARTING ==========
[getCurrentUser] ✅ User found: [UUID]
```

If you see this complete chain → **Fix is working ✓**

## Quick Diagnostics

### Cookies not showing at API?
Check if middleware logs show cookies:
- **Yes** → Issue in middleware-to-API forwarding (check middleware.ts)
- **No** → Browser not sending cookies (check DevTools > Cookies)

### getUser() returning null?
Check if API logs show cookies:
- **Yes** → Token validation failed (check Supabase logs)
- **No** → Cookies never reached API (check middleware)

### Still getting 401?
Run the diagnostic endpoint `/api/test-auth-flow` and check which tests fail:
- A1-A4: Environment variable issues
- B1-B6: Cookie transmission issues
- C1-C5: Middleware/Next.js configuration issues
- D1-D4: Supabase client initialization issues

## Complete Testing Checklist

- [ ] `npm run dev` starts without errors
- [ ] Can login at `/auth/login`
- [ ] Terminal shows middleware logs after login
- [ ] `/api/test-auth-flow` returns authenticated user
- [ ] `/api/candidates` returns 200 with data
- [ ] POST request to create candidate works
- [ ] `/api/auth/session` returns authenticated user
- [ ] Refresh page - still authenticated
- [ ] Browser DevTools shows auth cookie with correct domain
- [ ] Network tab shows Cookie header in requests

## Need More Help?

See detailed guides:
- **FIX_IMPLEMENTATION_REPORT.txt** - What was changed and why
- **AUTH_FIX_SUMMARY.md** - Complete technical documentation
- **TESTING_GUIDE.txt** - Comprehensive testing instructions

## If Fix Didn't Work

1. **Check middleware logs** - Are cookies being forwarded?
2. **Check API logs** - Are cookies reaching the API route?
3. **Check browser** - Are cookies stored in DevTools?
4. **Check Supabase** - Are auth logs showing any errors?

Each diagnostic point narrows down the issue to a specific stage.
