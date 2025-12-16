# Quick Reference: Auth + RBAC System

## SQL Execution Order

```bash
# 1. Clear everything (OPTIONAL)
psql -U postgres -d postgres -f scripts/00-purge-all.sql

# 2. Setup schema
psql -U postgres -d postgres -f scripts/01-schema.sql

# 3. Setup RLS
psql -U postgres -d postgres -f scripts/02-rls.sql

# 4. Setup JWT + triggers
psql -U postgres -d postgres -f scripts/03-jwt-triggers.sql

# 5. Seed permissions
psql -U postgres -d postgres -f scripts/04-seed-permissions.sql

# 6. Seed test data (OPTIONAL)
psql -U postgres -d postgres -f scripts/05-seed-test-data.sql

# 7. Create master admin (AFTER signup)
# SELECT create_master_admin('your-email@example.com');
```

OR in Supabase Dashboard > SQL Editor, run each script in order.

## Configuration Checklist

- [ ] Run all SQL scripts (1-4 are required)
- [ ] Configure JWT Custom Claims in Supabase dashboard
  - Function: `public.get_user_jwt_claims`
  - Parameter: `auth.uid()`
- [ ] Set environment variables in `.env.local`
- [ ] Test signup flow
- [ ] Promote first user to master admin
- [ ] Test admin login

## Code Usage

### Import Auth Functions
```typescript
import { signUp, signIn, signOut, getCurrentUser } from '@/lib/auth-actions';
import { hasPermission, PERMISSIONS, getUserPermissions } from '@/lib/permissions';
import { isMasterAdmin, isTeamAdmin, isAdmin, getUserTeam } from '@/lib/auth-utils';
```

### Check Permissions (Server)
```typescript
'use server';

import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export async function createCandidate(userId: string, data: any) {
  // Check permission
  const allowed = await hasPermission(userId, PERMISSIONS.create_candidate);
  if (!allowed) throw new Error('Forbidden');

  // Create candidate...
}
```

### Check Admin Status (Server)
```typescript
import { isMasterAdmin, isTeamAdmin } from '@/lib/auth-utils';

const isMaster = await isMasterAdmin(userId);
const isTeamAdm = await isTeamAdmin(userId);

if (!isTeamAdm && !isMaster) {
  throw new Error('Admin access required');
}
```

### Get User Info
```typescript
import { getCurrentUserWithProfile, getUserTeam } from '@/lib/auth-utils';

const user = await getCurrentUserWithProfile();
const team = await getUserTeam(userId);

console.log(user.profile.email); // user email
console.log(user.profile.team_id); // team uuid
console.log(user.profile.is_master_admin); // true/false
console.log(team.name); // team name
```

### Query with RLS (Automatic)
```typescript
import { createClient } from '@/lib/supabase/server';

const supabase = await createClient();

// RLS automatically filters to user's team
const { data: candidates } = await supabase
  .from('candidates')
  .select('*')
  .eq('team_id', teamId); // User can only see their team's candidates
```

### Query without RLS (Server-side admin only)
```typescript
import { createClient } from '@/lib/supabase/server';

const supabase = await createClient();

// Direct admin query (bypasses RLS if using service role)
const { data } = await supabase
  .from('users')
  .select('*')
  .admin(); // Use admin client
```

## User Types

```
┌─ Master Admin (is_master_admin = TRUE)
│  ├─ team_id: NULL
│  ├─ role_id: NULL
│  ├─ Sees all teams
│  ├─ Can manage all users/roles
│  └─ /admin/* routes available
│
└─ Regular User (is_master_admin = FALSE)
   ├─ team_id: <UUID>
   ├─ role_id: <UUID>
   ├─ Can see only own team
   └─ Permissions based on role
      ├─ Owner (is_admin = TRUE)
      │  └─ Can manage team users/roles
      ├─ Manager (is_admin = FALSE)
      │  └─ Can create/edit business entities
      ├─ Recruiter (is_admin = FALSE)
      │  └─ Can create candidates/submissions
      └─ Viewer (is_admin = FALSE)
         └─ Read-only access
```

## API Endpoints

### Auth (Public)
- `POST /api/auth/signup` - Body: `{email, password}`
- `POST /api/auth/login` - Body: `{email, password}`
- `POST /api/auth/logout` - No body
- `POST /api/auth/reset-password` - Body: `{email}`
- `PATCH /api/auth/update-password` - Body: `{password}`

### Admin (Master Admin only)
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users` - Body: `{user_id, is_master_admin}`
- `GET /api/admin/roles?team_id=<id>` - List team roles
- `POST /api/admin/roles` - Body: `{team_id, name, is_admin}`
- `PATCH /api/admin/roles` - Body: `{role_id, permission_ids}`

## Pages

```
/                    → Login redirect
/auth/login          → User login page
/auth/signup         → Registration page
/auth/reset-password → Password reset
/admin/login         → Admin login (master admin only)
/admin/dashboard     → Admin panel (master admin only)
/dashboard           → User dashboard (authenticated)
```

## Middleware Rules

```
1. Public routes (/auth/*)
   ├─ Authenticated? → Redirect to /dashboard
   └─ Not authenticated? → Allow access

2. Protected routes (all others)
   ├─ Not authenticated? → Redirect to /auth/login
   ├─ Not master admin + accessing /admin/*? → Redirect to /dashboard
   └─ Authenticated? → Allow access

3. RLS applies to all database queries
   ├─ Master admin? → See all data
   └─ Regular user? → See only own team data
```

## Common Tasks

### Create a user role with permissions
```typescript
import { createClient } from '@/lib/supabase/server';
import { assignPermissionsToRole } from '@/lib/permissions';

const supabase = await createClient();

// 1. Create role
const { data: role } = await supabase
  .from('roles')
  .insert({ team_id: teamId, name: 'Custom Role', is_admin: false })
  .select()
  .single();

// 2. Assign permissions
await assignPermissionsToRole(role.id, [
  'view_candidates',
  'create_candidate',
  'edit_candidate',
]);
```

### Assign user to role
```typescript
const { error } = await supabase
  .from('users')
  .update({ role_id: roleId })
  .eq('id', userId);
```

### Get all users in team
```typescript
const { data: users } = await supabase
  .from('users')
  .select('id, email, roles(name, is_admin)')
  .eq('team_id', teamId);
```

### Promote user to team admin
```typescript
// 1. Get team's admin role
const { data: adminRole } = await supabase
  .from('roles')
  .select('id')
  .eq('team_id', teamId)
  .eq('is_admin', true)
  .single();

// 2. Assign to user
await supabase
  .from('users')
  .update({ role_id: adminRole.id })
  .eq('id', userId);
```

### Get user permissions
```typescript
import { getUserPermissions } from '@/lib/permissions';

const permissions = await getUserPermissions(userId);
console.log(permissions); // ['view_candidates', 'create_candidate', ...]
```

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Performance Notes

- All queries use indexes defined in schema
- RLS policies use efficient `IN` subqueries
- JWT claims cached in token (no DB roundtrip)
- Master admin check is single function call
- Permission checks use indexed queries

## Security Notes

- Master admin accounts are immutable (constraint)
- RLS policies prevent data access to other teams
- Password hashing done by Supabase Auth
- JWT tokens signed and verified by Supabase
- Service role used only server-side
- All user input validated at DB level

## Debug Commands

```sql
-- See all RLS policies
SELECT policyname, qual FROM pg_policies WHERE tablename = 'candidates';

-- Check user's team isolation
SELECT team_id FROM users WHERE id = 'USER_ID';

-- Verify permissions assigned
SELECT p.key FROM role_permissions rp
JOIN permissions p ON rp.permission_id = p.id
WHERE rp.role_id = 'ROLE_ID';

-- Test RLS (set user context)
SET "request.jwt.claim.sub" = 'USER_ID';
SELECT COUNT(*) FROM candidates; -- Should only show their team's candidates

-- Check JWT function
SELECT public.get_user_jwt_claims('USER_ID');
```

## Useful Links

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase JWT Docs](https://supabase.com/docs/guides/auth/jwt)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
