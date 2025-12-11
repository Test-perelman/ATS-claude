# 🚀 Quick Start - Fix Your Database Now

## ⚠️ CRITICAL: Run These 2 SQL Scripts

Your **code is fixed**, but your **database needs to be updated**.

---

## Step 1: Fix Database (5 minutes)

### Open Supabase SQL Editor
1. Go to https://app.supabase.com
2. Select your project
3. Click **SQL Editor** → **New Query**

### Run Fix Script
1. Open file: **[scripts/fix-database-issues.sql](scripts/fix-database-issues.sql)**
2. Copy **entire contents**
3. Paste into Supabase SQL Editor
4. Click **Run**
5. ✅ Verify: `✓ ALL FIXES APPLIED SUCCESSFULLY`

**This adds:**
- `is_master_admin` column to users table
- Removes NOT NULL constraint from `team_id`
- Creates necessary indexes

---

## Step 2: Create Master Admin (2 minutes)

### Update Script with Your Email
1. Open file: **[scripts/create-master-admin.sql](scripts/create-master-admin.sql)**
2. Find line 20:
   ```sql
   admin_email TEXT := 'your-admin@example.com'; -- ⚠️ CHANGE THIS!
   ```
3. **Replace** `'your-admin@example.com'` with your actual admin email

### Run Script
1. Copy **entire contents** (with your email)
2. Paste into Supabase SQL Editor
3. Click **Run**
4. ✅ Verify: `✓ MASTER ADMIN CREATED SUCCESSFULLY`

---

## Step 3: Test (1 minute)

1. **Restart** your development server
2. **Hard refresh** browser (Ctrl+Shift+R / Cmd+Shift+R)
3. **Log out** and **log back in**
4. Try **creating a record** (client, candidate, vendor, etc.)

### ✅ Success Criteria
- No "can't find user's teamID" errors
- Master admin can see all teams' data
- Regular users see only their team's data

---

## 📋 What Was Fixed

### ✅ Code Changes (Already Done)
- Added `is_master_admin` field to TypeScript types
- Fixed schema definition for `team_id` (now nullable)
- Removed all type casting (properly typed now)

### ⏳ Database Changes (You Need To Do)
- Add `is_master_admin` column → **Run scripts/fix-database-issues.sql**
- Remove `team_id NOT NULL` constraint → **Run scripts/fix-database-issues.sql**
- Set master admin user → **Run scripts/create-master-admin.sql**

---

## 🆘 Troubleshooting

### Still Getting Errors?

**Check if scripts ran successfully:**
```sql
-- Verify is_master_admin column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('team_id', 'is_master_admin');

-- Check master admin user
SELECT email, is_master_admin, team_id FROM users WHERE is_master_admin = true;
```

**Expected Results:**
- `team_id` → `is_nullable: YES`
- `is_master_admin` → `data_type: boolean`, `is_nullable: YES`
- At least one user with `is_master_admin = true`

---

## 📚 Need More Info?

- **Detailed Guide**: [DATABASE_FIX_GUIDE.md](DATABASE_FIX_GUIDE.md)
- **Complete Summary**: [FIXES_SUMMARY.md](FIXES_SUMMARY.md)
- **Architecture Docs**: [docs/MULTI_TENANT_ARCHITECTURE.md](docs/MULTI_TENANT_ARCHITECTURE.md)

---

## 💡 Remember

1. **Run both SQL scripts** - Code is fixed, database is not
2. **Update email** in create-master-admin.sql before running
3. **Restart server** and **hard refresh** browser after
4. **Log out/in** to get fresh user data

---

**Time to fix: ~8 minutes total** ⏱️

Good luck! 🚀
