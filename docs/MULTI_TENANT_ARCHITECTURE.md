# Multi-Tenant Architecture Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture Design](#architecture-design)
3. [Request Lifecycle](#request-lifecycle)
4. [Implementation Guide](#implementation-guide)
5. [Security](#security)
6. [Master Admin Workflows](#master-admin-workflows)
7. [Adding New Tenants](#adding-new-tenants)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Perelman ATS uses a **single-database, team-based multi-tenant architecture** where:

- **One database** contains all data for all tenants (companies)
- Each tenant is identified by a `team_id` field
- **Row-Level Security (RLS) policies** enforce data isolation at the database level
- **Server-side team context** ensures secure team_id assignment

### Key Principles

1. **Never trust client**: `team_id` is ALWAYS extracted server-side from authenticated user
2. **Defense in depth**: Multiple security layers (middleware, API validation, RLS policies)
3. **Explicit validation**: Clear error messages before database operations
4. **Type safety**: TypeScript prevents accidental misuse

---

## Architecture Design

### 1. Team Context Utility

**File**: [`src/lib/utils/team-context.ts`](../src/lib/utils/team-context.ts)

The foundation of the multi-tenant system. Provides functions to:

- Extract `team_id` from authenticated user
- Validate team access
- Apply team filters to queries

#### Core Functions

```typescript
// Extract team context from authenticated user
const teamContext = await getTeamContext(userId);
// Returns: { teamId, userTeamId, isMasterAdmin, canAccessAllTeams }

// Validate user can access a resource's team
await validateTeamAccess(userId, resourceTeamId);
// Throws error if access denied

// Apply team filtering to queries
const filters = await applyTeamFilter(userId, { search: 'john' });
// Returns: { teamId: '...', isMasterAdmin: true/false, ...otherFilters }
```

### 2. API Layer Pattern

All entity APIs (candidates, clients, vendors, etc.) follow this pattern:

#### Create Operations

```typescript
export async function createCandidate(
  candidateData: Omit<CandidateInsert, 'team_id' | 'created_by' | 'updated_by'>,
  userId: string,  // REQUIRED - authenticated user ID
  options?: { skipDuplicateCheck?: boolean }
): Promise<CreateCandidateResponse> {
  // 1. Extract team context (SERVER-SIDE)
  const teamContext = await getTeamContext(userId);

  // 2. Create with server-controlled team_id
  const { data, error } = await typedInsert('candidates', {
    ...candidateData,
    team_id: teamContext.teamId, // SERVER-CONTROLLED
    created_by: userId,
    updated_by: userId,
  });

  // 3. Audit logging, activities, etc.
}
```

#### Read Operations

```typescript
export async function getCandidates(
  userId: string,  // REQUIRED for team scoping
  filters?: {
    search?: string;
    teamId?: string; // Only used by master admin
  }
): Promise<ApiResponse<CandidatesWithCount>> {
  // 1. Apply team filtering based on user's context
  const teamFilters = await applyTeamFilter(userId, filters);

  // 2. Build query
  let query = supabase.from('candidates').select('*');

  // 3. Apply team filter
  if (teamFilters.teamId) {
    query = query.eq('team_id', teamFilters.teamId);
  }
  // If teamFilters.teamId is null, master admin sees all teams
}
```

#### Update/Delete Operations

```typescript
export async function updateCandidate(
  candidateId: string,
  updates: Omit<CandidateUpdate, 'team_id' | 'updated_by'>,
  userId: string  // REQUIRED
): Promise<ApiResponse<Candidate>> {
  // 1. Get existing record
  const candidate = await getCandidateById(candidateId);

  // 2. Validate user has access to this candidate's team
  await validateTeamAccess(userId, candidate.team_id);

  // 3. Perform update (team_id cannot be changed)
  const { data, error } = await typedUpdate('candidates', 'candidate_id', candidateId, {
    ...updates,
    updated_by: userId,
  });
}
```

### 3. Frontend Integration

Frontend components no longer pass `team_id`:

```typescript
// ❌ OLD - Client-controlled team_id (INSECURE)
const candidateData = {
  first_name: 'John',
  last_name: 'Doe',
  team_id: teamId,  // From client context
};
await createCandidate(candidateData, userId);

// ✅ NEW - Server-controlled team_id (SECURE)
const candidateData = {
  first_name: 'John',
  last_name: 'Doe',
  // team_id is NOT included
};
await createCandidate(candidateData, userId);
// team_id is extracted from userId server-side
```

### 4. Database Layer (RLS Policies)

**File**: [`scripts/supabase-rls-policies.sql`](../scripts/supabase-rls-policies.sql)

Row-Level Security policies enforce team isolation at the database level:

```sql
-- Candidates Insert Policy
CREATE POLICY "candidates_insert" ON candidates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = auth.uid()::text
      AND permissions.permission_key = 'candidate.create'
      AND (
        users.is_master_admin = TRUE
        OR users.team_id = candidates.team_id  -- Must match user's team
      )
    )
  );
```

This policy ensures:
- User has `candidate.create` permission
- Either user is master admin OR `team_id` matches user's team
- **Cannot be bypassed** even if client code is compromised

---

## Request Lifecycle

### Example: Creating a Candidate

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. USER ACTION                                                      │
│    User fills out candidate form and clicks "Create"                │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 2. FRONTEND (candidates/new/page.tsx)                               │
│    const candidateData = {                                          │
│      first_name: 'John',                                            │
│      last_name: 'Doe',                                              │
│      // team_id NOT included                                        │
│    };                                                               │
│    await createCandidate(candidateData, user.user_id);             │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 3. API FUNCTION (lib/api/candidates.ts)                             │
│    export async function createCandidate(data, userId) {            │
│      // Extract team context from authenticated user (SERVER-SIDE)  │
│      const teamContext = await getTeamContext(userId);             │
│      // teamContext.teamId = 'team-abc-123'                         │
│                                                                     │
│      // Create with server-controlled team_id                       │
│      await typedInsert('candidates', {                             │
│        ...data,                                                     │
│        team_id: teamContext.teamId, // SERVER-CONTROLLED           │
│      });                                                            │
│    }                                                                │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 4. TEAM CONTEXT UTILITY (lib/utils/team-context.ts)                │
│    export async function getTeamContext(userId) {                   │
│      // Query database for user's team                              │
│      const user = await supabase                                    │
│        .from('users')                                               │
│        .select('user_id, team_id, is_master_admin')                │
│        .eq('user_id', userId)                                       │
│        .single();                                                   │
│                                                                     │
│      // Return team context                                         │
│      return {                                                       │
│        teamId: user.team_id,        // 'team-abc-123'              │
│        isMasterAdmin: user.is_master_admin,                        │
│      };                                                             │
│    }                                                                │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 5. DATABASE (Supabase/PostgreSQL)                                   │
│    INSERT INTO candidates (                                         │
│      first_name, last_name, team_id                                 │
│    ) VALUES (                                                       │
│      'John', 'Doe', 'team-abc-123'  ← Server-controlled            │
│    );                                                               │
│                                                                     │
│    ✓ RLS Policy Check:                                             │
│      users.team_id ('team-abc-123')                                │
│      = candidates.team_id ('team-abc-123')                         │
│      ✅ PASS - Insert allowed                                       │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 6. RESPONSE                                                         │
│    { data: { candidate_id: '...', team_id: 'team-abc-123', ... } } │
│    → Frontend redirects to candidate detail page                    │
└─────────────────────────────────────────────────────────────────────┘
```

### What If team_id Was Compromised?

```
┌─────────────────────────────────────────────────────────────────────┐
│ MALICIOUS ATTEMPT                                                   │
│    User tries to create candidate with wrong team_id                │
│    (e.g., by manipulating API call)                                 │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ API FUNCTION                                                        │
│    Still extracts team_id from authenticated user                   │
│    teamContext.teamId = 'team-abc-123' (user's actual team)        │
│                                                                     │
│    Malicious team_id parameter is IGNORED                           │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│ DATABASE RLS POLICY                                                 │
│    Even if somehow wrong team_id reached database:                  │
│      users.team_id ('team-abc-123')                                │
│      ≠ candidates.team_id ('team-xyz-999')                         │
│      ❌ FAIL - RLS policy violation                                 │
│      Error: "new row violates row-level security policy"           │
└─────────────────────────────────────────────────────────────────────┘

✅ Defense in Depth: Multiple layers prevent cross-tenant data leakage
```

---

## Implementation Guide

### Adding Multi-Tenant Support to a New Entity

Let's say you want to add multi-tenant support to a new `projects` entity.

#### Step 1: Update API Function Imports

```typescript
// src/lib/api/projects.ts
import { getTeamContext, applyTeamFilter, validateTeamAccess } from '@/lib/utils/team-context';
```

#### Step 2: Update Create Function

```typescript
export async function createProject(
  projectData: Omit<ProjectInsert, 'team_id' | 'created_by' | 'updated_by'>,
  userId: string,
  options?: { skipDuplicateCheck?: boolean }
): Promise<CreateProjectResponse> {
  try {
    // Extract team context (SERVER-SIDE)
    const teamContext = await getTeamContext(userId);

    if (!teamContext.teamId) {
      return { error: 'Cannot create project: User team not found.' };
    }

    // Create with server-controlled team_id
    const { data, error } = await typedInsert('projects', {
      ...projectData,
      team_id: teamContext.teamId, // SERVER-CONTROLLED
      created_by: userId,
      updated_by: userId,
    });

    if (error) return { error: error.message };

    return { data };
  } catch (err: any) {
    return { error: err.message || 'Failed to create project' };
  }
}
```

#### Step 3: Update Read Function

```typescript
export async function getProjects(
  userId: string,
  filters?: {
    search?: string;
    status?: string;
    teamId?: string; // For master admin
  }
): Promise<ApiResponse<ProjectsWithCount>> {
  try {
    // Apply team filtering
    const teamFilters = await applyTeamFilter(userId, filters);

    let query = supabase.from('projects').select('*', { count: 'exact' });

    // Apply team filter
    if (teamFilters.teamId) {
      query = query.eq('team_id', teamFilters.teamId);
    }

    // Apply other filters...
    if (filters?.search) {
      query = query.ilike('project_name', `%${filters.search}%`);
    }

    const { data, error, count } = await query;

    if (error) return { error: error.message };

    return { data: { data, count } };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch projects' };
  }
}
```

#### Step 4: Update Update/Delete Functions

```typescript
export async function updateProject(
  projectId: string,
  updates: Omit<ProjectUpdate, 'team_id' | 'updated_by'>,
  userId: string
): Promise<ApiResponse<Project>> {
  try {
    // Get existing project
    const existing = await getProjectById(projectId);
    if ('error' in existing) return existing;

    // Validate access
    await validateTeamAccess(userId, existing.data.team_id);

    // Update (team_id cannot be changed)
    const { data, error } = await typedUpdate('projects', 'project_id', projectId, {
      ...updates,
      updated_by: userId,
    });

    if (error) return { error: error.message };
    return { data };
  } catch (err: any) {
    return { error: err.message || 'Failed to update project' };
  }
}
```

#### Step 5: Update Frontend Form

```typescript
// src/app/(app)/projects/new/page.tsx
export default function NewProjectPage() {
  const { user } = useAuth(); // Don't destructure teamId

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.user_id) {
      alert('User authentication required');
      return;
    }

    const projectData = {
      project_name: formData.project_name,
      // ... other fields
      // team_id is NOT included
    };

    const result = await createProject(projectData, user.user_id);

    if ('error' in result) {
      alert('Error: ' + result.error);
      return;
    }

    router.push(`/projects/${result.data.project_id}`);
  };
}
```

---

## Security

### Threat Model

| Threat | Mitigation |
|--------|-----------|
| **Client manipulates team_id** | team_id extracted server-side from authenticated user, client input ignored |
| **User accesses another team's data** | RLS policies enforce `users.team_id = entity.team_id` at database level |
| **API bypass** | All operations require `userId`, team context validated before DB operations |
| **SQL injection** | Supabase client uses parameterized queries |
| **Missing team_id** | `getTeamContext()` throws error if user has no team (except master admin) |

### Best Practices

1. **Never trust client input for team_id**
   - ❌ DON'T: Accept `team_id` from request body/params
   - ✅ DO: Extract from `getTeamContext(userId)`

2. **Always pass userId to API functions**
   - ❌ DON'T: Make `userId` optional in API functions
   - ✅ DO: Require `userId: string` parameter

3. **Validate team access for updates/deletes**
   - ❌ DON'T: Trust that user owns the resource
   - ✅ DO: Call `validateTeamAccess(userId, resourceTeamId)`

4. **Use TypeScript to prevent mistakes**
   - ❌ DON'T: `candidateData: CandidateInsert`
   - ✅ DO: `candidateData: Omit<CandidateInsert, 'team_id' | 'created_by'>`

5. **Audit all operations**
   - Always log `teamId` in audit logs
   - Track cross-team access attempts by master admins

---

## Master Admin Workflows

Master admins have special privileges to access data across all teams.

### Viewing All Teams

```typescript
// src/lib/utils/team-context.ts
const teams = await listAllTeams(masterAdminUserId);
// Returns: [{ team_id, team_name, company_name, is_active }, ...]
```

### Filtering by Specific Team

```typescript
// Master admin can filter candidates by team
const result = await getCandidates(masterAdminUserId, {
  teamId: 'team-abc-123',  // View specific team
});

// Or see all teams
const result = await getCandidates(masterAdminUserId, {
  // No teamId filter = see all teams
});
```

### Creating Records for Specific Team

For master admins who need to create records for a specific team:

```typescript
// Option 1: Create for master admin's own team (if they have one)
await createCandidate(data, masterAdminUserId);

// Option 2: Temporarily "act as" another team
// This would require extending getTeamContext to accept targetTeamId:
const teamContext = await getTeamContext(masterAdminUserId, {
  targetTeamId: 'team-abc-123',  // Create for specific team
});
```

### Master Admin UI

Frontend should show team selector for master admins:

```typescript
export default function CandidatesListPage() {
  const { user, isMasterAdmin } = useAuth();
  const [teamFilter, setTeamFilter] = useState<string | undefined>();

  useEffect(() => {
    const fetchCandidates = async () => {
      const result = await getCandidates(user.user_id, {
        teamId: teamFilter, // Master admin can filter by team
        search: searchTerm,
      });
    };
    fetchCandidates();
  }, [teamFilter]);

  return (
    <div>
      {isMasterAdmin && (
        <TeamFilter
          value={teamFilter}
          onChange={setTeamFilter}
          allOptionLabel="All Companies"
        />
      )}
      {/* List candidates */}
    </div>
  );
}
```

---

## Adding New Tenants

### Method 1: Admin Sign Up (Recommended)

When a new company signs up, they create their own tenant:

```typescript
// src/lib/supabase/auth.ts
export async function adminSignUp(email: string, password: string, teamName: string) {
  // 1. Create auth user
  const { data: authUser, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  // 2. Create team
  const { data: team } = await supabase
    .from('teams')
    .insert({
      team_name: teamName,
      is_active: true,
    })
    .select()
    .single();

  // 3. Create user record with team_id
  await supabase
    .from('users')
    .insert({
      user_id: authUser.user.id,
      email,
      team_id: team.team_id,
      role_id: adminRoleId,
    });

  return { user: authUser.user, team };
}
```

### Method 2: Master Admin Creates Team

Master admin can create a new team and invite users:

```typescript
// 1. Master admin creates team
const { data: newTeam } = await supabase
  .from('teams')
  .insert({
    team_name: 'Acme Corp',
    company_name: 'Acme Corporation',
    is_active: true,
  })
  .select()
  .single();

// 2. Invite user to join team (via email)
await createTeamAccessRequest({
  email: 'admin@acmecorp.com',
  requested_team_id: newTeam.team_id,
  status: 'approved',
});

// 3. User signs up and gets assigned to team
```

### Team Onboarding Checklist

- [ ] Create team record in `teams` table
- [ ] Create first admin user with `team_id`
- [ ] Verify RLS policies are enabled
- [ ] Test data isolation (ensure can't see other teams' data)
- [ ] Configure team settings (max_users, subscription_tier)
- [ ] Send welcome email with login instructions

---

## Troubleshooting

### Error: "User does not belong to any team"

**Cause**: User record has `team_id = null`

**Solution**:
```sql
-- Check user's team_id
SELECT user_id, email, team_id FROM users WHERE user_id = 'user-id-here';

-- Assign user to team
UPDATE users SET team_id = 'team-id-here' WHERE user_id = 'user-id-here';
```

### Error: "new row violates row-level security policy"

**Cause**: Attempting to insert record with `team_id` that doesn't match user's team

**Solution**:
- Verify API function uses `getTeamContext(userId)` to set `team_id`
- Check user's `team_id` matches the team they're trying to create records for
- For master admin, ensure they have `is_master_admin = true`

```sql
-- Check user's team and admin status
SELECT user_id, email, team_id, is_master_admin FROM users WHERE user_id = 'user-id-here';

-- Make user master admin (if appropriate)
UPDATE users SET is_master_admin = true WHERE user_id = 'user-id-here';
```

### Error: "Access denied: You do not have permission to access this resource"

**Cause**: User trying to access another team's resource

**Solution**:
- This is expected behavior for regular users
- Verify the resource `team_id` matches user's `team_id`
- If master admin, ensure they have `is_master_admin = true`

### Master Admin Cannot See All Teams

**Cause**: `is_master_admin` flag not set or RLS policies too restrictive

**Solution**:
```sql
-- Set user as master admin
UPDATE users SET is_master_admin = true WHERE email = 'masteradmin@example.com';

-- Verify master admin policies exist
SELECT * FROM pg_policies WHERE tablename = 'candidates' AND policyname LIKE '%master%';
```

### Performance: Slow Queries on Large Datasets

**Cause**: Missing indexes on `team_id` columns

**Solution**:
```sql
-- Add indexes on team_id columns
CREATE INDEX IF NOT EXISTS idx_candidates_team ON candidates(team_id);
CREATE INDEX IF NOT EXISTS idx_clients_team ON clients(team_id);
CREATE INDEX IF NOT EXISTS idx_vendors_team ON vendors(team_id);
-- etc.
```

### TypeScript Errors: "Property 'team_id' does not exist"

**Cause**: Using `Omit<Insert, 'team_id'>` but code still tries to access `team_id`

**Solution**:
```typescript
// ❌ DON'T
function createCandidate(data: Omit<CandidateInsert, 'team_id'>) {
  console.log(data.team_id); // ERROR
}

// ✅ DO
function createCandidate(data: Omit<CandidateInsert, 'team_id'>, userId: string) {
  const teamContext = await getTeamContext(userId);
  const fullData = { ...data, team_id: teamContext.teamId };
}
```

---

## Summary

The multi-tenant architecture provides:

✅ **Security**: Multiple layers prevent cross-tenant data leakage
✅ **Simplicity**: Single database, straightforward queries
✅ **Flexibility**: Master admin can access all teams
✅ **Type Safety**: TypeScript prevents common mistakes
✅ **Maintainability**: Consistent patterns across all entities
✅ **Auditability**: All operations logged with team context

For questions or issues, refer to the source code:
- Team Context Utility: [`src/lib/utils/team-context.ts`](../src/lib/utils/team-context.ts)
- Example API: [`src/lib/api/candidates.ts`](../src/lib/api/candidates.ts)
- RLS Policies: [`scripts/supabase-rls-policies.sql`](../scripts/supabase-rls-policies.sql)
