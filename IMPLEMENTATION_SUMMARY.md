# ATS Backend V2 - Implementation Summary

## Overview

This document summarizes the complete rebuild of the ATS (Applicant Tracking System) backend database and API architecture. The new system implements a robust multi-tenant architecture with advanced role-based permissions, master admin support, and team isolation.

## What Was Built

### 1. Database Layer (PostgreSQL via Supabase)

#### Schema ([scripts/schema-v2.sql](scripts/schema-v2.sql))
- **19 tables** implementing complete multi-tenant architecture
- **Core tables**: teams, users, roles, role_templates, permissions, role_permissions, template_permissions
- **Business entities**: candidates, vendors, clients, job_requirements, submissions, interviews, projects, timesheets, invoices, immigration
- **Audit tables**: notes, activities
- **Data integrity**: Foreign key constraints, CHECK constraints, proper cascading
- **Performance**: Indexes on all foreign keys, team_id, and frequently queried columns
- **Soft delete pattern**: deleted_at timestamps instead of hard deletes

#### Seed Data ([scripts/seed-data.sql](scripts/seed-data.sql))
- **8 role templates**: Local Admin, Sales Manager, Sales Executive, Recruiter Manager, Recruiter, Account Manager, Viewer, Finance Manager
- **70+ permissions**: Module-based CRUD pattern (e.g., candidates.create, vendors.read, submissions.update)
- **Template-permission mappings**: Pre-configured permission sets for each role template

#### RLS Policies ([scripts/rls-policies-v2.sql](scripts/rls-policies-v2.sql))
- **Simplified, consistent pattern** across all tables
- **Team isolation**: Users can only access data from their team
- **Master admin bypass**: Master admins can access all teams' data
- **Standard policy structure**:
  ```sql
  -- SELECT policy example
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.user_id = auth.uid()::text AND users.is_master_admin = true)
    OR
    team_id IN (SELECT team_id FROM users WHERE users.user_id = auth.uid()::text)
  )
  ```

### 2. TypeScript Layer

#### Type Definitions ([src/types/database.ts](src/types/database.ts))
- Complete type definitions for all 19 database tables
- Custom types:
  - `UserWithRole`: User with joined role and team data
  - `TeamContext`: Team scoping context with admin flags and permissions
  - `RoleWithPermissions`: Role with array of permission keys
  - `UserTeamInfo`: User team membership information
  - `ApiResponse<T>`: Standardized API response wrapper

#### Core Utilities

**Team Context ([src/lib/utils/team-context.ts](src/lib/utils/team-context.ts))**
- `getTeamContext()`: Get user's team context with admin flags and permissions
- `validateTeamAccess()`: Verify user has access to specific team
- `applyTeamFilter()`: Apply team filtering to Supabase queries
- `getAccessibleTeamIds()`: Get all teams a user can access (all for master admin)
- `canAccessTeam()`: Check if user can access specific team
- `getUserTeam()`: Get user's primary team
- `listAllTeams()`: List all teams (master admin only)
- `requireTeamMembership()`: Throw error if user not in team

**Permissions ([src/lib/utils/permissions.ts](src/lib/utils/permissions.ts))**
- `checkPermission()`: Check if user has specific permission
- `getUserPermissions()`: Get array of all user's permissions
- `isLocalAdmin()`: Check if user is local admin for their team
- `isMasterAdmin()`: Check if user is master admin
- `PERMISSIONS`: Constant object with all 70+ permission keys

**Role Helpers ([src/lib/utils/role-helpers.ts](src/lib/utils/role-helpers.ts))**
- Server-side functions:
  - `cloneRoleTemplatesForTeam()`: Clone all role templates for new team
  - `getTeamRoles()`: Get all roles for team
  - `getRoleWithPermissions()`: Get role with permission details
  - `createCustomRole()`: Create custom role with permissions
  - `updateRolePermissions()`: Update role's permission set
  - `deleteCustomRole()`: Delete custom role (not system templates)
  - `getLocalAdminRole()`: Get Local Admin role for team
  - `getAllRoleTemplates()`: Get all system role templates
- Client-side helpers:
  - `isMasterAdmin()`, `isLocalAdmin()`, `isAdmin()`: Check user admin status
  - `canManageRoles()`, `canManageUsers()`, `canViewTeamData()`: Permission checks

#### Authentication ([src/lib/supabase/auth.ts](src/lib/supabase/auth.ts))

**Server-side functions:**
- `getCurrentUser()`: Get authenticated user with role and team data
- `teamSignUp()`: Complete team signup workflow
  1. Create Supabase auth user
  2. Create team
  3. Clone all role templates
  4. Assign user as Local Admin
  5. Return user + team (with cleanup on failure)
- `createMasterAdmin()`: Create system administrator (team_id = NULL)
- `getCurrentUserTeamId()`: Quick team ID lookup
- `isAuthenticated()`: Check if user is authenticated
- `updateUserProfile()`: Update user profile data

**Client-side functions:**
- `signIn()`: Email/password authentication
- `signOut()`: Sign out current user

### 3. API Endpoints

All API endpoints follow the **5-step pattern**:
1. **Authenticate**: Get current user or return 401
2. **Get team context**: Determine user's team, admin status, permissions
3. **Check permissions**: Verify user has required permission (skip for master/local admin)
4. **Execute business logic**: Query/mutate data with team filtering
5. **Return standardized response**: `{ success: boolean, data?: any, error?: string }`

#### Authentication APIs

**`POST /api/auth/team-signup`** ([route.ts](src/app/api/auth/team-signup/route.ts))
- Public endpoint for team registration
- Creates team, clones roles, assigns first user as Local Admin
- Request body:
  ```typescript
  {
    email: string
    password: string
    firstName: string
    lastName: string
    companyName: string
    teamName?: string
  }
  ```
- Response: `{ success: true, data: { user, team } }`

**`POST /api/admin/create-master-admin`** ([route.ts](src/app/api/admin/create-master-admin/route.ts))
- Protected endpoint (requires existing master admin)
- Creates system administrator with global access
- Request body:
  ```typescript
  {
    email: string
    password: string
    firstName: string
    lastName: string
  }
  ```
- Response: `{ success: true, data: user }`

#### Roles API ([src/app/api/roles/route.ts](src/app/api/roles/route.ts))

**`GET /api/roles?teamId={teamId}`**
- List all roles for team
- Master admin can specify `teamId` query param to view any team's roles
- Response: `{ success: true, data: Role[] }`

**`POST /api/roles`**
- Create custom role for team
- Only local admin or master admin can create roles
- Request body:
  ```typescript
  {
    roleName: string
    description?: string
    permissionIds: string[]
  }
  ```
- Response: `{ success: true, data: Role }`

#### Candidates API (Example Entity)

**`GET /api/candidates?teamId={teamId}&status={status}&search={search}&page={page}&limit={limit}`** ([route.ts](src/app/api/candidates/route.ts))
- List candidates for team with pagination and filtering
- Supports filters: status, search (name/email), workAuthorization
- Pagination: page (default 1), limit (default 50)
- Response: `{ success: true, data: Candidate[], pagination: { page, limit, total } }`

**`POST /api/candidates`** ([route.ts](src/app/api/candidates/route.ts))
- Create new candidate for team
- Requires `candidates.create` permission
- Response: `{ success: true, data: Candidate }`

**`GET /api/candidates/[id]`** ([route.ts](src/app/api/candidates/[id]/route.ts))
- Get specific candidate by ID
- Team-scoped (except master admin)
- Response: `{ success: true, data: Candidate }`

**`PUT /api/candidates/[id]`** ([route.ts](src/app/api/candidates/[id]/route.ts))
- Update candidate
- Requires `candidates.update` permission
- Response: `{ success: true, data: Candidate }`

**`DELETE /api/candidates/[id]`** ([route.ts](src/app/api/candidates/[id]/route.ts))
- Soft delete candidate (sets deleted_at timestamp)
- Requires `candidates.delete` permission
- Response: `{ success: true, message: 'Candidate deleted successfully' }`

## Architecture Highlights

### Multi-Tenant Isolation

**Team-based isolation:**
- Each team represents a different company
- Data is strictly isolated between teams
- RLS policies enforce isolation at database level
- Application layer double-checks with team context

**Master admin pattern:**
- Master admins have `team_id = NULL` and `role_id = NULL`
- Can access any team's data by specifying `targetTeamId`
- Bypass team-scoped permission checks
- Used for platform administration

**Local admin pattern:**
- Each team has at least one Local Admin
- Full control over their team (users, roles, permissions)
- Cannot access other teams' data
- Assigned during team signup

### Role & Permission System

**Role templates:**
- System-defined role templates stored in `role_templates` table
- Cloned for each team during signup into `roles` table
- Teams can customize cloned roles or create new custom roles

**Permission structure:**
- Module-based: `{module}.{action}` (e.g., `candidates.create`)
- CRUD pattern: create, read, update, delete
- Stored in `permissions` table
- Linked to roles via `role_permissions` table

**Permission checking:**
```typescript
// In API endpoint
const hasPermission = await checkPermission(user.user_id, 'candidates.create')
if (!hasPermission) return 403

// Permissions automatically loaded in team context
const teamContext = await getTeamContext(user.user_id)
// teamContext.permissions = ['candidates.read', 'candidates.create', ...]
```

### Data Integrity

**Foreign keys:**
- All relationships enforced with foreign key constraints
- Proper cascading: `ON DELETE CASCADE` or `ON DELETE SET NULL`

**CHECK constraints:**
- User admin validation: Master admins must have NULL team/role, regular users must have both
- Status enums: Valid status values enforced at database level

**Soft deletes:**
- All entities use `deleted_at` timestamp instead of hard deletes
- Queries filter `WHERE deleted_at IS NULL`
- Audit trail preserved

## File Structure

```
d:\Perelman-ATS-claude\
├── scripts/
│   ├── schema-v2.sql          # Complete database schema
│   ├── seed-data.sql          # Role templates & permissions
│   └── rls-policies-v2.sql    # Row Level Security policies
│
├── src/
│   ├── types/
│   │   └── database.ts        # TypeScript type definitions
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts      # Client-side Supabase client
│   │   │   ├── server.ts      # Server-side Supabase client
│   │   │   └── auth.ts        # Authentication functions
│   │   │
│   │   └── utils/
│   │       ├── team-context.ts    # Team scoping utilities
│   │       ├── permissions.ts     # Permission checking
│   │       └── role-helpers.ts    # Role management
│   │
│   └── app/
│       └── api/
│           ├── auth/
│           │   └── team-signup/
│           │       └── route.ts   # Team signup endpoint
│           │
│           ├── admin/
│           │   └── create-master-admin/
│           │       └── route.ts   # Master admin creation
│           │
│           ├── roles/
│           │   └── route.ts       # Roles CRUD
│           │
│           └── candidates/
│               ├── route.ts       # List/create candidates
│               └── [id]/
│                   └── route.ts   # Get/update/delete candidate
│
└── IMPLEMENTATION_SUMMARY.md  # This file
```

## Database Setup

### Step 1: Run Schema Migration

```sql
-- In Supabase SQL Editor, run:
-- scripts/schema-v2.sql
```

This creates all 19 tables with proper constraints, indexes, and relationships.

### Step 2: Seed System Data

```sql
-- In Supabase SQL Editor, run:
-- scripts/seed-data.sql
```

This populates:
- 8 role templates
- 70+ permissions
- Template-permission mappings

### Step 3: Apply RLS Policies

```sql
-- In Supabase SQL Editor, run:
-- scripts/rls-policies-v2.sql
```

This enables RLS and creates policies for all tables.

### Step 4: Create First Master Admin (Optional)

Use Supabase Auth dashboard to create a user, then run:

```sql
INSERT INTO users (
  user_id,
  email,
  username,
  first_name,
  last_name,
  team_id,
  role_id,
  is_master_admin,
  status
) VALUES (
  'auth-user-id-from-supabase',
  'admin@example.com',
  'admin',
  'System',
  'Admin',
  NULL,
  NULL,
  true,
  'active'
);
```

Or use the API endpoint (requires existing master admin):
```bash
POST /api/admin/create-master-admin
{
  "email": "admin@example.com",
  "password": "securepassword",
  "firstName": "System",
  "lastName": "Admin"
}
```

## Usage Guide

### Creating a New Team

**Option 1: API Endpoint**
```bash
POST /api/auth/team-signup
Content-Type: application/json

{
  "email": "john@acmecorp.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe",
  "companyName": "Acme Corp",
  "teamName": "Acme Team"
}
```

**Option 2: Programmatic**
```typescript
import { teamSignUp } from '@/lib/supabase/auth'

const result = await teamSignUp({
  email: 'john@acmecorp.com',
  password: 'securepassword',
  firstName: 'John',
  lastName: 'Doe',
  companyName: 'Acme Corp',
  teamName: 'Acme Team'
})

if (result.success) {
  console.log('Team created:', result.data.team)
  console.log('User created:', result.data.user)
}
```

This automatically:
1. Creates Supabase auth user
2. Creates team record
3. Clones all 8 role templates for the team
4. Assigns user as Local Admin
5. Returns user and team data

### Checking Permissions

**In API routes:**
```typescript
import { getCurrentUser } from '@/lib/supabase/auth'
import { getTeamContext } from '@/lib/utils/team-context'
import { checkPermission } from '@/lib/utils/permissions'

export async function POST(request: NextRequest) {
  // 1. Authenticate
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Get team context
  const teamContext = await getTeamContext(user.user_id)

  // 3. Check permission
  if (!teamContext.isMasterAdmin && !teamContext.isLocalAdmin) {
    const hasPermission = await checkPermission(user.user_id, 'candidates.create')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // 4. Proceed with business logic
  // ...
}
```

**In client components:**
```typescript
'use client'
import { useEffect, useState } from 'react'
import { getCurrentUser } from '@/lib/supabase/auth'
import { isMasterAdmin, canManageRoles } from '@/lib/utils/role-helpers'

export function RolesPage() {
  const [canManage, setCanManage] = useState(false)

  useEffect(() => {
    async function checkAccess() {
      const user = await getCurrentUser()
      if (user) {
        const hasAccess = await canManageRoles(user.user_id)
        setCanManage(hasAccess)
      }
    }
    checkAccess()
  }, [])

  if (!canManage) return <div>Access denied</div>

  return <div>Roles management UI...</div>
}
```

### Querying Team-Scoped Data

**Using team context:**
```typescript
import { getTeamContext, applyTeamFilter } from '@/lib/utils/team-context'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  const teamContext = await getTeamContext(user.user_id)
  const supabase = await createServerClient()

  // Option 1: Manual team filter
  let query = supabase
    .from('candidates')
    .select('*')
    .eq('team_id', teamContext.teamId)

  // Option 2: Using applyTeamFilter helper
  query = applyTeamFilter(
    supabase.from('candidates').select('*'),
    teamContext,
    'team_id'
  )

  const { data } = await query
  return NextResponse.json({ data })
}
```

**Master admin viewing another team:**
```typescript
// GET /api/candidates?teamId=other-team-id
const searchParams = request.nextUrl.searchParams
const teamContext = await getTeamContext(user.user_id, {
  targetTeamId: searchParams.get('teamId') || undefined
})

// teamContext.teamId will be 'other-team-id' if user is master admin
// teamContext.teamId will be user's own team if not master admin
```

### Managing Roles

**List team roles:**
```typescript
import { getTeamRoles } from '@/lib/utils/role-helpers'

const roles = await getTeamRoles(teamId)
// Returns: Role[] with role_id, role_name, description, is_admin_role, etc.
```

**Get role with permissions:**
```typescript
import { getRoleWithPermissions } from '@/lib/utils/role-helpers'

const role = await getRoleWithPermissions(roleId)
// Returns: RoleWithPermissions with permissions array
```

**Create custom role:**
```typescript
import { createCustomRole } from '@/lib/utils/role-helpers'

const role = await createCustomRole(
  teamId,
  'Custom Recruiter',
  'Custom role for recruiters with limited access',
  ['candidates.read', 'candidates.create', 'submissions.read'],
  userId  // created_by
)
```

**Update role permissions:**
```typescript
import { updateRolePermissions } from '@/lib/utils/role-helpers'

const updated = await updateRolePermissions(
  roleId,
  ['candidates.read', 'candidates.update', 'candidates.delete'],
  userId  // updated_by
)
```

## Testing Checklist

### Database Layer
- [ ] Run schema-v2.sql successfully
- [ ] Run seed-data.sql successfully
- [ ] Run rls-policies-v2.sql successfully
- [ ] Verify 8 role templates exist in role_templates table
- [ ] Verify 70+ permissions exist in permissions table
- [ ] Verify template_permissions mappings exist
- [ ] Test RLS policies by querying as different users

### Team Signup
- [ ] Create first team via API endpoint
- [ ] Verify team record created
- [ ] Verify 8 roles cloned for team
- [ ] Verify role_permissions cloned correctly
- [ ] Verify user assigned as Local Admin
- [ ] Test authentication with new user
- [ ] Create second team and verify data isolation

### Master Admin
- [ ] Create master admin user
- [ ] Verify team_id and role_id are NULL
- [ ] Verify is_master_admin = true
- [ ] Test master admin can query Team A's data
- [ ] Test master admin can query Team B's data
- [ ] Test master admin can create roles for any team

### Permissions
- [ ] Assign different roles to test users
- [ ] Verify permission checks work correctly
- [ ] Test user with 'candidates.read' can GET candidates
- [ ] Test user without 'candidates.create' cannot POST candidates
- [ ] Test Local Admin bypasses permission checks
- [ ] Test Master Admin bypasses all checks

### API Endpoints
- [ ] Test POST /api/auth/team-signup
- [ ] Test POST /api/admin/create-master-admin (as master admin)
- [ ] Test POST /api/admin/create-master-admin (as non-admin, should fail)
- [ ] Test GET /api/roles
- [ ] Test POST /api/roles (as local admin)
- [ ] Test POST /api/roles (as regular user, should fail)
- [ ] Test GET /api/candidates with pagination
- [ ] Test GET /api/candidates with filters (status, search)
- [ ] Test POST /api/candidates
- [ ] Test GET /api/candidates/[id]
- [ ] Test PUT /api/candidates/[id]
- [ ] Test DELETE /api/candidates/[id] (soft delete)
- [ ] Verify deleted candidate not returned in GET requests

### Multi-Tenant Isolation
- [ ] Create User A in Team A, User B in Team B
- [ ] Verify User A cannot see Team B's candidates
- [ ] Verify User B cannot see Team A's candidates
- [ ] Verify User A cannot update Team B's candidates
- [ ] Verify RLS policies enforce isolation at database level
- [ ] Test master admin can see both teams' data

## Next Steps

### 1. Complete Remaining Entity API Endpoints

Use the candidates API as a template to create endpoints for:

- [ ] **Vendors** (`/api/vendors`)
- [ ] **Clients** (`/api/clients`)
- [ ] **Job Requirements** (`/api/job-requirements`)
- [ ] **Submissions** (`/api/submissions`)
- [ ] **Interviews** (`/api/interviews`)
- [ ] **Projects** (`/api/projects`)
- [ ] **Timesheets** (`/api/timesheets`)
- [ ] **Invoices** (`/api/invoices`)
- [ ] **Immigration** (`/api/immigration`)
- [ ] **Notes** (`/api/notes`)
- [ ] **Activities** (`/api/activities`)

### 2. Update Frontend Components

- [ ] **AuthContext** - Update to handle master admin, local admin, permissions
- [ ] **usePermissions hook** - Create hook for checking permissions in components
- [ ] **ProtectedRoute** - Update to use new permission system
- [ ] **Role Management UI** - Create pages for viewing/editing roles
- [ ] **User Management UI** - Create pages for managing team users
- [ ] **Team Settings UI** - Create page for team configuration

### 3. Additional Features

- [ ] **Audit Logging** - Auto-populate activities table on all mutations
- [ ] **Bulk Operations** - Support bulk create/update/delete for entities
- [ ] **Advanced Filtering** - Add filter builder UI for complex queries
- [ ] **Export/Import** - CSV/Excel export for all entities
- [ ] **Notifications** - Email/in-app notifications for key events
- [ ] **Team Switching** (Master Admin) - UI for master admin to switch context between teams

## Key Principles

1. **Always authenticate first** - Every endpoint must verify the user
2. **Get team context early** - Understand user's team and permissions
3. **Check permissions explicitly** - Don't rely solely on RLS
4. **Filter by team_id** - Always scope queries to user's team (unless master admin)
5. **Use soft deletes** - Set deleted_at instead of DELETE
6. **Validate all input** - Use Zod schemas for request validation
7. **Return standardized responses** - Use `{ success, data?, error? }` format
8. **Log errors** - console.error for debugging in production
9. **Set updated_by** - Track who made changes
10. **Use transactions** - For multi-step operations that must be atomic

## Support

For questions or issues with this implementation:
1. Review this document thoroughly
2. Check the example candidates API endpoint
3. Verify database schema and RLS policies are correctly applied
4. Test with different user roles and teams
5. Check Supabase logs for RLS policy violations
