# 🚀 Step-by-Step Guide: Apply the Signup Fix

## The Complete Solution

Your signup is blocked by **two issues that are now fixed**:

1. ✅ **Missing RLS INSERT/DELETE policies**
2. ✅ **PostgreSQL 15+ schema permission issue** (THE REAL BLOCKER)

## How to Apply the Fix

### Option 1: Quick Automatic Fix (60 seconds)

```bash
# Run this from the project root directory
node scripts/apply-rls-policies.js
```

If successful, you'll see:
```
✓ Creating policy "users_insert_service_role"... ✓
✓ Creating policy "users_delete_service_role"... ✓
✓ Creating policy "teams_insert_service_role"... ✓
✓ Creating policy "teams_delete_service_role"... ✓
✓ Creating policy "roles_insert_service_role"... ✓
✓ Creating policy "role_permissions_insert_service_role"... ✓

✅ All RLS policies successfully applied!
```

### Option 2: Manual Fix via Supabase Dashboard (Recommended)

This is more reliable since you have control over the database connection.

**Step 1:** Open Supabase Dashboard
- Go to https://supabase.com
- Sign in with your credentials
- Select project: **Perelman-ATS**

**Step 2:** Open SQL Editor
- Left sidebar → **SQL Editor**
- Click the **+** button to create a new query

**Step 3:** Copy the Fix SQL
- Open this file in your editor: `scripts/fix-rls-missing-insert-policies.sql`
- Select **ALL** the content (Ctrl+A)
- Copy it (Ctrl+C)

**Step 4:** Paste into Supabase
- In the Supabase SQL Editor text area, paste the code (Ctrl+V)
- Click the blue **Run** button (or Ctrl+Enter)

**Step 5:** Verify Success
You should see no errors. The output area should show query execution completed.

## What The Fix Does

### 1. PostgreSQL 15+ Schema Permissions (Lines 1-22)
```sql
GRANT USAGE ON SCHEMA public TO service_role;
GRANT CREATE ON SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;
```
**Purpose:** Allows service role to INSERT/UPDATE/DELETE data
**Why needed:** PostgreSQL 15 blocks non-owners from `public` schema by default

### 2. RLS Policies for Users (Lines 23-30)
```sql
CREATE POLICY "users_insert_service_role" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_delete_service_role" ON users FOR DELETE USING (true);
```
**Purpose:** Allows signup to create and cleanup user records

### 3. RLS Policies for Teams (Lines 31-38)
```sql
CREATE POLICY "teams_insert_service_role" ON teams FOR INSERT WITH CHECK (true);
CREATE POLICY "teams_delete_service_role" ON teams FOR DELETE USING (true);
```
**Purpose:** Allows signup to create and cleanup team records

### 4. RLS Policies for Roles (Lines 39-45)
```sql
CREATE POLICY "roles_insert_service_role" ON roles FOR INSERT WITH CHECK (true);
CREATE POLICY "role_permissions_insert_service_role" ON role_permissions FOR INSERT WITH CHECK (true);
```
**Purpose:** Allows role template cloning during signup

## Verify the Fix Works

**Option A: Automatic Test**
```bash
npx ts-node scripts/test_direct_rls.js
```

Expected output:
```
Testing direct insert with service role key...
✓ SUCCESS! Team created: 550e8400-e29b-41d4-a716-446655440000
```

**Option B: Manual Test via Browser**
1. Go to http://localhost:3000/admin/signup
2. Fill in the form:
   - First Name: Test
   - Last Name: User
   - Email: testuser@example.com
   - Company: Test Company
   - Password: TestPass123 (8+ chars)
3. Click "Create Account"
4. ✅ Should redirect to login with green success message
5. Login with your credentials
6. ✅ Should see the dashboard

## Troubleshooting

### "Still getting permission denied for schema public"
- The GRANT statements may not have run
- Re-run the fix SQL file
- Check you're running as the project owner

### "ERROR: policy already exists"
- This is fine! The `IF NOT EXISTS` clause handles this
- Policies already exist = they're already applied

### Test script still fails after applying fix
- Wait 2-3 minutes (Supabase needs time to sync)
- Clear browser cache (Ctrl+Shift+Delete)
- Restart your local development server

### Signup form still shows errors
- Check browser developer console (F12)
- Look for the actual error message
- Common issues:
  - Password too short (must be 8+ chars)
  - Email already registered
  - Invalid email format

## Files That Were Changed

- `scripts/supabase-rls-policies.sql` - Master RLS policy file (added schema grants)
- `scripts/fix-rls-missing-insert-policies.sql` - Focused fix file (new)
- `scripts/apply-rls-policies.js` - Auto-apply script (new)
- `FIX_SIGNUP_ISSUES.md` - Detailed documentation (new)

## Success Indicators

After applying the fix, you should be able to:

✅ Create a new admin account via signup form
✅ See account creation success message
✅ Login with your new credentials
✅ Access the dashboard
✅ View your team information
✅ Invite other users to your team

## Questions?

The full explanation is in: `FIX_SIGNUP_ISSUES.md`

## Next Steps (Optional)

After signup is working:
- Set up email verification (optional)
- Configure password reset email
- Add OAuth providers (Google, GitHub, etc)
- Set up user invitation system
- Configure audit logging
