# Hybrid Authentication Implementation Guide

## Overview

This document describes the implementation of a hybrid authentication system that supports:
1. **Email/Password Admin Signup** - For company administrators (implemented)
2. **Google OAuth** - For company members (to be implemented by you)
3. **Team Access Request System** - For Google users awaiting admin approval

---

## Architecture Overview

### User Flow

#### Admin (Email/Password):
1. Visit `/admin/signup`
2. Fill in personal and company information
3. System automatically creates:
   - Supabase Auth user (email/password)
   - Team record (company profile)
   - User record with team_id assigned
4. Redirects to `/admin/login`
5. Login with email/password
6. Access to full dashboard and admin features

#### Company Members (Google OAuth):
1. Sign in with Google (you implement this)
2. System checks if user has team_id:
   - **Has team_id** → Redirect to `/dashboard`
   - **No team_id** → Redirect to `/access-request`
3. User fills access request form
4. Admin reviews and approves/rejects
5. If approved → User gets team_id assigned
6. Next login → Full access to dashboard

---

## Database Schema

### New Table: `team_access_requests`

```sql
CREATE TABLE team_access_requests (
  request_id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company_email TEXT NOT NULL,
  reason TEXT,
  requested_team_id UUID,
  auth_user_id UUID,  -- Links to Supabase Auth user
  status TEXT ('pending' | 'approved' | 'rejected'),
  reviewed_by UUID,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Modified Tables

Added `team_id UUID` to all entity tables:
- candidates
- vendors
- clients
- job_requirements
- submissions
- interviews
- projects
- timesheets
- invoices
- immigration
- attachments
- activities
- notes

All have CASCADE DELETE for automatic cleanup when team is deleted.

### Row Level Security (RLS)

All entity tables have RLS policies that restrict users to only seeing data from their team:

```sql
-- Example policy:
CREATE POLICY team_isolation_candidates ON candidates
  FOR ALL
  USING (team_id = (SELECT team_id FROM users WHERE user_id = auth.uid()))
  WITH CHECK (team_id = (SELECT team_id FROM users WHERE user_id = auth.uid()));
```

---

## Files Created

### 1. Database Migration
- **`scripts/add-team-isolation.sql`** - Run this in Supabase to add team isolation

### 2. Authentication
- **`src/lib/supabase/auth.ts`** - Core auth functions:
  - `adminSignUp()` - Create admin with team
  - `adminSignIn()` - Admin login
  - `getCurrentUser()` - Get current user with team context
  - `getCurrentUserTeamId()` - Get just team_id
  - `requestTeamAccess()` - Request team access (for Google users)
  - `checkTeamAccess()` - Check if user has team access
  - `approveAccessRequest()` - Approve request (server-only)
  - `rejectAccessRequest()` - Reject request (server-only)

### 3. API Routes
- **`src/app/api/auth/admin-signup/route.ts`** - POST endpoint for admin signup
- **`src/app/api/access-requests/route.ts`** - GET (list pending) / POST (create request)
- **`src/app/api/access-requests/[id]/approve/route.ts`** - POST to approve request
- **`src/app/api/access-requests/[id]/reject/route.ts`** - POST to reject request

### 4. Team Management API
- **`src/lib/api/teams.ts`** - Team operations:
  - `getTeam()` - Get current user's team
  - `updateTeam()` - Update team info
  - `getTeamMembers()` - List team members
  - `getTeamMember()` - Get single member
  - `updateTeamMember()` - Change member role
  - `removeTeamMember()` - Delete member
  - `getPendingAccessRequests()` - Admin only
  - `getAccessRequests()` - Admin only with filter

### 5. Authentication Pages
- **`src/app/(auth)/layout.tsx`** - Auth page layout (centered, branded)
- **`src/app/(auth)/admin/signup/page.tsx`** - Admin signup form
- **`src/app/(auth)/admin/login/page.tsx`** - Admin login form

### 6. User/Team Pages
- **`src/app/(app)/access-request/page.tsx`** - Access request form (for Google users)
- **`src/app/(app)/settings/page.tsx`** - Settings hub with links to team management
- **`src/app/(app)/settings/team/page.tsx`** - Team info & settings (view/edit)
- **`src/app/(app)/settings/members/page.tsx`** - Team members list
- **`src/app/(app)/settings/access-requests/page.tsx`** - Access requests review (admin)

### 7. Context & Middleware
- **`src/lib/contexts/AuthContext.tsx`** - Auth context for client-side state
- **`src/middleware.ts`** - Next.js middleware for route protection

---

## Implementation Details

### Admin Signup Flow

1. User visits `/admin/signup`
2. Fills form:
   - First Name, Last Name
   - Email, Password
   - Company Name, Team Name (optional)
   - Subscription Tier
3. Form submits to `/api/auth/admin-signup`
4. API Route:
   - Creates Supabase Auth user (email/password)
   - Creates team record
   - Creates or retrieves "Admin" role
   - Creates user record with team_id
5. Redirects to `/admin/login?success=true`

### Admin Login Flow

1. User visits `/admin/login`
2. Fills email and password
3. Calls `adminSignIn()` helper
4. Gets user record with team_id
5. Supabase session is created (handled by SDK)
6. Redirects to `/dashboard`

### Google Auth Integration (YOU IMPLEMENT)

1. Set up Google OAuth in Supabase Dashboard:
   - Go to Authentication > Providers > Google
   - Add your Google OAuth credentials
   - Set redirect URL to your app domain

2. Create login page with Google button:
   ```tsx
   import { Auth } from '@supabase/auth-ui-react'
   import { ThemeSupa } from '@supabase/auth-ui-shared'

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

3. Handle Google OAuth callback:
   - User signs in with Google
   - Supabase creates Auth user automatically
   - Middleware checks if user has team_id
   - If no team_id → Redirect to `/access-request`
   - If has team_id → Allow access to dashboard

### Access Request Flow

1. Google user signs in → redirected to `/access-request`
2. Form pre-fills email from Supabase Auth
3. User fills:
   - First/Last Name
   - Company Email
   - Reason (optional)
4. Submits to `/api/access-requests`
5. Creates `team_access_request` record with status='pending'
6. Admin sees pending request in `/settings/access-requests`
7. Admin clicks "Approve":
   - Updates request status to 'approved'
   - Creates user record with team_id (from request)
   - Links to auth_user_id
8. On next login, user has team_id → Full access

### Team Isolation

RLS policies ensure users only see their team's data. The policies filter on:
```sql
team_id = (SELECT team_id FROM users WHERE user_id = auth.uid())
```

This means:
- User A (team_1) queries candidates → Only sees candidates with team_id = team_1
- User B (team_2) queries candidates → Only sees candidates with team_id = team_2
- Admin approves User C for team_2 → User C now sees team_2 data only

---

## Route Protection

The middleware (`src/middleware.ts`) protects routes:

### Public Routes (No Auth Required)
- `/admin/signup` - Admin account creation
- `/admin/login` - Admin login

### Auth-Only Routes (Google Login Redirect)
- `/access-request` - Where Google users go if they don't have team_id

### Protected Routes (Require Team Access)
- `/dashboard`, `/candidates`, `/vendors`, `/clients`, etc.
- Only accessible if user has team_id assigned
- If user doesn't have team_id, redirected to `/access-request`

---

## Important Notes

### What's NOT Auto-Updated Yet

The following still need manual updates to filter by team_id:

1. **All API queries** in `src/lib/api/*.ts`:
   - Add `getCurrentUserTeamId()` call
   - Filter results by team_id
   - Example:
   ```tsx
   export async function getCandidates() {
     const teamId = await getCurrentUserTeamId();

     const { data } = await supabase
       .from('candidates')
       .select('*')
       .eq('team_id', teamId);  // ADD THIS
   }
   ```

2. **Entity creation forms**:
   - Auto-set team_id when creating candidates, clients, etc.
   - Get from `useAuth()` context or `getCurrentUserTeamId()`

3. **API Insert/Update operations**:
   - Ensure team_id is set in insert payloads
   - Verify user has permission for that team

### Email Notifications

The current implementation does NOT send emails. To add email notifications:

1. Set up email service (SendGrid, Resend, AWS SES, etc.)
2. On access request approval → Send email to user
3. On access request rejection → Send email to user
4. On team invitation → Send email with acceptance link

### Future Enhancements

1. **Team Invitations**: Instead of access requests, admin sends invites
2. **Multiple Teams**: Allow users to belong to multiple teams
3. **Team Switching**: Users can switch between teams they belong to
4. **Audit Logging**: Log all team access approvals/rejections
5. **Team Roles**: Implement team-specific roles (Admin, Member, Viewer, etc.)
6. **Single Sign-On (SSO)**: SAML/OIDC for enterprise

---

## Testing the Implementation

### Test Admin Signup
1. Go to `http://localhost:3000/admin/signup`
2. Fill form and submit
3. You should see success message
4. Go to `/admin/login`
5. Login with your email/password
6. Should redirect to `/dashboard`

### Test Access Request
1. (You need to implement Google login first)
2. Sign in with Google
3. You should be redirected to `/access-request`
4. Fill form and submit
5. Go to settings as admin → Access Requests
6. Click "Approve"
7. User should see success message
8. On next login, user can access dashboard

### Test Team Isolation
1. Create Team A with User A
2. Create Team B with User B
3. Create candidate for Team A
4. Login as User A → Should see candidate
5. Login as User B → Should NOT see candidate
6. Logout, login as User A → Can still see candidate

---

## Database Migration Instructions

### Step 1: Backup Your Database
Go to Supabase Dashboard > Database > Backups > Create Backup

### Step 2: Run Migration
1. Go to Supabase SQL Editor
2. Copy contents of `scripts/add-team-isolation.sql`
3. Paste in SQL Editor
4. Click "Run"

### Step 3: Update Existing Data
```sql
-- Assign existing users to a default team (if needed)
INSERT INTO teams (team_name, company_name) VALUES
('Default Team', 'Default Company')
ON CONFLICT DO NOTHING;

UPDATE users SET team_id = (SELECT team_id FROM teams LIMIT 1)
WHERE team_id IS NULL;
```

### Step 4: Verify
- Check teams table has records
- Check users table - all have team_id
- Check entities (candidates, etc.) - team_id column exists

---

## Supabase RLS Configuration

RLS is defined in the SQL migration, but to verify in Supabase:

1. Go to Authentication > Policies
2. You should see policies for:
   - candidates
   - vendors
   - clients
   - job_requirements
   - submissions
   - interviews
   - projects
   - timesheets
   - invoices
   - team_access_requests
   - etc.

If not visible, the SQL migration didn't run successfully.

---

## Next Steps

1. **Run the database migration** (`scripts/add-team-isolation.sql`)
2. **Implement Google OAuth** in Supabase
3. **Create Google login page** with sign-in button
4. **Update all API queries** to filter by team_id
5. **Update entity forms** to auto-set team_id
6. **Test the complete flow** (admin signup → invite user → user joins)
7. **Add email notifications** (optional but recommended)
8. **Deploy to production**

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Perelman ATS                             │
├──────────────────────┬──────────────────────────────────────┤
│  Admin Users         │  Company Members                      │
│  (Email/Password)    │  (Google OAuth)                       │
├──────────────────────┴──────────────────────────────────────┤
│                    Authentication Layer                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │         Supabase Auth (Email + Google)                 ││
│  │  - Manages auth users                                  ││
│  │  - Handles sessions                                    ││
│  └─────────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────────┤
│              Application Layer                               │
│  ┌──────────────┐        ┌──────────────┐                  │
│  │ Admin Signup │        │ Google Login │                  │
│  │ Admin Login  │        │ Access Request Form            │
│  └──────────────┘        └──────────────┘                  │
├──────────────────────────────────────────────────────────────┤
│                 Data Access Layer                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  API Queries (All filter by team_id)                  │  │
│  │  ├─ Candidates (team_id filter)                       │  │
│  │  ├─ Vendors (team_id filter)                          │  │
│  │  ├─ Clients (team_id filter)                          │  │
│  │  └─ All other entities...                             │  │
│  └───────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│                  Database Layer                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Row Level Security (RLS) Policies                    │  │
│  │  - Enforce team_id filtering at database level        │  │
│  │  - Prevents unauthorized data access                  │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Supabase PostgreSQL Database                         │  │
│  │  ├─ Teams table (company profiles)                    │  │
│  │  ├─ Users table (team_id, auth_id)                    │  │
│  │  ├─ Team Access Requests                              │  │
│  │  └─ All entity tables (candidates, vendors, etc.)    │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## Support & Troubleshooting

### Admin can't login after signup
- Check that user record was created with team_id
- Verify Supabase Auth user was created
- Check browser console for errors

### Google user sees "Access Request Pending" forever
- Check team_access_requests table for their record
- Verify status is still 'pending'
- Admin should approve in `/settings/access-requests`

### User can see other team's data
- Verify RLS policies are enabled
- Check that team_id column exists on all tables
- Run: `SELECT * FROM auth.users WHERE id = '<user_id>'` to verify session

### Queries return empty results
- Check user's team_id is not NULL
- Verify entities have team_id matching user's team
- Check RLS policies in Supabase dashboard

---

## Files Summary

| File | Purpose |
|------|---------|
| `scripts/add-team-isolation.sql` | Database migration for team isolation |
| `src/lib/supabase/auth.ts` | Core authentication functions |
| `src/lib/api/teams.ts` | Team management API |
| `src/app/api/auth/admin-signup/route.ts` | Admin signup endpoint |
| `src/app/api/access-requests/route.ts` | Access request endpoints |
| `src/app/api/access-requests/[id]/approve/route.ts` | Approval endpoint |
| `src/app/api/access-requests/[id]/reject/route.ts` | Rejection endpoint |
| `src/app/(auth)/admin/signup/page.tsx` | Admin signup form |
| `src/app/(auth)/admin/login/page.tsx` | Admin login form |
| `src/app/(app)/access-request/page.tsx` | User access request form |
| `src/app/(app)/settings/team/page.tsx` | Team settings page |
| `src/app/(app)/settings/members/page.tsx` | Team members list |
| `src/app/(app)/settings/access-requests/page.tsx` | Access requests admin page |
| `src/lib/contexts/AuthContext.tsx` | Client-side auth context |
| `src/middleware.ts` | Route protection middleware |

---

Generated with [Claude Code](https://claude.com/claude-code)
