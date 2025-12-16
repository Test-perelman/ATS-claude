# Complete Auth + RBAC + Multi-Tenant Rebuild Guide

## Overview
This guide walks you through rebuilding your Supabase Auth system from scratch. The system includes:
- Clean schema design
- Row-level security (RLS)
- JWT custom claims
- Role-based access control (RBAC)
- Multi-tenant isolation
- Master admin + team admin separation

## Execution Order

### Step 1: Purge Everything (Optional but Recommended)
```sql
-- Run in Supabase SQL Editor
-- This deletes all existing auth/RBAC/multi-tenant data
scripts/00-purge-all.sql
```

### Step 2: Create Schema
```sql
-- Create all tables, indexes, triggers
scripts/01-schema.sql
```

### Step 3: Enable RLS
```sql
-- Add row-level security policies
scripts/02-rls.sql
```

### Step 4: Setup JWT + Auth Triggers
```sql
-- Create auth trigger + JWT claims function
scripts/03-jwt-triggers.sql
```

**CRITICAL:** After running this script, configure Supabase:
1. Go to Supabase Dashboard > Project Settings > Database
2. Find "Custom Claims" or "JWT Claims" section
3. Add function: `public.get_user_jwt_claims`
4. Parameter: `auth.uid()`

This enables JWT claims in every token automatically.

### Step 5: Seed Permissions
```sql
-- Insert all permission definitions
scripts/04-seed-permissions.sql
```

### Step 6: Seed Test Data (Optional)
```sql
-- Create test team with sample data
scripts/05-seed-test-data.sql
```

### Step 7: Create Master Admin
```sql
-- After a user signs up, run in SQL Editor:
SELECT create_master_admin('your-email@company.com');
```

## How It Works

### User Signup Flow
1. User signs up with email/password via `/auth/signup`
2. Supabase creates `auth.users` entry
3. Trigger `handle_auth_user_created()` fires
4. Automatically creates:
   - New team (team name = email)
   - Default "owner" role (admin=true)
   - `public.users` record

### User Login Flow
1. User signs in via `/auth/login`
2. JWT token includes custom claims:
   - `team_id`
   - `role_id`
   - `is_master_admin`
   - `is_admin`
   - `permissions[]`
3. Middleware checks auth + admin status
4. RLS policies enforce data isolation

### Permission Model
```
Master Admin (is_master_admin = TRUE)
├── Can access all teams
├── Can manage global roles/permissions
├── Cannot be deleted
└── Team/role fields are NULL

Local Admin (role.is_admin = TRUE)
├── Can access their team only
├── Can manage users/roles in team
├── Can assign permissions
└── Must have team_id + role_id

Regular User
├── Can access their team only
├── Limited by role permissions
└── Must have team_id + role_id
```

## API Routes

### Authentication
- `POST /api/auth/signup` - Register
- `POST /api/auth/login` - Sign in
- `POST /api/auth/logout` - Sign out
- `POST /api/auth/reset-password` - Send reset link
- `PATCH /api/auth/update-password` - Update password

### Admin (Master Admin only)
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users` - Update user admin status
- `GET /api/admin/roles` - List roles
- `POST /api/admin/roles` - Create role
- `PATCH /api/admin/roles` - Update role permissions

## Permission Keys

All available permissions (use in code):
```typescript
import { PERMISSIONS, hasPermission, getUserPermissions } from '@/lib/permissions';

// Check single permission
const canCreate = await hasPermission(userId, PERMISSIONS.create_candidate);

// Check multiple (any)
const canEdit = await hasAnyPermission(userId, [
  PERMISSIONS.edit_candidate,
  PERMISSIONS.manage_roles,
]);

// Check multiple (all)
const canManage = await hasAllPermissions(userId, [
  PERMISSIONS.view_candidates,
  PERMISSIONS.assign_roles,
]);

// Get all permissions
const perms = await getUserPermissions(userId);
```

Available permissions:
- **Users**: `create_user`, `view_users`, `edit_user`, `delete_user`
- **Roles**: `manage_roles`, `assign_roles`
- **Candidates**: `create_candidate`, `view_candidates`, `edit_candidate`, `delete_candidate`
- **Vendors**: `create_vendor`, `view_vendors`, `edit_vendor`, `delete_vendor`
- **Clients**: `create_client`, `view_clients`, `edit_client`, `delete_client`
- **Jobs**: `create_job`, `view_jobs`, `edit_job`, `delete_job`
- **Submissions**: `create_submission`, `view_submissions`, `edit_submission`, `delete_submission`
- **Interviews**: `create_interview`, `view_interviews`, `edit_interview`, `delete_interview`
- **Projects**: `create_project`, `view_projects`, `edit_project`, `delete_project`
- **Timesheets**: `create_timesheet`, `view_timesheets`, `edit_timesheet`, `approve_timesheet`
- **Invoices**: `create_invoice`, `view_invoices`, `edit_invoice`, `delete_invoice`
- **Immigration**: `view_immigration`, `edit_immigration`

## Pages

### Public
- `/auth/login` - User login
- `/auth/signup` - User registration
- `/auth/reset-password` - Password reset

### Admin (Master Admin only)
- `/admin/login` - Admin login
- `/admin/dashboard` - Admin dashboard
- `/admin/users` - Manage users
- `/admin/roles` - Manage roles

### Protected (Authenticated users)
- `/dashboard` - User dashboard
- `/[app]/candidates`, `/[app]/vendors`, etc. - Business entities

## Middleware

Routes protected by middleware:
- All routes except `/auth/*` require authentication
- `/admin/*` routes require master admin status
- Non-admin users trying to access `/admin/*` are redirected to `/dashboard`

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000 (or your domain)
```

## RLS Policies Explained

### Master Admin Bypass
Master admins bypass all RLS (can access all data).

### Team Isolation
Each policy follows the same pattern:
```sql
-- Master admins see everything
CREATE POLICY ... USING (is_master_admin(auth.user_id()))

-- Regular users only see their team
CREATE POLICY ... USING (team_id = get_user_team_id(auth.user_id()))
```

This ensures:
- Team A users can't see Team B data
- Master admin can see everything
- Service role can perform setup operations

## Testing

### Test Master Admin Account
1. Sign up new account: `test@example.com`
2. Promote to master admin:
   ```sql
   SELECT create_master_admin('test@example.com');
   ```
3. Login to `/admin/login`
4. You should see all teams and users

### Test Team User
1. Sign up new account: `user@example.com`
2. Verify they can access `/dashboard`
3. Check they can't access `/admin/*`
4. Verify they only see their team's data

### Test Permissions
1. Create custom role in admin panel
2. Assign specific permissions
3. Assign user to role
4. Verify they can only do what's allowed

## Troubleshooting

### JWT Claims Not Working
- Did you configure Custom Claims in Supabase settings?
- Function name should be: `public.get_user_jwt_claims`
- Parameter should be: `auth.uid()`

### RLS Blocking Inserts
- Service role needs grants: `GRANT USAGE ON SCHEMA public TO service_role`
- Already included in schema.sql

### User Can't Access Team
- Check: `users.team_id` is not NULL
- Check: `users.role_id` is not NULL
- Check: Both point to valid team/role records

### Admin Routes 403
- User must have `is_master_admin = TRUE`
- Local admins can't access `/admin/*` (by design)
- They manage their team via `/dashboard`

## Next Steps

1. Run all SQL scripts in order
2. Update environment variables
3. Configure JWT claims in Supabase dashboard
4. Create test master admin account
5. Test signup/login flows
6. Implement UI components using the provided utilities

## File Structure

```
src/
├── app/
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── reset-password/page.tsx
│   ├── admin/
│   │   ├── login/page.tsx
│   │   └── dashboard/page.tsx
│   ├── api/
│   │   ├── admin/users/route.ts
│   │   └── admin/roles/route.ts
│   └── dashboard/page.tsx
├── lib/
│   ├── auth-actions.ts (server actions)
│   ├── auth-utils.ts (helpers)
│   ├── permissions.ts (permission checks)
│   └── supabase/
│       └── server.ts
└── middleware.ts

scripts/
├── 00-purge-all.sql
├── 01-schema.sql
├── 02-rls.sql
├── 03-jwt-triggers.sql
├── 04-seed-permissions.sql
├── 05-seed-test-data.sql
└── 06-create-admin-user.sql
```
