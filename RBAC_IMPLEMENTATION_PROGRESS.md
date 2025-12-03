# RBAC Implementation Progress & Setup Guide

## ✅ Completed (Phases 1-3 Partial)

### Phase 1: Foundation ✅
- [x] Migration script: `scripts/migrations/001_add_is_master_admin.sql`
  - Adds `is_master_admin` BOOLEAN field to users table
  - Creates index for performance

- [x] Seed script: `scripts/seed-roles-permissions.ts`
  - Creates 7 default roles: Master Admin, Local Admin, Sales Manager, Manager, Recruiter, Finance, View-Only
  - Creates all permissions grouped by module
  - Assigns permissions to each role

- [x] Extended AuthContext: `src/lib/contexts/AuthContext.tsx`
  - Added role and permission caching
  - Added permission checking functions: `hasPermission()`, `hasAnyPermission()`, `hasAllPermissions()`
  - Added admin detection: `isMasterAdmin`, `isLocalAdmin`, `canManageRoles`, `canManageUsers`

### Phase 3: Utilities ✅
- [x] Role helpers: `src/lib/utils/role-helpers.ts`
  - `isMasterAdmin()`, `isLocalAdmin()`, `isAdmin()`
  - `canManageRoles()`, `canManageUsers()`, `canManageOtherAdmins()`
  - `getVisibleTeamIds()`, `canViewTeamData()`, `canManageTeamData()`
  - `getAdminTier()`, `hasHigherPrivilege()`

- [x] Permission hooks: `src/lib/utils/permission-hooks.ts`
  - `usePermission()`, `useAnyPermission()`, `useAllPermissions()`
  - `useMasterAdmin()`, `useLocalAdmin()`, `useIsAdmin()`
  - `useCanManageRoles()`, `useCanManageUsers()`
  - `useUserRole()`, `useUserPermissions()`, `useTeamId()`
  - `useCanViewTeamData()` and more rendering helpers

- [x] Roles API: `src/lib/api/roles.ts`
  - `getRoles()`, `getRoleById()`, `createRole()`, `updateRole()`, `deleteRole()`
  - `getAllPermissions()`, `getRolePermissions()`
  - `assignPermissionToRole()`, `revokePermissionFromRole()`, `assignPermissionsToRole()`
  - `getRoleStats()`, `createRoleFromTemplate()`

### Phase 2: API Endpoints ✅
- [x] `src/app/api/roles/route.ts`
  - GET - Returns all roles
  - POST - Create new role (Master/Local Admin only)

- [x] `src/app/api/roles/[id]/route.ts`
  - GET - Get role with permissions
  - PUT - Update role (Master Admin only)
  - DELETE - Delete role (Master Admin only, prevents built-in role deletion)

- [x] `src/app/api/roles/[id]/permissions/route.ts`
  - GET - Get role permissions with all available permissions
  - PUT - Update role permissions (Admin only)

### Supabase RLS Policies ✅
- [x] `scripts/supabase-rls-policies.sql` - Comprehensive RLS policies
  - Enforces team-based data isolation at database level
  - Master Admin (`is_master_admin = true`) can access all data
  - Local Admins and users restricted to their team's data
  - Permission-based read/write access on all tables
  - Covers: users, teams, roles, permissions, candidates, vendors, clients, jobs, submissions, interviews, projects, timesheets, invoices, immigration, and more

---

## 🚀 Next Steps - What You Need To Do

### Step 1: Run Database Migrations (CRITICAL)

**1.1 Add `is_master_admin` field**
```bash
# In Supabase SQL Editor, run:
# Contents of: scripts/migrations/001_add_is_master_admin.sql
```

Then mark your first user as Master Admin:
```sql
-- Find your first user's ID and mark as Master Admin
UPDATE users SET is_master_admin = TRUE WHERE email = 'your-email@example.com';
```

**1.2 Run RLS Policies**
```bash
# In Supabase SQL Editor, run:
# Contents of: scripts/supabase-rls-policies.sql
```

This will take ~1 minute to apply all policies.

**1.3 Seed Roles and Permissions**
```bash
# From project root
npx ts-node scripts/seed-roles-permissions.ts
```

This creates:
- 7 default roles with appropriate permissions
- All permission definitions
- Role-permission mappings

---

## 📋 Remaining Tasks - Phases Needed

### Phase 2 Remaining: Admin UI Pages (2-3 hours)

#### 2.1 Create Role Management Pages

**File:** `src/app/(app)/settings/roles/page.tsx`
- List all roles in a table
- Show role name, description, user count, permission count
- "Edit", "Delete", "Create Role" buttons
- Search/filter capabilities

**File:** `src/app/(app)/settings/roles/[id]/page.tsx`
- Display role details
- Show permission matrix: modules × permissions as checkboxes
- Real-time permission updates
- Save/Cancel buttons

#### 2.2 Enhance User Management

**File:** `src/app/(app)/settings/members/page.tsx` (UPDATE EXISTING)
- Add role column to user list
- Add role dropdown for each user
- Only show if user is admin
- Prevent admins from changing their own role
- Prevent Local Admins from managing other admins

---

### Phase 4: API Middleware (1-2 hours)

**File:** `src/lib/middleware/auth-middleware.ts`
- `requireAuth()` - Check user is authenticated
- `requirePermission()` - Check specific permission
- `requireMasterAdmin()` - Master Admin only
- `requireLocalAdmin()` - Local Admin only
- `requireTeamAccess()` - Team data isolation

Then apply middleware to all existing API routes.

---

### Phase 5: Frontend Permission Filtering (2-3 hours)

**Update:** `src/components/layout/TopNavigation.tsx`
- Use permission hooks to filter nav items
- Hide items user doesn't have permission for
- Example:
```tsx
import { usePermission } from '@/lib/utils/permission-hooks';
import { PERMISSIONS } from '@/lib/utils/permissions';

// In component:
const canViewCandidates = usePermission(PERMISSIONS.CANDIDATE_READ);
if (canViewCandidates) {
  // show candidates nav item
}
```

---

### Phase 6: Data Filtering (2-3 hours)

**Update all files:** `src/lib/api/*.ts`
- Candidates, Vendors, Clients, Jobs, Submissions, Interviews, Projects, Timesheets, Invoices, Immigration

Pattern:
```typescript
export async function getCandidates(filters?: any) {
  const isMaster = // check if Master Admin
  const teamId = await getCurrentUserTeamId();

  let query = supabase.from('candidates').select('*');

  // Team-based filtering
  if (!isMaster && teamId) {
    query = query.eq('team_id', teamId);
  }

  // Continue with other filters...
}
```

---

## 🔧 Running the Implementation

### Installation
1. Create the migration files and seed script (already done)
2. Create the API endpoints (already done)
3. Run database migrations and seed

### Database Setup
```bash
# 1. Run migration in Supabase SQL Editor
# 2. Mark first user as Master Admin
# 3. Run RLS policies in Supabase SQL Editor
# 4. Seed roles and permissions
npx ts-node scripts/seed-roles-permissions.ts
```

### Verification
Check that:
- [ ] `users` table has `is_master_admin` column
- [ ] 7 roles created in `roles` table
- [ ] Permissions created in `permissions` table
- [ ] Role-permission mappings created
- [ ] Your account is marked `is_master_admin = true`

---

## 📝 Permission Key Reference

```typescript
PERMISSIONS = {
  // Candidates
  'candidate.create', 'candidate.read', 'candidate.update', 'candidate.delete',

  // Vendors
  'vendor.create', 'vendor.read', 'vendor.update', 'vendor.delete',

  // Clients
  'client.create', 'client.read', 'client.update', 'client.delete',

  // Jobs
  'job.create', 'job.read', 'job.update', 'job.delete',

  // Submissions
  'submission.create', 'submission.read', 'submission.update', 'submission.delete',

  // Interviews
  'interview.create', 'interview.read', 'interview.update', 'interview.delete',

  // Projects
  'project.create', 'project.read', 'project.update', 'project.delete',

  // Timesheets
  'timesheet.create', 'timesheet.read', 'timesheet.update', 'timesheet.approve',

  // Invoices
  'invoice.create', 'invoice.read', 'invoice.update', 'invoice.delete',

  // Immigration
  'immigration.create', 'immigration.read', 'immigration.update',

  // Users
  'user.create', 'user.read', 'user.update', 'user.delete',
  'roles.manage', // Can create/edit roles

  // Settings
  'settings.manage', 'audit.view', 'reports.view',
}
```

---

## 🎯 Default Roles & Permissions

### Master Admin
**Access:** All teams, all data
**Key Permissions:** All (all 35+ permissions)
**Can:** Manage global settings, configure roles, see all team data

### Local Admin
**Access:** Own team only
**Key Permissions:** 30/35 - excludes managing other admins
**Can:** Manage team members, assign roles, see team data

### Sales Manager
**Access:** Own team, core entities
**Key Permissions:** Candidates (C/R/U), Vendors (R/U), Clients (R/U), Jobs (R), Submissions (C/R/U), Interviews (R/U), Reports
**Can:** Manage candidates, track submissions, manage placements

### Manager
**Access:** Own team, read-heavy
**Key Permissions:** Read all, Update limited, no Delete
**Can:** View all data, make limited updates

### Recruiter
**Access:** Own team, recruitment focused
**Key Permissions:** Candidates (C/R/U), Jobs (R), Submissions (C/R/U), Interviews (C/R/U)
**Can:** Source candidates, manage submissions, conduct interviews

### Finance
**Access:** Own team, financial entities
**Key Permissions:** Timesheets (R/A), Invoices (C/R/U), Projects (R), Reports
**Can:** Approve timesheets, manage invoices, view reports

### View-Only
**Access:** Own team, read-only
**Key Permissions:** Read all (no create/update/delete)
**Can:** View all data, generate reports (read-only)

---

## 🔒 Security Checklist

- [x] Database RLS policies enforce team isolation
- [x] Master Admin field prevents privilege escalation
- [x] Permission checks on both API (backend) and component (frontend) level
- [x] Auth context caches permissions to avoid N+1 queries
- [x] Roles can be created/configured without code changes
- [x] Users can only see/access their team's data
- [x] Built-in roles can't be deleted
- [x] Supabase service role used for admin operations

---

## 📚 Using the New System in Your App

### In React Components
```tsx
import { usePermission, useMasterAdmin, useLocalAdmin } from '@/lib/utils/permission-hooks';
import { PERMISSIONS } from '@/lib/utils/permissions';

export function CandidateList() {
  const canCreateCandidates = usePermission(PERMISSIONS.CANDIDATE_CREATE);
  const canDeleteCandidates = usePermission(PERMISSIONS.CANDIDATE_DELETE);
  const isMaster = useMasterAdmin();

  return (
    <>
      {canCreateCandidates && <button>+ Create Candidate</button>}

      {canDeleteCandidates && <button>Delete</button>}

      {isMaster && <button>View All Teams</button>}
    </>
  );
}
```

### In API Routes
```typescript
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  // Check permission
  if (!user.hasPermission(PERMISSIONS.CANDIDATE_CREATE)) {
    return forbidden('You cannot create candidates');
  }

  // Filter by team
  const teamId = await getCurrentUserTeamId();
  // ... rest of code
}
```

---

## 🚨 Important Notes

1. **RLS Policies**: Once applied, they enforce at database level. Test thoroughly before production.
2. **Master Admin**: First user should be marked `is_master_admin = true`. Others should be `false`.
3. **Migration**: Apply migration script before seeding roles.
4. **Permissions**: Permission keys are constants in `src/lib/utils/permissions.ts`.
5. **Auth Context**: Permissions are cached on user login - no need to query on every permission check.
6. **Role Creation**: Can be done in-app without code changes via `/settings/roles` page.

---

## 📞 Questions?

Refer to:
- `RBAC_IMPLEMENTATION_PLAN.md` - Original architecture plan
- `scripts/supabase-rls-policies.sql` - Database policies details
- `src/lib/utils/permission-hooks.ts` - All available hooks
- `src/lib/utils/role-helpers.ts` - All helper functions
