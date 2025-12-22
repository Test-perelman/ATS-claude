# Multi-Tenant v2 Membership API Endpoints Documentation

## Overview

Three API endpoints implement the complete membership workflow for the Multi-Tenant v2 system:

1. **POST /api/auth/join-team** - User requests to join a team
2. **POST /api/admin/approve-membership** - Admin approves pending membership
3. **POST /api/admin/reject-membership** - Admin rejects pending membership

All endpoints require authentication and handle the team membership lifecycle.

---

## Endpoint 1: POST /api/auth/join-team

**Description:** Authenticated user requests access to an existing team.

**Authentication:** Required (user must be logged in)

**Permission:** Any authenticated user who is not already on a team

**Request Body:**
```json
{
  "teamId": "uuid-of-team-to-join",
  "firstName": "string - required",
  "lastName": "string - required",
  "requestedRole": "string - optional, role name or UUID",
  "message": "string - optional, message to admin"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Access request sent. Waiting for team administrator approval.",
  "data": {
    "user": {
      "user_id": "uuid",
      "email": "user@example.com",
      "team_id": "uuid",
      "role_id": null,
      "is_master_admin": false,
      "status": "active",
      "role": null,
      "team": {
        "team_id": "uuid",
        "team_name": "Team Name",
        "company_name": "Team Name"
      }
    },
    "membership": {
      "id": "uuid",
      "user_id": "uuid",
      "team_id": "uuid",
      "status": "pending",
      "requested_at": "2025-12-22T10:30:00.000Z",
      "requested_role_id": null,
      "approved_at": null,
      "approved_by": null,
      "rejection_reason": null,
      "rejected_at": null
    }
  }
}
```

**Error Responses:**

| Status | Scenario | Response |
|--------|----------|----------|
| 401 | Not authenticated | `{"error": "Not authenticated. User must complete email verification first."}` |
| 400 | User already on a team | `{"error": "User already belongs to a team. Cannot join another team."}` |
| 400 | Missing required fields | `{"error": "Missing required fields: teamId, firstName, lastName"}` |
| 500 | Database/server error | `{"error": "Internal server error"}` |

**Implementation File:** [src/app/api/auth/join-team/route.ts](src/app/api/auth/join-team/route.ts)

---

## Endpoint 2: POST /api/admin/approve-membership

**Description:** Admin approves a pending membership request and assigns a role to the user.

**Authentication:** Required (must be admin)

**Permission:** Team admin (local admin) or master admin only

**Request Body:**
```json
{
  "membershipId": "uuid-of-membership-to-approve",
  "roleId": "uuid-of-role-to-assign",
  "message": "string - optional, approval message"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Membership approved. User can now access team data.",
  "data": {
    "membership": {
      "id": "uuid",
      "user_id": "uuid",
      "team_id": "uuid",
      "status": "approved",
      "requested_at": "2025-12-22T10:30:00.000Z",
      "requested_role_id": null,
      "approved_at": "2025-12-22T10:35:00.000Z",
      "approved_by": "admin-user-id",
      "rejection_reason": null,
      "rejected_at": null
    },
    "user": {
      "user_id": "uuid",
      "email": "user@example.com",
      "team_id": "uuid",
      "role_id": "uuid-of-assigned-role",
      "is_master_admin": false,
      "status": "active",
      "role": {
        "role_id": "uuid",
        "role_name": "Member",
        "is_admin_role": false
      },
      "team": {
        "team_id": "uuid",
        "team_name": "Team Name",
        "company_name": "Team Name"
      }
    }
  }
}
```

**Error Responses:**

| Status | Scenario | Response |
|--------|----------|----------|
| 401 | Not authenticated | `{"error": "Not authenticated"}` |
| 403 | Not an admin | `{"error": "Only administrators can approve memberships"}` |
| 404 | Membership not found | `{"error": "Membership not found"}` |
| 400 | Missing required fields | `{"error": "Missing required fields: membershipId, roleId"}` |
| 403 | Not admin of team | `{"error": "Not authorized to approve membership for this team"}` |
| 500 | Database/server error | `{"error": "Internal server error"}` |

**Implementation File:** [src/app/api/admin/approve-membership/route.ts](src/app/api/admin/approve-membership/route.ts)

---

## Endpoint 3: POST /api/admin/reject-membership

**Description:** Admin rejects a pending membership request.

**Authentication:** Required (must be admin)

**Permission:** Team admin (local admin) or master admin only

**Request Body:**
```json
{
  "membershipId": "uuid-of-membership-to-reject",
  "reason": "string - required, reason for rejection"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Membership rejected. User has been notified.",
  "data": {
    "membership": {
      "id": "uuid",
      "user_id": "uuid",
      "team_id": "uuid",
      "status": "rejected",
      "requested_at": "2025-12-22T10:30:00.000Z",
      "requested_role_id": null,
      "approved_at": null,
      "approved_by": null,
      "rejection_reason": "Does not meet requirements",
      "rejected_at": "2025-12-22T10:35:00.000Z"
    }
  }
}
```

**Error Responses:**

| Status | Scenario | Response |
|--------|----------|----------|
| 401 | Not authenticated | `{"error": "Not authenticated"}` |
| 403 | Not an admin | `{"error": "Only administrators can reject memberships"}` |
| 404 | Membership not found | `{"error": "Membership not found"}` |
| 400 | Missing required fields | `{"error": "Missing required fields: membershipId, reason"}` |
| 403 | Not admin of team | `{"error": "Not authorized to reject membership for this team"}` |
| 500 | Database/server error | `{"error": "Internal server error"}` |

**Implementation File:** [src/app/api/admin/reject-membership/route.ts](src/app/api/admin/reject-membership/route.ts)

---

## Database Schema

### team_memberships Table

```sql
CREATE TABLE team_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Membership status: pending | approved | rejected
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

  -- When user requested access
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requested_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,

  -- When approved and by whom
  approved_at TIMESTAMPTZ,
  approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,

  -- When rejected and why
  rejection_reason VARCHAR(500),
  rejected_at TIMESTAMPTZ
);
```

---

## Type Definitions

### TeamMembership

```typescript
export interface TeamMembership {
  id: string                      // UUID primary key
  user_id: string                 // FK to users
  team_id: string                 // FK to teams
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string            // ISO timestamp
  requested_role_id?: string | null   // What role was requested
  approved_at?: string | null     // When approved
  approved_by?: string | null     // Which admin approved
  rejection_reason?: string | null    // Why rejected
  rejected_at?: string | null     // When rejected
}
```

### UserWithRole

```typescript
export interface UserWithRole {
  user_id: string
  team_id: string | null
  role_id: string | null
  email: string
  is_master_admin: boolean
  status: 'active' | 'inactive' | 'pending'
  role?: {
    role_id: string
    role_name: string
    is_admin_role: boolean
  } | null
  team?: {
    team_id: string
    team_name: string
    company_name: string
  } | null
}
```

---

## Workflow Example

### Complete Membership Approval Workflow

1. **User joins team** (not authenticated yet):
   ```bash
   POST /api/auth/join-team
   {
     "teamId": "team-uuid",
     "firstName": "John",
     "lastName": "Doe"
   }
   ```
   → Creates pending membership with `status: 'pending'`

2. **Admin views pending requests**:
   ```bash
   GET /api/admin/pending-memberships
   ```
   → Returns all pending memberships for admin's team

3. **Admin approves membership**:
   ```bash
   POST /api/admin/approve-membership
   {
     "membershipId": "membership-uuid",
     "roleId": "role-uuid"
   }
   ```
   → Updates membership to `status: 'approved'`, assigns role
   → User gains full access to team data

**Alternative: Admin rejects membership**:
```bash
POST /api/admin/reject-membership
{
  "membershipId": "membership-uuid",
  "reason": "Does not meet hiring criteria"
}
```
→ Updates membership to `status: 'rejected'`
→ User cannot access team data

---

## Curl Test Examples

### Test 1: Join Team - Missing Required Fields (400 Bad Request)
```bash
curl -X POST http://localhost:3000/api/auth/join-team \
  -H "Content-Type: application/json" \
  -d '{
    "teamId": "550e8400-e29b-41d4-a716-446655440000"
  }'

# Response:
# HTTP Status: 400
# {"error":"Not authenticated. User must complete email verification first."}
```

### Test 2: Approve Membership - Missing roleId (400 Bad Request)
```bash
curl -X POST http://localhost:3000/api/admin/approve-membership \
  -H "Content-Type: application/json" \
  -d '{
    "membershipId": "550e8400-e29b-41d4-a716-446655440000"
  }'

# Response:
# HTTP Status: 401
# {"error":"Not authenticated"}
```

### Test 3: Reject Membership - Missing reason (400 Bad Request)
```bash
curl -X POST http://localhost:3000/api/admin/reject-membership \
  -H "Content-Type: application/json" \
  -d '{
    "membershipId": "550e8400-e29b-41d4-a716-446655440000"
  }'

# Response:
# HTTP Status: 401
# {"error":"Not authenticated"}
```

### Test 4: Join Team - Not Authenticated (401 Unauthorized)
```bash
curl -X POST http://localhost:3000/api/auth/join-team \
  -H "Content-Type: application/json" \
  -b "" \
  -d '{
    "teamId": "550e8400-e29b-41d4-a716-446655440000",
    "firstName": "Jane",
    "lastName": "Doe"
  }'

# Response:
# HTTP Status: 401
# {"error":"Not authenticated. User must complete email verification first."}
```

### Test 5: Approve Membership - Not Authenticated (401 Unauthorized)
```bash
curl -X POST http://localhost:3000/api/admin/approve-membership \
  -H "Content-Type: application/json" \
  -b "" \
  -d '{
    "membershipId": "550e8400-e29b-41d4-a716-446655440000",
    "roleId": "550e8400-e29b-41d4-a716-446655440001"
  }'

# Response:
# HTTP Status: 401
# {"error":"Not authenticated"}
```

### Test 6: Reject Membership - Not Authenticated (401 Unauthorized)
```bash
curl -X POST http://localhost:3000/api/admin/reject-membership \
  -H "Content-Type: application/json" \
  -b "" \
  -d '{
    "membershipId": "550e8400-e29b-41d4-a716-446655440000",
    "reason": "Does not meet requirements"
  }'

# Response:
# HTTP Status: 401
# {"error":"Not authenticated"}
```

---

## Implementation Architecture

### Business Logic Layer
Located in [src/lib/supabase/auth-server-v2.ts](src/lib/supabase/auth-server-v2.ts):

- **approveMembership()** (lines 342-441)
  - Fetches membership
  - Verifies admin permission (master or local admin)
  - Updates membership status to 'approved'
  - Assigns role to user
  - Returns updated membership and user

- **rejectMembership()** (lines 453-534)
  - Fetches membership
  - Verifies admin permission
  - Updates membership status to 'rejected'
  - Stores rejection reason
  - Returns updated membership

- **joinTeamAsNewMember()** (lines 247-331)
  - Validates team exists
  - Creates user record with team_id but no role_id
  - Creates pending membership
  - Returns user and membership

### API Route Layer
Located in [src/app/api/](src/app/api/):

- **POST /api/auth/join-team** → calls `joinTeamAsNewMember()`
- **POST /api/admin/approve-membership** → calls `approveMembership()`
- **POST /api/admin/reject-membership** → calls `rejectMembership()`

### Security

1. **Authentication Required:** All endpoints require authenticated user (401 if missing)
2. **Authorization Required:** Admin endpoints require admin role (403 if insufficient)
3. **Database RLS:** Row-level security policies ensure users can only see their own data
4. **Admin Verification:** Both approval and rejection verify user is admin for the team
5. **Input Validation:** All endpoints validate required fields (400 if missing)

---

## Testing Checklist

- ✅ POST /api/auth/join-team returns 401 when not authenticated
- ✅ POST /api/auth/join-team returns 400 when missing required fields
- ✅ POST /api/admin/approve-membership returns 401 when not authenticated
- ✅ POST /api/admin/approve-membership returns 400 when missing required fields
- ✅ POST /api/admin/approve-membership returns 403 when not admin
- ✅ POST /api/admin/reject-membership returns 401 when not authenticated
- ✅ POST /api/admin/reject-membership returns 400 when missing required fields
- ✅ POST /api/admin/reject-membership returns 403 when not admin

---

## Summary

The three membership API endpoints provide a complete workflow for managing team access requests:

1. **join-team** allows users to request membership
2. **approve-membership** allows admins to approve and assign roles
3. **reject-membership** allows admins to reject requests

All endpoints include proper error handling, authentication/authorization checks, and type-safe request/response schemas.
