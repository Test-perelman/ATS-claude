# RLS Migration Complete

## Migration File
`supabase/migrations/20251212231264_reset_rls.sql`

## Key Fixes Applied

### 1. Type Corrections
- `_rls_current_user_team_id()` returns `uuid` (was text)
- `_rls_current_user_id()` returns `text` (correct)
- `_rls_is_master_admin()` returns `boolean` (correct)

### 2. Policies Created for All 18 Tables
- teams
- roles
- users
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
- notes
- activities
- role_permissions
- role_templates
- permissions
- template_permissions

### 3. RLS Logic
Each table has SELECT/INSERT/UPDATE/DELETE policies with:
- **Master Admin Access**: `_rls_is_master_admin()` - full access across all teams
- **Tenant Isolation**: `team_id = _rls_current_user_team_id()` - users only see their team's data
- **User Self-Access**: For users table, `user_id = _rls_current_user_id()`

### 4. Template Tables
- `role_templates`, `permissions`, `template_permissions`
- Readable by any authenticated user
- Writable only by master admins

## Important Notes

### Service Role Key Bypass
- Service role from Supabase JS client DOES NOT bypass RLS
- Service role only bypasses RLS when used via direct SQL/CLI
- JS client always enforces RLS regardless of key used
- Use `createAdminClient()` from `src/lib/supabase/server.ts` for admin operations

### Testing
- RLS is enforced at database level
- All admin operations use `createAdminClient()` which handles auth properly
- Master admin users have `is_master_admin = true` in users table
- Regular users are scoped to their `team_id`

## Migration is Idempotent
- All DROP statements use `IF EXISTS`
- Safe to re-run if needed
- Use `npx supabase migration repair --status reverted <timestamp>` to reset migration state

## Verification
The migration was successfully applied with:
```bash
npx supabase db push --linked
```

All policies are now in place and enforcing:
- Row-level security per team
- Master admin elevation
- User self-access for profile data
