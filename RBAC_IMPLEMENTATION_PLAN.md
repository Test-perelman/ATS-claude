# Role-Based Access Control (RBAC) Implementation Plan

## Overview
Implement a flexible, configurable RBAC system where:
- **Master Admin**: Complete access across all teams, can configure roles/permissions
- **Local Admin**: Admin for their team only, can assign roles to users
- **Other Roles**: Sales Manager, Manager, Recruiter, Finance, View-Only (configurable)
- **Team Isolation**: Users see only their team's data; Master Admin sees all teams
- **Dynamic Configuration**: Permissions can be configured at runtime via admin UI

---

## Current State Analysis

### ✅ What Already Exists
1. **Database Schema**: Teams, Users, Roles, Permissions, Role_Permissions tables
2. **Auth System**: Supabase auth + team-based multi-tenancy
3. **Permission Utilities**: `permissions.ts` with helper functions
4. **Auth Context**: Provides user + team data
5. **API Pattern**: Type-safe Supabase queries with team filtering
6. **Middleware**: Basic auth + team access routing

### ❌ What Needs Implementation
1. **Master Admin Identification**: Need way to distinguish Master Admin vs Local Admin
2. **Permission Caching**: Role permissions not cached in context (causes N+1 queries)
3. **Frontend Permission Checks**: No hooks/utilities for checking permissions in components
4. **API Middleware**: No middleware to enforce permissions on API routes
5. **Role Management UI**: No interface to configure roles and permissions
6. **User Management Enhancement**: Need to add role assignment UI
7. **Master Admin Data Visibility**: No logic to show all teams' data to Master Admin
8. **Navigation Permission Filtering**: No logic to hide nav items based on permissions

---

## Implementation Architecture

### 1. Database Schema Updates

#### Add `is_master_admin` field to `users` table
```sql
ALTER TABLE users ADD COLUMN is_master_admin BOOLEAN DEFAULT FALSE;
```
**Purpose**: Identify Master Admin users. Only they can see all teams' data and manage across teams.

#### Ensure proper role structure
- Create default roles if not exist:
  - Master Admin (id: master-admin)
  - Local Admin (id: local-admin)
  - Sales Manager (id: sales-manager)
  - Manager (id: manager)
  - Recruiter (id: recruiter)
  - Finance (id: finance)
  - View-Only (id: view-only)

#### Create default permissions (if not exist)
Already defined in `permissions.ts`, but ensure they exist in database:
- `candidate.create/read/update/delete`
- `vendor.create/read/update/delete`
- `client.create/read/update/delete`
- `job.create/read/update/delete`
- `submission.create/read/update/delete`
- `interview.create/read/update/delete`
- `project.create/read/update/delete`
- `timesheet.create/read/update/delete/approve`
- `invoice.create/read/update/delete`
- `immigration.create/read/update`
- `user.create/read/update/delete`
- `settings.manage`
- `audit.view`
- `reports.view`
- `roles.manage` (new - ability to configure roles/permissions)

---

### 2. Enhanced Auth Context

**File**: `src/lib/contexts/AuthContext.tsx`

Add to context:
```typescript
interface AuthContextType {
  // ... existing
  user: UserWithRole | null;
  isMasterAdmin: boolean;
  isLocalAdmin: boolean;
  userRole: string | null;
  userPermissions: string[]; // Cached permissions
  hasPermission: (permissionKey: string) => boolean;
  hasAnyPermission: (keys: string[]) => boolean;
  hasAllPermissions: (keys: string[]) => boolean;
  canManageRoles: boolean; // Master or Local Admin
  visibleTeams: string[]; // All teams for Master Admin, own team for Local Admin
}
```

**Changes**:
- Fetch user's role on auth initialization
- Cache user permissions from role_permissions table
- Identify if user is Master Admin or Local Admin
- Provide permission checking functions

---

### 3. New Utility Files

#### `src/lib/utils/role-helpers.ts`
```typescript
- isMasterAdmin(user) → boolean
- isLocalAdmin(user, role) → boolean
- canManageUsers(user) → boolean (Master or Local Admin)
- canManageRoles(user) → boolean (Master or Local Admin)
- canViewTeamData(user, dataTeamId) → boolean (team isolation logic)
- getVisibleTeamIds(user) → string[] (Master Admin: all, Local Admin: own team)
```

#### `src/lib/utils/permission-hooks.ts`
```typescript
- usePermission(permissionKey: string) → boolean
- useAnyPermission(keys: string[]) → boolean
- useAllPermissions(keys: string[]) → boolean
- useMasterAdmin() → boolean
- useLocalAdmin() → boolean
- useCanManageRoles() → boolean
- useCanManageUsers() → boolean
```

#### `src/lib/api/roles.ts`
```typescript
- getRoles() → Promise<Role[]> (all roles in system)
- getRoleById(roleId) → Promise<Role & permissions>
- createRole(name, description) → Promise<Role>
- updateRole(roleId, updates) → Promise<Role>
- deleteRole(roleId) → Promise<void>
- getRolePermissions(roleId) → Promise<Permission[]>
- assignPermissionToRole(roleId, permissionId) → Promise<void>
- revokePermissionFromRole(roleId, permissionId) → Promise<void>
- getAllPermissions() → Promise<Permission[]> (grouped by module)
```

---

### 4. API Middleware & Protection

#### Create `src/lib/middleware/auth-middleware.ts`
```typescript
- requireAuth(request) → boolean | NextResponse
- requirePermission(request, permissionKey) → boolean | NextResponse
- requireMasterAdmin(request) → boolean | NextResponse
- requireLocalAdmin(request) → boolean | NextResponse
- requireTeamAccess(request, dataTeamId) → boolean | NextResponse
```

**Pattern for API routes**:
```typescript
export async function POST(request: NextRequest) {
  // Require permission
  const authError = await requirePermission(request, PERMISSIONS.CANDIDATE_CREATE);
  if (authError instanceof NextResponse) return authError;

  // Get user team ID for filtering
  const teamId = await getCurrentUserTeamId();

  // API logic here...
}
```

---

### 5. New Admin Pages

#### `src/app/(app)/settings/roles/page.tsx`
- **Access**: Local Admin + Master Admin only
- **Features**:
  - List all roles (Local Admin sees team roles, Master Admin sees all)
  - Create new role
  - Edit role name/description
  - Manage permissions for each role (checkbox matrix: modules × permissions)
  - Delete role (with validation)
  - Copy permissions from existing role
- **Visual**: Table with roles, matrix UI for permission assignment

#### `src/app/(app)/settings/roles/[id]/page.tsx`
- Detail page for editing single role
- Show all permissions grouped by module
- Checkboxes to grant/revoke permissions
- Real-time updates with Save button

---

### 6. Enhanced User Management

#### Update `src/app/(app)/settings/members/page.tsx`
- **New features**:
  - Show current role for each user
  - Dropdown to change user's role
  - Only Local/Master Admin can change roles
  - Show "Master Admin" indicator for Master Admin users
  - Filter by role
  - Search by name/email
  - Restrict actions based on role hierarchy (can't delete another Master Admin)

---

### 7. Navigation & UI Filtering

#### Update `src/components/layout/TopNavigation.tsx`
```typescript
- Use usePermission() to conditionally show nav items
- Hide items user doesn't have permission for
- Example: Hide "Reports" nav item if user doesn't have REPORTS_VIEW
```

**Navigation Permission Map**:
```typescript
const navItems = [
  { href: '/dashboard', label: 'Dashboard', permission: null }, // Everyone
  { href: '/candidates', label: 'Candidates', permission: PERMISSIONS.CANDIDATE_READ },
  { href: '/vendors', label: 'Vendors', permission: PERMISSIONS.VENDOR_READ },
  { href: '/clients', label: 'Clients', permission: PERMISSIONS.CLIENT_READ },
  // ... etc
  { href: '/settings/roles', label: 'Roles', permission: 'roles.manage', admin: true },
];
```

#### Update `src/components/layout/TopNavigation.tsx`
- Only show if user has permission or is Admin

---

### 8. Data Filtering by Team

#### Update all API helper functions in `src/lib/api/*.ts`
- Add team filtering to all queries:
  ```typescript
  // For Local Admin and regular users
  if (!isMasterAdmin) {
    query = query.eq('team_id', userTeamId);
  }
  // Master Admin sees all
  ```
- Examples: `candidates.ts`, `clients.ts`, `vendors.ts`, etc.

---

### 9. Supabase Security Rules (Optional but Recommended)

Create RLS (Row-Level Security) policies to enforce team isolation at database level:

```sql
-- Users can only see their own team's data
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_isolation" ON candidates
  FOR SELECT USING (
    team_id = auth.uid()::text OR
    EXISTS (SELECT 1 FROM users WHERE is_master_admin = TRUE AND user_id = auth.uid())
  );
```

---

## Implementation Steps

### Phase 1: Foundation (2-3 tasks)
1. Add `is_master_admin` field to users table
2. Create/seed default roles and permissions in database
3. Extend AuthContext with role + permissions caching

### Phase 2: Admin Interfaces (3-4 tasks)
4. Create Role Management page and API (`src/app/(app)/settings/roles`)
5. Enhance User Management page (`src/app/(app)/settings/members`)
6. Create role editing sub-page (`src/app/(app)/settings/roles/[id]`)
7. Create role API endpoints

### Phase 3: Permission Utilities (2-3 tasks)
8. Create role-helper utilities (`src/lib/utils/role-helpers.ts`)
9. Create permission hooks (`src/lib/utils/permission-hooks.ts`)
10. Create roles API helper (`src/lib/api/roles.ts`)

### Phase 4: API Protection (2 tasks)
11. Create auth middleware (`src/lib/middleware/auth-middleware.ts`)
12. Apply middleware to all API routes

### Phase 5: Frontend Protection (2-3 tasks)
13. Update TopNavigation to filter items by permission
14. Add permission checks to existing pages
15. Create "Unauthorized" error page

### Phase 6: Data Filtering (3-4 tasks)
16. Update all API helpers to filter by team
17. Handle Master Admin team visibility override
18. Test team isolation end-to-end

---

## File Changes Summary

### New Files (10)
- `src/lib/utils/role-helpers.ts`
- `src/lib/utils/permission-hooks.ts`
- `src/lib/api/roles.ts`
- `src/lib/middleware/auth-middleware.ts`
- `src/app/(app)/settings/roles/page.tsx`
- `src/app/(app)/settings/roles/[id]/page.tsx`
- `src/app/(app)/settings/roles/[id]/layout.tsx`
- `src/app/api/roles/route.ts`
- `src/app/api/roles/[id]/route.ts`
- `src/app/api/roles/[id]/permissions/route.ts`
- `src/app/(app)/error-403.tsx` (Unauthorized page)

### Modified Files (8-10)
- `src/types/database.ts` (update User type)
- `src/lib/contexts/AuthContext.tsx`
- `src/lib/supabase/auth.ts`
- `src/components/layout/TopNavigation.tsx`
- `src/app/(app)/settings/members/page.tsx`
- `src/lib/api/candidates.ts` (team filtering)
- `src/lib/api/clients.ts` (team filtering)
- `src/lib/api/vendors.ts` (team filtering)
- ... (all other entity API files)

---

## Role Hierarchy & Permissions Examples

### Master Admin Role
- **Access**: All teams, all data, all features
- **Can Do**: Manage all users across teams, configure roles globally, view audit logs
- **Permissions**: All permissions set to allowed=true

### Local Admin Role
- **Access**: Only their team's data
- **Can Do**: Assign roles to team members, allot access requests, manage team settings
- **Permissions**: Most permissions but team-scoped
- **Cannot Do**: See other teams' data, manage other admins, change global config

### Sales Manager Role
- **Access**: Team's candidate, vendor, client, job data
- **Can Do**: Create/manage candidates, view submissions, manage vendors/clients
- **Cannot Do**: Delete candidates, manage finance, manage users

### Finance Role
- **Access**: Team's invoice, timesheet, project data
- **Can Do**: Create/approve invoices, view timesheets
- **Cannot Do**: Manage candidates, manage vendors, manage users

### View-Only Role
- **Access**: Read-only on most modules
- **Can Do**: View candidates, clients, vendors, jobs
- **Cannot Do**: Create, update, delete anything

---

## Security Considerations

1. **Frontend & Backend**: Permission checks on both frontend (UX) and backend (security)
2. **Team Isolation**: Always filter queries by team_id, except for Master Admin
3. **Master Admin Flag**: Only set in database by trusted admin
4. **Token Expiry**: User permissions should be re-validated periodically
5. **Audit Logging**: Log role changes and permission modifications
6. **No Permission Elevation**: Users can't grant themselves higher permissions

---

## Testing Strategy

1. **Unit Tests**: Test permission helper functions
2. **Integration Tests**: Test role assignment → permission visibility
3. **E2E Tests**:
   - Master Admin: Can see all teams
   - Local Admin: Can only see own team
   - User role changes: UI updates after login
   - Permission denial: Correct error shown
   - API protection: Unauthorized requests rejected

---

## Configuration for Later

Since you mentioned wanting flexibility, the system is designed to allow:
- Creating custom roles at runtime (no code changes needed)
- Assigning permissions to roles via UI
- Dynamically hiding/showing features based on role permissions
- Team-specific permission configurations (if needed later)
- Role inheritance/templates (if needed later)

All configurable via `/settings/roles` admin page.
