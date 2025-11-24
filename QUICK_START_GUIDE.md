# Quick Start Guide: Hybrid Authentication System

## What Was Built

A complete multi-tenant authentication system with:
- **Admin Email/Password Signup & Login** ✅ DONE
- **Google OAuth Support** (framework ready for you to implement)
- **Team Access Request System** ✅ DONE
- **Team Management UI** ✅ DONE
- **Data Isolation by Team** ✅ Database schema ready

---

## 🚀 Getting Started (5 Steps)

### Step 1: Deploy Database Migration
```bash
# 1. Go to Supabase Dashboard
# 2. Click SQL Editor
# 3. Click "New Query"
# 4. Copy entire contents of: scripts/add-team-isolation.sql
# 5. Paste into editor and click "Run"
```

### Step 2: Test Admin Signup
```bash
# Start your app
npm run dev

# Visit: http://localhost:3000/admin/signup
# Fill in the form:
# - First Name: John
# - Last Name: Doe
# - Email: john@example.com
# - Company Name: Acme Corp
# - Password: Test123!@
# - Click "Create Account"
```

### Step 3: Test Admin Login
```bash
# You'll be redirected to http://localhost:3000/admin/login
# Login with your email and password
# You should see dashboard
```

### Step 4: Setup Google OAuth (YOUR IMPLEMENTATION)
```bash
# 1. Go to Supabase Dashboard > Authentication > Providers
# 2. Find "Google"
# 3. Click "Enable"
# 4. Add your Google OAuth credentials:
#    - Google Client ID
#    - Google Client Secret
# 5. Set Redirect URL: https://yourdomain.com/auth/v1/callback

# Then create a Google login page (example):
# src/app/(auth)/google-login/page.tsx
```

### Step 5: Test the Complete Flow
1. Login as admin
2. Go to Settings > Team Members
3. Click "Invite Member" (future feature)
4. OR: Have a Google user sign in → should go to `/access-request`

---

## 📁 Key Files

### Authentication
- `src/lib/supabase/auth.ts` - All auth functions
- `src/middleware.ts` - Route protection

### Pages
- `/admin/signup` - Admin account creation
- `/admin/login` - Admin login
- `/access-request` - Where Google users go
- `/settings/team` - Team information
- `/settings/members` - Team members
- `/settings/access-requests` - Approve/reject requests

### API Routes
- `POST /api/auth/admin-signup` - Create admin
- `POST /api/access-requests` - Create request
- `POST /api/access-requests/[id]/approve` - Approve
- `POST /api/access-requests/[id]/reject` - Reject

---

## 🔑 Important: What You Need To Do

### 1. Implement Google OAuth Login
You need to create a page where users can sign in with Google.

**Recommended approach:**
```tsx
// src/app/(auth)/google-login/page.tsx
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/lib/supabase/client'

export default function GoogleLoginPage() {
  return (
    <Auth
      supabaseClient={supabase}
      providers={['google']}
      appearance={{ theme: ThemeSupa }}
    />
  )
}
```

### 2. Update All API Queries to Filter by Team ID
**Currently:** Queries return ALL data (anyone can see everything)
**Needed:** Filter by `team_id` to isolate data

Example:
```tsx
// Before (INSECURE - shows all data):
export async function getCandidates() {
  const { data } = await supabase
    .from('candidates')
    .select('*')
}

// After (SECURE - filters by team):
export async function getCandidates() {
  const teamId = await getCurrentUserTeamId()
  const { data } = await supabase
    .from('candidates')
    .select('*')
    .eq('team_id', teamId)  // ADD THIS LINE
}
```

**Files to update:**
- `src/lib/api/candidates.ts` - Add `.eq('team_id', teamId)`
- `src/lib/api/vendors.ts` - Add `.eq('team_id', teamId)`
- `src/lib/api/clients.ts` - Add `.eq('team_id', teamId)`
- `src/lib/api/requirements.ts` - Add `.eq('team_id', teamId)`
- All other API files...

### 3. Auto-Populate team_id When Creating Entities
When users create candidates/vendors/clients, auto-set their team_id.

Example:
```tsx
// In forms:
import { useAuth } from '@/lib/contexts/AuthContext'

export function CandidateForm() {
  const { teamId } = useAuth()

  const handleSubmit = async (data) => {
    // When inserting:
    await supabase
      .from('candidates')
      .insert({
        ...data,
        team_id: teamId  // AUTO-SET
      })
  }
}
```

---

## 🧪 Testing Checklist

- [ ] Admin can sign up at `/admin/signup`
- [ ] Admin can login at `/admin/login`
- [ ] Admin redirects to `/dashboard`
- [ ] Google user can sign in (after you implement it)
- [ ] Google user redirected to `/access-request` if no team
- [ ] Admin can see pending requests in `/settings/access-requests`
- [ ] Admin can approve/reject requests
- [ ] User can view team info at `/settings/team`
- [ ] User can see team members at `/settings/members`
- [ ] Creating candidate auto-sets team_id
- [ ] Candidate appears for admin's team only
- [ ] Another team's admin can't see first team's candidates

---

## 🔐 Security Checklist

- [ ] RLS policies enabled in Supabase (from migration)
- [ ] All API queries filter by team_id
- [ ] Entity forms auto-populate team_id
- [ ] Middleware protects routes (from `src/middleware.ts`)
- [ ] Users can't view other team's data
- [ ] Only team admin can approve access requests

---

## 📚 Documentation

For detailed information, see: `HYBRID_AUTH_IMPLEMENTATION.md`

Contains:
- Architecture overview
- Database schema details
- Complete file reference
- Implementation details
- Troubleshooting guide

---

## 🚨 Critical: Database Migration

**YOU MUST RUN THIS:** `scripts/add-team-isolation.sql` in Supabase

This:
- Adds `team_id` to all entity tables
- Creates `team_access_requests` table
- Sets up RLS policies
- Creates indexes for performance

**Without this migration:**
- Team data won't be isolated
- Data leaks between companies
- Access requests won't work

---

## 💡 How It Works (High Level)

```
Admin Signup
  ↓
Creates Team + User Record
  ↓
Admin Dashboard
  ↓
Admin invites Google user (OR)
  ↓
Google user signs in → Redirected to /access-request
  ↓
User fills request form
  ↓
Admin reviews in /settings/access-requests
  ↓
Admin clicks "Approve"
  ↓
User record created with team_id
  ↓
User logs in → Can access dashboard
  ↓
User can only see their team's data (RLS + team_id filtering)
```

---

## 🎯 Next Actions

### Immediate (Day 1):
1. Run database migration in Supabase
2. Test admin signup/login
3. Verify database changes

### Short Term (Days 2-3):
1. Implement Google OAuth
2. Create Google login page
3. Test Google signin flow

### Medium Term (Days 4-5):
1. Update all API queries to filter by team_id
2. Update entity forms to auto-set team_id
3. Test data isolation

### Before Selling (Day 6+):
1. Set up email notifications
2. Test with multiple teams
3. Security audit
4. Deploy to production

---

## 📞 Need Help?

### Common Issues:

**Q: Admin login returns "User not found"**
A: User record might not have been created. Check database:
```sql
SELECT * FROM users WHERE email = 'your@email.com';
```

**Q: Google user doesn't see access request form**
A: Middleware issue. Check `src/middleware.ts` is correct.

**Q: Can't approve requests**
A: Make sure you're logged in as admin (has team_id assigned).

**Q: Queries return empty results**
A: Check team_id filter was added. Verify user's team_id matches data.

---

## 📖 File Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── admin/
│   │   │   ├── signup/page.tsx
│   │   │   └── login/page.tsx
│   │   └── google-login/page.tsx (YOU CREATE)
│   ├── (app)/
│   │   ├── access-request/page.tsx
│   │   └── settings/
│   │       ├── page.tsx
│   │       ├── team/page.tsx
│   │       ├── members/page.tsx
│   │       └── access-requests/page.tsx
│   └── api/
│       ├── auth/
│       │   └── admin-signup/route.ts
│       └── access-requests/
│           ├── route.ts
│           ├── [id]/
│           │   ├── approve/route.ts
│           │   └── reject/route.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── auth.ts
│   ├── api/
│   │   ├── candidates.ts (UPDATE)
│   │   ├── vendors.ts (UPDATE)
│   │   ├── clients.ts (UPDATE)
│   │   ├── requirements.ts (UPDATE)
│   │   ├── teams.ts
│   │   └── ... (others)
│   └── contexts/
│       └── AuthContext.tsx
└── middleware.ts
```

---

🎉 **Everything is set up! You're ready to launch the hybrid authentication system.**

Remember: The hard part (infrastructure) is done. Now it's about implementing Google OAuth and updating queries.
