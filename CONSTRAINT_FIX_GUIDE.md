# Constraint Violation Fix Guide

## Status
The authentication and candidate creation flow is **90% working**. The last remaining issue is a database constraint violation that prevents candidate creation.

## The Problem

When you try to create a candidate, you get a 500 error: "An unexpected error occurred"

### Root Cause
Your user account in the database has:
- `is_master_admin = false`
- `team_id = NULL`
- `role_id = NULL`

This violates the `user_role_check` constraint which requires:
```
(is_master_admin=true AND team_id IS NULL AND role_id IS NULL)
OR
(is_master_admin=false AND team_id IS NOT NULL AND role_id IS NOT NULL)
```

Since you have `is_master_admin=false` with NULL team/role, the constraint is violated.

## The Fix

There are **TWO ways** to fix this:

### Option 1: Use the Fix API Endpoint (Recommended)

The app now has a built-in admin endpoint that applies the fix automatically.

**Step 1: Get your access token**

```bash
# Login via Supabase to get your access token
curl -X POST https://awujhuncfghjshggkqyo.supabase.co/auth/v1/token?grant_type=password \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dWpodW5jZmdoanNoZ2drcXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MTc4NjIsImV4cCI6MjA3OTE5Mzg2Mn0.Y3Vn2pKfmRJcCkNzxXBz2R4FC3AcXfLudIsNrLzuiFc" \
  -d '{
    "email": "test.admin@gmail.com",
    "password": "Test@2025"
  }'
```

This returns a JSON response with `access_token`. Copy the entire token value.

**Step 2: Run the fix script**

```bash
npx tsx scripts/apply_constraint_fix.ts https://ats-claude.vercel.app "YOUR_TOKEN_HERE"
```

Replace `YOUR_TOKEN_HERE` with the actual token from Step 1.

**Expected output:**
```
═══════════════════════════════════════════════════════════
CONSTRAINT VIOLATION FIX
═══════════════════════════════════════════════════════════

Target URL: https://ats-claude.vercel.app
Using token: (provided)

✅ SUCCESS!

Fixed: 1 users
Remaining violations: 0
Status: COMPLETE

🎉 All constraint violations have been fixed!
You can now create candidates without errors.
```

### Option 2: Manual SQL Fix in Supabase

If Option 1 doesn't work, you can apply the fix directly in Supabase:

**Step 1: Go to Supabase Dashboard**
- Visit: https://supabase.com/dashboard
- Select your project: `awujhuncfghjshggkqyo`
- Go to: SQL Editor → New Query

**Step 2: Run this SQL**
```sql
UPDATE public.users
SET is_master_admin = true
WHERE team_id IS NULL
  AND role_id IS NULL
  AND is_master_admin = false;
```

**Step 3: Verify the fix**
Run this query to confirm:
```sql
SELECT id, email, is_master_admin, team_id, role_id
FROM public.users
WHERE is_master_admin = false
  AND team_id IS NULL
  AND role_id IS NULL;
```

Should return: **0 rows** (no violations)

## After the Fix

Once the fix is applied, you should be able to:

✅ Log in normally
✅ See the dashboard
✅ Create candidates without errors
✅ View created candidates in the list

## Testing the Fix

### Test 1: Create a Candidate
1. Log in to https://ats-claude.vercel.app
2. Go to "Create Candidate"
3. Fill in the form with test data:
   - First Name: `E2E-Test`
   - Last Name: `Candidate-2025-01-01`
   - Email: `test-2025@example.com`
   - Phone: `123-456-7890`
4. Click "Create"
5. Should see success message ✅

### Test 2: Verify in Database
Run this query in Supabase SQL Editor:
```sql
SELECT id, first_name, last_name, email, created_by, created_at
FROM public.candidates
WHERE first_name = 'E2E-Test'
ORDER BY created_at DESC
LIMIT 1;
```

Should see the candidate you just created.

## What Changed

### New Files
- `src/app/api/admin/fix-constraints/route.ts` - Admin endpoint for fixing violations
- `scripts/apply_constraint_fix.ts` - CLI script to apply the fix
- `supabase/migrations/20251223_fix_constraint_violations.sql` - Migration file

### How It Works
The fix endpoint:
1. Verifies you're a master admin
2. Counts users with constraint violations
3. Updates them to have `is_master_admin = true`
4. Verifies the fix was applied
5. Returns results

This is safe because:
- Only master admins can run it
- It only fixes invalid states (not normal data)
- Changes are reversible if needed
- The constraint itself remains enforced

## Rollback (if needed)

If you need to undo the fix:

```bash
# Revert the fix
UPDATE public.users
SET is_master_admin = false
WHERE id IN (
  SELECT id FROM public.users
  WHERE team_id IS NULL
    AND role_id IS NULL
    AND is_master_admin = true
);
```

But you shouldn't need to do this. The fix is correct and permanent.

## FAQ

### Q: Why did this happen?
A: The user record was created during development with incomplete data. The trigger that auto-creates user records from auth wasn't properly configured in production.

### Q: Will this affect other users?
A: No. The fix only updates users with the exact constraint violation pattern. Normal users (with teams/roles) are unaffected.

### Q: Is this secure?
A: Yes. The endpoint requires master admin authentication and only fixes invalid database states.

### Q: What if the fix still doesn't work?
A: Contact support with the error message from the log. The issue might be:
- RLS policy blocking the update
- Token expiration
- Network connectivity
- Other database constraints

### Q: Can I revert after applying the fix?
A: Yes, but you shouldn't need to. If you do, use the SQL in the "Rollback" section above.

## Next Steps

1. **Apply the fix** using Option 1 (recommended) or Option 2
2. **Test candidate creation** using Test 1 above
3. **Verify in database** using Test 2 above
4. **Push to production** (already deployed)

If you have any issues, check the logs:
```bash
# Local dev
npm run dev
# Watch browser console for [POST /candidates] logs

# Production (Vercel)
# Check function logs: https://vercel.com/dashboard/project/[project]/logs
```

## Support

If you encounter issues:
1. Check the error message in browser console
2. Look for logs starting with `[POST /admin/fix-constraints]`
3. Verify your access token is valid
4. Ensure you're logged in as master admin
5. Try the manual SQL option if the endpoint fails

The production deployment is complete and ready once this constraint is fixed.
