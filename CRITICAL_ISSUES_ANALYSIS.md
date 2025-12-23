# CRITICAL ISSUES ANALYSIS - Perelman ATS

## Executive Summary

Your app is failing to allow user signup because of **3 major architectural problems**:

1. **Missing Database Tables** - `role_templates` and `template_permissions` don't exist
2. **Schema Column Mismatch** - Code expects different column names than database actually has
3. **Code References Non-existent Columns** - All role/permission helper functions use wrong names

---

## Issue #1: Missing Role Templates Table

### Problem
- `cloneRoleTemplatesForTeam()` in [role-helpers.ts:119](src/lib/utils/role-helpers.ts#L119) tries to query `role_templates` table
- This table **DOES NOT EXIST** in your Supabase database
- When a new user signs up and tries to create a team, the signup fails with "Failed to create team"

### Database Check Result
```
❌ role_templates       : NOT FOUND (404)
❌ template_permissions : NOT FOUND (404)
```

### Impact
**Every new user signup fails** because the function:
1. Gets auth user from Supabase Auth ✓
2. Calls `createTeamAsLocalAdmin()`
3. Which calls `cloneRoleTemplatesForTeam(teamId)` ❌ FAILS HERE
4. Throws: "No role templates found"
5. Team creation aborted, user record never created

---

## Issue #2: Database Schema Column Mismatch

### Problem
Your code uses DIFFERENT column names than your actual database:

#### Actual Database Schema (verified):
```
Roles table:
  - id (UUID)
  - team_id (UUID)
  - name (TEXT)              ← CODE EXPECTS: role_name
  - is_admin (BOOLEAN)       ← CODE EXPECTS: is_admin_role
  - created_at

Permissions table:
  - id (UUID)                ← CODE EXPECTS: permission_id
  - key (TEXT)               ← CODE EXPECTS: permission_key
  - name (TEXT)              ← CODE EXPECTS: permission_name
  - module (TEXT)
  - created_at
```

#### Code Expects (wrong):
```sql
-- In auth-server-v2.ts line 146-151:
.from('roles')
  .insert({
    team_id: teamId,
    role_name: template.template_name,          ← DOESN'T EXIST!
    description: template.description,          ← DOESN'T EXIST!
    is_admin_role: template.is_admin_role,      ← DOESN'T EXIST!
    is_custom: false,                           ← DOESN'T EXIST!
    based_on_template: template.template_id,    ← DOESN'T EXIST!
  })
```

### Impact
- Role creation will silently fail or insert with NULL values
- Even if it doesn't error, the roles table gets corrupted data
- Code then tries to query with wrong column names, gets no results
- Entire team creation flow breaks

---

## Issue #3: Type Definitions Don't Match Database

### Current Type Definitions
[src/types/database.ts](src/types/database.ts) defines:

```typescript
role_id: UUID          // Actual column: id
role_name: string      // Actual column: name
is_admin_role: boolean // Actual column: is_admin

permission_id: UUID    // Actual column: id
permission_key: string // Actual column: key
permission_name: string // Actual column: name
```

### Helper Function Mismatch
[role-helpers.ts:137-155](src/lib/utils/role-helpers.ts#L137) tries to:
```typescript
// WRONG - using non-existent columns:
role_name: (template as any).template_name,    ✗
description: (template as any).description,    ✗
is_admin_role: (template as any).is_admin_role,✗
is_custom: false,                              ✗
based_on_template: (template as any).template_id,✗
```

---

## Current Data State (Verified)

✓ Users: 9 records found
✓ Teams: 16 records found
✓ Roles: Exist but with wrong schema
✓ Permissions: 45 records found
✓ Team Memberships: 2 records (both approved)
✗ Role Templates: **MISSING**
✗ Template Permissions: **MISSING**

---

## User Signup Flow - Where It Breaks

```
User clicks "Sign Up"
   ↓
1. Client: Calls /api/auth/signup with email & password
   ↓
2. Server: supabase.auth.signUp() → Creates auth user ✓
   ↓
3. Server: Sends email verification link
   ↓
4. User: Clicks email link, email gets verified ✓
   ↓
5. User: Redirected to onboarding page
   ↓
6. User: Enters team name → Calls POST /api/auth/create-team
   ↓
7. Server: getCurrentUser() → Gets auth user ✓
   ↓
8. Server: createTeamAsLocalAdmin() is called
   ↓
   8a. Creates team ✓
   ↓
   8b. Calls cloneRoleTemplatesForTeam() ❌ FAILS
       - Queries role_templates table
       - Table doesn't exist
       - Throws "No role templates found"
   ↓
9. Team creation rolled back
   ↓
10. User record never created
   ↓
11. Client shows error: "Signup failed: Could not create user record"
   ↓
User stuck in onboarding, can't proceed ❌
```

---

## Root Cause Summary

| Issue | Root Cause | Severity |
|-------|-----------|----------|
| Signup fails | role_templates table missing | CRITICAL |
| Schema mismatch | Database created with different names than code expects | CRITICAL |
| Column mismatches | 5+ columns referenced in code don't exist in DB | CRITICAL |
| No templates | Even if table existed, no data to clone from | CRITICAL |
| No permissions mapped | template_permissions empty | HIGH |

---

## Solution Approach

### Phase 1: Fix Database Schema (CRITICAL)
- [x] Identify all column name mismatches
- [ ] Decide: Update database schema OR update all code references?

**RECOMMENDATION**: Update CODE to match existing database (less risky than ALTER TABLE)

### Phase 2: Create Missing Tables
- [ ] Create `role_templates` table with correct structure
- [ ] Create `template_permissions` junction table
- [ ] Populate with default role templates

### Phase 3: Update Helper Functions
- [ ] Fix `cloneRoleTemplatesForTeam()` to use correct column names
- [ ] Fix all role/permission queries to use actual columns: `id`, `name`, `key`
- [ ] Update type definitions to match database

### Phase 4: Fix Admin Approval System
- [ ] Verify pending membership approval flow works
- [ ] Create admin panel to approve pending users

### Phase 5: Test Auth Features
- [ ] Test password reset functionality
- [ ] Test email confirmation
- [ ] Test forgot password feature

---

## Next Steps

1. **Immediate (MUST FIX)**:
   - Fix column references in code to match actual database
   - Create role_templates table with sample data
   - Create template_permissions mappings

2. **High Priority**:
   - Verify admin approval system works
   - Add frontend for admins to approve pending users
   - Test full signup → team creation → first login flow

3. **Medium Priority**:
   - Implement password reset UI
   - Implement forgot password UI
   - Handle Supabase auth rate limits

---

## Files That Need Changes

- [ ] `src/lib/utils/role-helpers.ts` - Fix column names
- [ ] `src/lib/supabase/auth-server-v2.ts` - Fix column names in insertions
- [ ] `src/types/database.ts` - Update type definitions
- [ ] Supabase migrations - Create missing tables
