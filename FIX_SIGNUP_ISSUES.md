# 🔧 Fix for User Signup and Authentication Issues

## Problem Summary

Users cannot sign up for accounts because the Supabase database has **Row-Level Security (RLS) enabled but missing critical INSERT and DELETE policies**. These policies are required for the signup process to work.

### Symptoms
- ❌ "Failed to fetch user data" error on login page
- ❌ Signup attempts fail with permission denied errors
- ❌ Users created in Supabase Authentication are not synced to the database
- ❌ Admin signup page shows errors

### Root Cause
The RLS policies defined in `scripts/supabase-rls-policies.sql` only include **SELECT and UPDATE** policies for the core tables (`users`, `teams`, `roles`, `role_permissions`), but **no INSERT or DELETE policies** for the service role to perform signup operations.

When signup is attempted:
1. Supabase Auth user is created (works)
2. Team record needs to be inserted → **BLOCKED** (no INSERT policy)
3. Signup fails, auth user is deleted for cleanup → **BLOCKED** (no DELETE policy)

## Solution

### Step 1: Apply the RLS Policies

You have two options:

#### Option A: Automatic Application (Recommended)
```bash
node scripts/apply-rls-policies.js
```

This script attempts to automatically apply all required policies to your Supabase database.

#### Option B: Manual Application (Via Supabase Dashboard)

1. Go to [Supabase Dashboard](https://supabase.com)
2. Navigate to your project: **Perelman-ATS**
3. Go to **SQL Editor**
4. Create a new query and paste the contents of:
   ```
   scripts/fix-rls-missing-insert-policies.sql
   ```
5. Click **Run** to execute all statements

### Step 2: Verify the Fix

Run the test script to confirm policies are in place:
```bash
npx ts-node scripts/test_direct_rls.js
```

Expected output:
```
Testing direct insert with service role key...
✓ SUCCESS! Team created: [team-id]
```

### Step 3: Test Signup

1. Navigate to http://localhost:3000/admin/signup
2. Fill in the signup form:
   - First Name: Test
   - Last Name: User
   - Email: test@example.com
   - Company Name: Test Company
   - Password: TestPassword123 (8+ characters)
3. Click "Create Account"
4. You should be redirected to the login page with a success message
5. Log in with your credentials and verify access to the dashboard

## Technical Details

### Policies Added

The following policies enable the service role (used by signup APIs) to perform necessary operations:

#### Users Table
- **`users_insert_service_role`** - Allows inserting new user records during signup
- **`users_delete_service_role`** - Allows deleting user records if signup fails (cleanup)

#### Teams Table
- **`teams_insert_service_role`** - Allows inserting new team records during signup
- **`teams_delete_service_role`** - Allows deleting team records if signup fails (cleanup)

#### Roles Table
- **`roles_insert_service_role`** - Allows inserting cloned role templates for new teams

#### Role_Permissions Table
- **`role_permissions_insert_service_role`** - Allows inserting role-permission associations for cloned roles

### How Signup Works (After Fix)

1. **User submits signup form** → POST `/api/auth/admin-signup`
2. **Create Supabase auth user** → Uses Supabase auth endpoint (no RLS)
3. **Create team record** → Uses service role + `teams_insert_service_role` policy ✓
4. **Clone role templates** → Uses service role + `roles_insert_service_role` policy ✓
5. **Create user record** → Uses service role + `users_insert_service_role` policy ✓
6. **On success** → Redirect to login with success message
7. **On failure** → Delete auth user using `users_delete_service_role` policy ✓ (cleanup)

### RLS Security Model

The system uses a secure multi-level approach:

```
┌─────────────────────────────────────┐
│  Public Routes (No Auth Required)   │
│  - /admin/signup                    │
│  - /admin/login                     │
│  - /access-request                  │
└────────┬────────────────────────────┘
         │
         ├─ Uses Service Role (via API)
         │  - INSERT operations (signup)
         │  - Can bypass normal RLS for system operations
         │
┌────────▼────────────────────────────┐
│  Authenticated Routes (Auth Required)│
│  - /dashboard                       │
│  - /candidates, /clients, etc       │
└────────┬────────────────────────────┘
         │
         ├─ Uses authenticated user (via session)
         │  - Can only SELECT/UPDATE own team's data
         │  - Master admins can see all teams
         │  - RLS policies enforce team isolation
         │
```

## Files Modified

- `scripts/supabase-rls-policies.sql` - Updated with new service role policies
- `scripts/fix-rls-missing-insert-policies.sql` - New file with just the fixes
- `scripts/apply-rls-policies.js` - New script to auto-apply policies

## Troubleshooting

### Policy Application Failed
If the auto-apply script fails:
1. Go to Supabase SQL Editor manually
2. Copy the SQL from `scripts/fix-rls-missing-insert-policies.sql`
3. Paste and execute in the editor

### Still Getting "Failed to fetch user data"
1. Confirm all policies were created in Supabase dashboard:
   - SQL Editor → "Policies" tab
   - Verify you see the new policies listed
2. Check browser console for detailed error messages
3. Check Supabase function logs in the dashboard

### Test Script Returns 429 (Rate Limit)
Wait a few minutes and try again. Supabase enforces rate limits on free tier.

## Next Steps

After applying these policies:

1. ✅ Users can sign up successfully
2. ✅ Auth users are synced to the database
3. ✅ Teams and roles are created automatically
4. ✅ Login works correctly
5. ✅ Dashboard access is restricted by team

Then you can:
- Set up email verification (optional)
- Configure authentication providers (OAuth, etc)
- Set up audit logging
- Create admin UI for user management

## References

- Supabase RLS Documentation: https://supabase.com/docs/guides/auth/row-level-security
- Service Role vs Auth Role: https://supabase.com/docs/guides/api#service-role
- PostgreSQL CREATE POLICY: https://www.postgresql.org/docs/current/sql-createpolicy.html
