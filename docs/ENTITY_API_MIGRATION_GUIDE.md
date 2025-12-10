# Entity API Migration Guide

## Overview

This document provides the exact pattern for migrating all remaining entity APIs to the secure multi-tenant architecture.

**Completed:**
- ✅ [candidates.ts](../src/lib/api/candidates.ts)
- ✅ [clients.ts](../src/lib/api/clients.ts)
- ✅ [vendors.ts](../src/lib/api/vendors.ts)

**To Migrate:**
- ⏳ requirements.ts
- ⏳ submissions.ts
- ⏳ interviews.ts
- ⏳ projects.ts
- ⏳ timesheets.ts
- ⏳ invoices.ts
- ⏳ immigration.ts

---

## Migration Pattern

Every entity API file should follow this exact pattern:

### 1. Update Imports

```typescript
/**
 * [Entity] API Functions
 *
 * Multi-Tenant Architecture:
 * - All create/update/delete operations require authenticated userId
 * - team_id is ALWAYS extracted server-side from user context
 * - NEVER trust team_id from client requests
 * - Master admins can optionally specify target team via filters
 */

import { supabase, typedInsert, typedUpdate } from '@/lib/supabase/client';
// ... other imports ...
import { getTeamContext, applyTeamFilter, validateTeamAccess } from '@/lib/utils/team-context';
import type { Database } from '@/types/database';
import type { ApiResponse, ApiVoidResponse } from '@/types/api';
```

### 2. Update `get*` Functions (List)

**Before:**
```typescript
export async function getRequirements(filters?: {
  search?: string;
  teamId?: string;
  userTeamId?: string;
  isMasterAdmin?: boolean;
}) {
  let query = supabase.from('job_requirements').select('*');

  if (filters?.isMasterAdmin) {
    if (filters?.teamId) {
      query = query.eq('team_id', filters.teamId);
    }
  } else if (filters?.userTeamId) {
    query = query.eq('team_id', filters.userTeamId);
  }

  // ... rest of query
}
```

**After:**
```typescript
export async function getRequirements(
  userId: string,  // REQUIRED
  filters?: {
    search?: string;
    teamId?: string;  // Only for master admin
  }
) {
  // Apply team filtering based on user's context
  const teamFilters = await applyTeamFilter(userId, filters);

  let query = supabase.from('job_requirements').select('*');

  // Apply team filter
  if (teamFilters.teamId) {
    query = query.eq('team_id', teamFilters.teamId);
  }
  // If teamFilters.teamId is null, master admin sees all teams

  // ... rest of query
}
```

### 3. Update `create*` Functions

**Before:**
```typescript
export async function createRequirement(
  data: RequirementInsert,  // Contains team_id from client
  userId?: string,          // Optional
  teamId?: string           // From client
) {
  const { data, error } = await typedInsert('job_requirements', {
    ...data,
    team_id: teamId || null,  // Client-controlled
    created_by: userId || null,
  });
}
```

**After:**
```typescript
export async function createRequirement(
  data: Omit<RequirementInsert, 'team_id' | 'created_by' | 'updated_by'>,  // team_id excluded
  userId: string  // REQUIRED
) {
  // Extract team context from authenticated user (SERVER-SIDE)
  const teamContext = await getTeamContext(userId);

  if (!teamContext.teamId) {
    return { error: 'Cannot create requirement: User team not found. Please contact your administrator.' };
  }

  const { data, error } = await typedInsert('job_requirements', {
    ...data,
    team_id: teamContext.teamId,  // SERVER-CONTROLLED
    created_by: userId,
    updated_by: userId,
  });

  // ... audit logging with teamId
}
```

### 4. Update `update*` Functions

**Before:**
```typescript
export async function updateRequirement(
  id: string,
  updates: RequirementUpdate,
  userId?: string  // Optional
) {
  const { data, error } = await typedUpdate('job_requirements', 'job_id', id, {
    ...updates,
    updated_by: userId || null,
  });
}
```

**After:**
```typescript
export async function updateRequirement(
  id: string,
  updates: Omit<RequirementUpdate, 'team_id' | 'updated_by'>,  // team_id excluded
  userId: string  // REQUIRED
) {
  // Get existing record
  const existing = await getRequirementById(id);
  if ('error' in existing) return existing;

  // Validate user has access to this record's team
  await validateTeamAccess(userId, existing.data.team_id);

  const { data, error } = await typedUpdate('job_requirements', 'job_id', id, {
    ...updates,
    updated_by: userId,
  });

  // ... audit logging
}
```

### 5. Update `delete*` Functions

**Before:**
```typescript
export async function deleteRequirement(
  id: string,
  userId?: string  // Optional
) {
  const { error } = await supabase
    .from('job_requirements')
    .delete()
    .eq('job_id', id);
}
```

**After:**
```typescript
export async function deleteRequirement(
  id: string,
  userId: string  // REQUIRED
) {
  // Get existing record
  const existing = await getRequirementById(id);
  if ('error' in existing) return existing;

  // Validate user has access to this record's team
  await validateTeamAccess(userId, existing.data.team_id);

  const { error } = await supabase
    .from('job_requirements')
    .delete()
    .eq('job_id', id);

  // ... audit logging with teamId
}
```

---

## Entity-Specific Details

### requirements.ts (Job Requirements)

**Table**: `job_requirements`
**Primary Key**: `job_id`
**Entity Type**: `requirement` or `job`

**Key Functions to Update:**
- `getRequirements(userId, filters?)` - List with team filter
- `getRequirementById(jobId)` - Single fetch (no changes needed)
- `createJobRequirement(data, userId)` - Create with server-side team_id
- `updateJobRequirement(jobId, updates, userId)` - Update with validation
- `deleteJobRequirement(jobId, userId)` - Delete with validation

**Special Considerations:**
- May have relationships with vendors and clients
- Ensure vendor/client belong to same team

### submissions.ts

**Table**: `submissions`
**Primary Key**: `submission_id`
**Entity Type**: `submission`

**Key Functions to Update:**
- `getSubmissions(userId, filters?)`
- `getSubmissionById(submissionId)`
- `createSubmission(data, userId)`
- `updateSubmission(submissionId, updates, userId)`
- `deleteSubmission(submissionId, userId)`

**Special Considerations:**
- References `candidate_id` and `job_id`
- Validate candidate and job belong to user's team
- Add this validation in create:
  ```typescript
  // Validate candidate belongs to user's team
  const candidate = await getCandidateById(data.candidate_id);
  await validateTeamAccess(userId, candidate.data.team_id);

  // Validate job belongs to user's team
  const job = await getRequirementById(data.job_id);
  await validateTeamAccess(userId, job.data.team_id);
  ```

### interviews.ts

**Table**: `interviews`
**Primary Key**: `interview_id`
**Entity Type**: `interview`

**Key Functions to Update:**
- `getInterviews(userId, filters?)`
- `getInterviewById(interviewId)`
- `createInterview(data, userId)`
- `updateInterview(interviewId, updates, userId)`
- `deleteInterview(interviewId, userId)`

**Special Considerations:**
- References `submission_id`
- Validate submission belongs to user's team

### projects.ts

**Table**: `projects`
**Primary Key**: `project_id`
**Entity Type**: `project`

**Key Functions to Update:**
- `getProjects(userId, filters?)`
- `getProjectById(projectId)`
- `createProject(data, userId)`
- `updateProject(projectId, updates, userId)`
- `deleteProject(projectId, userId)`

**Special Considerations:**
- References `candidate_id`, `client_id`, `vendor_id`
- Validate all referenced entities belong to user's team

### timesheets.ts

**Table**: `timesheets`
**Primary Key**: `timesheet_id`
**Entity Type**: `timesheet`

**Key Functions to Update:**
- `getTimesheets(userId, filters?)`
- `getTimesheetById(timesheetId)`
- `createTimesheet(data, userId)`
- `updateTimesheet(timesheetId, updates, userId)`
- `deleteTimesheet(timesheetId, userId)`

**Special Considerations:**
- References `project_id` and `candidate_id`
- Validate project belongs to user's team

### invoices.ts

**Table**: `invoices`
**Primary Key**: `invoice_id`
**Entity Type**: `invoice`

**Key Functions to Update:**
- `getInvoices(userId, filters?)`
- `getInvoiceById(invoiceId)`
- `createInvoice(data, userId)`
- `updateInvoice(invoiceId, updates, userId)`
- `deleteInvoice(invoiceId, userId)`

**Special Considerations:**
- References `project_id`, `client_id`, `timesheet_id`
- Validate all referenced entities belong to user's team

### immigration.ts

**Table**: `immigration`
**Primary Key**: `immigration_id`
**Entity Type**: `immigration`

**Key Functions to Update:**
- `getImmigrationRecords(userId, filters?)`
- `getImmigrationById(immigrationId)`
- `createImmigration(data, userId)`
- `updateImmigration(immigrationId, updates, userId)`
- `deleteImmigration(immigrationId, userId)`

**Special Considerations:**
- References `candidate_id`
- Validate candidate belongs to user's team

---

## Frontend Form Updates

For each entity that has a create form, update to remove `teamId`:

**Before:**
```typescript
const { user, teamId } = useAuth();

const data = {
  requirement_name: formData.name,
  team_id: teamId,  // ❌ Client-controlled
};

await createRequirement(data, user.user_id, teamId);
```

**After:**
```typescript
const { user } = useAuth();  // No teamId needed

const data = {
  requirement_name: formData.name,
  // team_id NOT included
};

await createRequirement(data, user.user_id);
```

### Forms to Update

1. **requirements/new/page.tsx**
2. **submissions/new/page.tsx**
3. **interviews/new/page.tsx**
4. **projects/new/page.tsx**
5. **timesheets/new/page.tsx**
6. **invoices/new/page.tsx**
7. **immigration/new/page.tsx**

---

## Testing Checklist

For each migrated entity:

### Create Operations
- [ ] Create record as regular user → should succeed with user's team_id
- [ ] Verify record has correct team_id in database
- [ ] Try to create without authentication → should fail

### Read Operations
- [ ] List records as regular user → should only see own team
- [ ] List records as master admin → should see all teams
- [ ] Filter by specific team as master admin → should work

### Update Operations
- [ ] Update own team's record → should succeed
- [ ] Try to update another team's record → should fail (Access denied)
- [ ] Update as master admin → should succeed for any team

### Delete Operations
- [ ] Delete own team's record → should succeed
- [ ] Try to delete another team's record → should fail (Access denied)
- [ ] Delete as master admin → should succeed for any team

### Cross-Team References
- [ ] Try to create submission with another team's candidate → should fail
- [ ] Try to create project with another team's client → should fail
- [ ] All referenced entities must belong to same team

---

## Quick Migration Checklist

For each entity API file:

1. [ ] Add team context imports
2. [ ] Update header comment with multi-tenant note
3. [ ] Update `get*` list function: add `userId` parameter, use `applyTeamFilter`
4. [ ] Update `create*` function:
   - Change signature: `Omit<Insert, 'team_id' | 'created_by' | 'updated_by'>`
   - Make `userId` required (not optional)
   - Add `const teamContext = await getTeamContext(userId)`
   - Set `team_id: teamContext.teamId` in insert
   - Add `teamId` to audit logs
5. [ ] Update `update*` function:
   - Change signature: `Omit<Update, 'team_id' | 'updated_by'>`
   - Make `userId` required (not optional)
   - Add `await validateTeamAccess(userId, existing.team_id)`
   - Add `teamId` to audit logs
6. [ ] Update `delete*` function:
   - Make `userId` required (not optional)
   - Add `await validateTeamAccess(userId, existing.team_id)`
   - Add `teamId` to audit logs
7. [ ] Update frontend form(s) to remove `teamId` from data object

---

## Example: Complete requirements.ts Migration

See [candidates.ts](../src/lib/api/candidates.ts) or [clients.ts](../src/lib/api/clients.ts) or [vendors.ts](../src/lib/api/vendors.ts) for complete working examples.

The pattern is identical for all entities - just replace entity names and field names accordingly.

---

## Need Help?

If you encounter issues during migration:

1. Check that user has `team_id` set: `SELECT user_id, email, team_id FROM users WHERE user_id = 'xxx'`
2. Check RLS policies are enabled: `SELECT * FROM pg_policies WHERE tablename = 'entity_table'`
3. Verify API function signature matches pattern above
4. Check frontend is not passing `teamId` in data object
5. Review [MULTI_TENANT_ARCHITECTURE.md](./MULTI_TENANT_ARCHITECTURE.md) for troubleshooting

---

## Migration Priority

Recommend migrating in this order based on typical ATS workflow:

1. ✅ **candidates** (done)
2. ✅ **clients** (done)
3. ✅ **vendors** (done)
4. **requirements** (job postings) - next
5. **submissions** (candidate applications) - next
6. **interviews** - next
7. **projects** (placements) - after submissions
8. **timesheets** - after projects
9. **invoices** - after timesheets
10. **immigration** - anytime

This ensures core workflow entities are secure first.
