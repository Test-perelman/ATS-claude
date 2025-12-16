# Test Suite: Auth + RBAC System

## Database Layer Tests

### Test 1: Schema Creation
```sql
-- Verify all tables exist
SELECT COUNT(*) as table_count FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- Expected: 16 tables
```

### Test 2: RLS Enabled
```sql
-- Verify RLS is enabled on all tables
SELECT COUNT(*) as rls_enabled FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;
-- Expected: 16 tables with RLS
```

### Test 3: Functions Exist
```sql
-- Verify all functions exist
SELECT COUNT(*) as functions_count FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION';
-- Expected: 5+ functions
```

### Test 4: Permissions Seeded
```sql
-- Verify permissions inserted
SELECT COUNT(*) as permission_count FROM permissions;
-- Expected: 40+ permissions
```

### Test 5: Create User Trigger
```sql
-- Verify trigger exists
SELECT COUNT(*) as trigger_count FROM pg_trigger
WHERE tgname = 'auth_user_created';
-- Expected: 1
```

## Auth Tests

### Test 6: Signup Flow
```typescript
// src/lib/auth-actions.ts - signUp
import { signUp } from '@/lib/auth-actions';

const result = await signUp('testuser@example.com', 'TestPassword123!');
expect(result.data).toBeDefined();
expect(result.data.user.email).toBe('testuser@example.com');
```

### Test 7: User Auto-Creation
```sql
-- After signup, verify user was created
SELECT id, email, team_id, role_id, is_master_admin FROM users
WHERE email = 'testuser@example.com';

-- Expected:
-- id: (uuid from auth.users)
-- email: testuser@example.com
-- team_id: (auto-generated uuid)
-- role_id: (auto-generated uuid for owner role)
-- is_master_admin: false
```

### Test 8: Team Auto-Creation
```sql
-- Verify team was created with email as name
SELECT id, name FROM teams WHERE name = 'testuser@example.com';
-- Expected: Team record created
```

### Test 9: Owner Role Creation
```sql
-- Verify owner role was created
SELECT id, name, is_admin FROM roles
WHERE team_id = (SELECT team_id FROM users WHERE email = 'testuser@example.com')
AND name = 'owner';
-- Expected: is_admin = true
```

### Test 10: Login Flow
```typescript
import { signIn } from '@/lib/auth-actions';

const result = await signIn('testuser@example.com', 'TestPassword123!');
// Should redirect to /dashboard
expect(result).toBeUndefined(); // Server action redirects
```

### Test 11: Get Current User
```typescript
import { getCurrentUserWithProfile } from '@/lib/auth-utils';

const user = await getCurrentUserWithProfile();
expect(user).toBeDefined();
expect(user.auth.email).toBe('testuser@example.com');
expect(user.profile.team_id).toBeDefined();
expect(user.profile.is_master_admin).toBe(false);
```

## RLS Tests

### Test 12: Master Admin Bypasses RLS
```sql
-- Set up test context
BEGIN;
SET "request.jwt.claim.sub" = 'MASTER_ADMIN_ID';
SET "request.jwt.claim.is_master_admin" = 'true';

-- Master admin should see all candidates regardless of team
SELECT COUNT(*) FROM candidates;
-- Expected: All candidates (not filtered)

ROLLBACK;
```

### Test 13: User Sees Only Own Team Data
```sql
-- Set up test context
BEGIN;
SET "request.jwt.claim.sub" = 'REGULAR_USER_ID';
SET "request.jwt.claim.team_id" = 'USER_TEAM_ID';

-- Regular user only sees their team's candidates
SELECT COUNT(*) FROM candidates WHERE team_id = 'USER_TEAM_ID';
-- Expected: Only their team's records

-- Try to access other team (should return 0)
SELECT COUNT(*) FROM candidates WHERE team_id = 'OTHER_TEAM_ID';
-- Expected: 0 records (RLS blocks)

ROLLBACK;
```

### Test 14: RLS Blocks Insert to Other Team
```sql
BEGIN;
SET "request.jwt.claim.sub" = 'REGULAR_USER_ID';
SET "request.jwt.claim.team_id" = 'USER_TEAM_ID';

-- Try to insert candidate for different team
INSERT INTO candidates (id, team_id, first_name, last_name, email)
VALUES (uuid_generate_v4(), 'OTHER_TEAM_ID', 'Hacker', 'User', 'hack@example.com');
-- Expected: Error - RLS policy blocks insertion

ROLLBACK;
```

## Permission Tests

### Test 15: Permission Assignment
```typescript
import { assignPermissionsToRole } from '@/lib/permissions';

await assignPermissionsToRole(roleId, [
  'view_candidates',
  'create_candidate',
  'edit_candidate',
]);

// Verify assignment
const perms = await getRolePermissions(roleId);
expect(perms).toContain('view_candidates');
expect(perms).toContain('create_candidate');
expect(perms.length).toBe(3);
```

### Test 16: Permission Check
```typescript
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

// User has permission
const canView = await hasPermission(userId, PERMISSIONS.view_candidates);
expect(canView).toBe(true);

// User doesn't have permission
const canDelete = await hasPermission(userId, PERMISSIONS.delete_candidate);
expect(canDelete).toBe(false);
```

### Test 17: Master Admin Has All Permissions
```typescript
const permissions = await getUserPermissions(masterAdminId);
expect(permissions.length).toBeGreaterThan(30); // Should have all
```

### Test 18: Regular User Limited Permissions
```typescript
const permissions = await getUserPermissions(regularUserId);
expect(permissions.length).toBeLessThan(15); // Limited based on role
```

## Admin Tests

### Test 19: Master Admin Promotion
```sql
-- Promote user to master admin
UPDATE users SET is_master_admin = TRUE
WHERE email = 'testuser@example.com';

-- Verify promotion
SELECT is_master_admin FROM users
WHERE email = 'testuser@example.com';
-- Expected: true
```

### Test 20: Master Admin Can't Have Team/Role
```sql
-- Try to assign team to master admin
UPDATE users SET team_id = 'SOME_TEAM_ID'
WHERE is_master_admin = true;
-- Expected: Error - constraint violation
```

### Test 21: Admin API Access Control
```typescript
import { fetch } from 'node-fetch';

// As regular user
const regularResponse = await fetch('/api/admin/users', {
  headers: { 'Authorization': `Bearer ${regularUserToken}` }
});
expect(regularResponse.status).toBe(403);

// As master admin
const adminResponse = await fetch('/api/admin/users', {
  headers: { 'Authorization': `Bearer ${masterAdminToken}` }
});
expect(adminResponse.status).toBe(200);
expect(adminResponse.data).toBeArray();
```

### Test 22: Update User Admin Status
```typescript
const response = await fetch('/api/admin/users', {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${masterAdminToken}` },
  body: JSON.stringify({
    user_id: userId,
    is_master_admin: true,
  })
});

expect(response.status).toBe(200);
expect(response.data.is_master_admin).toBe(true);
```

## JWT Token Tests

### Test 23: JWT Token Contains Claims
```typescript
// After login, decode JWT token
import jwt_decode from 'jwt-decode';

const decoded = jwt_decode(token);
expect(decoded.team_id).toBeDefined();
expect(decoded.role_id).toBeDefined();
expect(decoded.is_master_admin).toBe(false);
expect(decoded.is_admin).toBe(true);
expect(Array.isArray(decoded.permissions)).toBe(true);
```

### Test 24: JWT Token Updates on Login
```typescript
// Login, get token
const token1 = await getJWT();

// Update user permissions
await assignPermissionsToRole(roleId, ['new_permission']);

// Login again, get new token
const token2 = await getJWT();

// Decode and compare
const decoded1 = jwt_decode(token1);
const decoded2 = jwt_decode(token2);

expect(decoded2.permissions).toContain('new_permission');
```

## Middleware Tests

### Test 25: Public Routes Accessible
```typescript
const response = await fetch('/auth/login');
expect(response.status).toBe(200);
```

### Test 26: Protected Routes Redirect
```typescript
const response = await fetch('/dashboard', { redirect: 'manual' });
expect(response.status).toBe(307); // Redirect
expect(response.headers.location).toContain('/auth/login');
```

### Test 27: Admin Routes Master Admin Only
```typescript
// As regular user
const regularResponse = await fetch('/admin/dashboard', { redirect: 'manual' });
expect(regularResponse.status).toBe(307);
expect(regularResponse.headers.location).toContain('/dashboard');

// As master admin
const adminResponse = await fetch('/admin/dashboard', {
  headers: { 'Cookie': `token=${masterAdminToken}` }
});
expect(adminResponse.status).toBe(200);
```

## Utility Tests

### Test 28: isMasterAdmin
```typescript
import { isMasterAdmin } from '@/lib/auth-utils';

expect(await isMasterAdmin(masterAdminId)).toBe(true);
expect(await isMasterAdmin(regularUserId)).toBe(false);
```

### Test 29: isTeamAdmin
```typescript
import { isTeamAdmin } from '@/lib/auth-utils';

expect(await isTeamAdmin(teamAdminId)).toBe(true);
expect(await isTeamAdmin(regularUserId)).toBe(false);
```

### Test 30: canAccessTeam
```typescript
import { canAccessTeam } from '@/lib/auth-utils';

// Master admin can access any team
expect(await canAccessTeam(masterAdminId, teamId)).toBe(true);

// User can access own team
expect(await canAccessTeam(userId, userTeamId)).toBe(true);

// User can't access other team
expect(await canAccessTeam(userId, otherTeamId)).toBe(false);
```

## Integration Tests

### Test 31: Full Signup to Admin Flow
```typescript
// 1. Signup
const signupResult = await signUp('admin@example.com', 'Password123!');
expect(signupResult.data).toBeDefined();

// 2. Promote to master admin
await fetch('/api/admin/users', {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${masterAdminToken}` },
  body: JSON.stringify({
    user_id: signupResult.data.user.id,
    is_master_admin: true,
  })
});

// 3. Login as new admin
await signIn('admin@example.com', 'Password123!');

// 4. Access admin dashboard
const response = await fetch('/admin/dashboard');
expect(response.status).toBe(200);
```

### Test 32: Full Team Workflow
```typescript
// 1. Create user in team
const user = await createUserInTeam(teamId, 'user@example.com');

// 2. Create custom role
const role = await createRole(teamId, 'Custom', ['view_candidates']);

// 3. Assign role to user
await assignRoleToUser(user.id, role.id);

// 4. Check permissions
const perms = await getUserPermissions(user.id);
expect(perms).toContain('view_candidates');
expect(perms).not.toContain('create_candidate');

// 5. Verify data access
const candidates = await getTeamCandidates(teamId, user.id);
// Should work due to view_candidates permission
```

## Test Execution

Run all tests:
```bash
npm test -- --testPathPattern="auth|rbac|permission"
```

Run specific test:
```bash
npm test -- test.test.ts --testNamePattern="Test 6"
```

Generate coverage:
```bash
npm test -- --coverage
```

## Expected Results

- 32 tests total
- 100% pass rate
- All RLS policies enforced
- All permissions working
- No security vulnerabilities
- Admin separation working
- Team isolation enforced

## Debugging Failed Tests

1. Check schema exists: `SELECT COUNT(*) FROM information_schema.tables`
2. Check RLS enabled: `SELECT * FROM pg_tables WHERE tablename = 'candidates'`
3. Check JWT claims configured in Supabase dashboard
4. Check environment variables set
5. Check database has test data (run seed script)
6. Check user is in correct team/role
7. Check permissions assigned to role

Run SQL debug queries from REBUILD_GUIDE.md if needed.
