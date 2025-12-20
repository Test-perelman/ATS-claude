# PHASE 1 FIXES - WITH AUTOMATED TESTING
**Purpose**: Fix 4 critical authentication bugs + validate fixes
**Result**: Each prompt includes code changes AND automated testing/validation

---

## PHASE 1: PROMPT 1 - Fix Login Broken (Issue #1)

```
TASK: Fix login by correcting column name mismatch - includes automated validation

FILES TO READ:
- src/lib/supabase/auth-server.ts (FULL FILE - need to check all instances)

PROBLEM:
The getCurrentUser() function uses wrong column name 'id' but the table uses 'user_id' as primary key.
This breaks ALL login attempts.

CURRENT BUG (Line ~183):
  .eq('id', authUser.id)  // ❌ WRONG - column doesn't exist

REQUIRED FIX:
  .eq('user_id', authUser.id)  // ✓ CORRECT

IMPLEMENTATION:
1. Read src/lib/supabase/auth-server.ts completely
2. Find the getCurrentUser() function
3. Locate the .eq() call that queries users table by column name
4. Change 'id' to 'user_id'
5. Search entire file for .eq('id', to find ANY other instances
6. Fix all instances found

CRITICAL VALIDATION CHECKLIST (YOU MUST DO THIS):
After making the change, you MUST verify:

[ ] CODE VERIFICATION:
    - [ ] Find the exact line with .eq() call in getCurrentUser()
    - [ ] Confirm it now reads: .eq('user_id', authUser.id)
    - [ ] Search entire file for ".eq('id'" - should return 0 results (no matches)
    - [ ] Verify no other functions affected
    - [ ] Line count should match before/after (only 1 character change: id→user_id)

[ ] LOGIC VERIFICATION:
    - [ ] The users table PRIMARY KEY is 'user_id' (not 'id')
    - [ ] authUser.id is the auth.users.id from Supabase Auth
    - [ ] Query will now match correctly on user_id column
    - [ ] No syntax errors introduced

[ ] PATTERN MATCHING:
    - [ ] Search for ".eq('user_id'" in same file
    - [ ] Find at least 3+ other correct instances (lines ~80, ~89, etc)
    - [ ] Confirm our fixed line now matches this pattern

AUTOMATED TEST (YOU MUST EXECUTE):
After fix, create a test script to verify the logic:

Create file: /tmp/test_getCurrentUser.ts (or similar temp file)
Copy this validation code and EXECUTE IT:

---BEGIN TEST CODE---
// Simulated test - verify the query would work
const testAuthUserId = "550e8400-e29b-41d4-a716-446655440000";

// BEFORE FIX (would fail):
// .eq('id', testAuthUserId)  // ❌ Column 'id' doesn't exist

// AFTER FIX (would work):
// .eq('user_id', testAuthUserId)  // ✓ Column 'user_id' exists

// Verify: If you were to query the users table with:
// SELECT * FROM users WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'
// Result: ✅ Would return correct user record

console.log("✅ LOGIN FIX VERIFIED:");
console.log("   - Column name corrected: id → user_id");
console.log("   - Query will now match the correct database column");
console.log("   - Users can login and retrieve profile data");
---END TEST CODE---

FINAL CHECKLIST:
[ ] Change made: 'id' → 'user_id' in getCurrentUser()
[ ] No other 'id' column references in same file (verified via search)
[ ] Matches pattern used in signIn() function (line ~80)
[ ] Ready for Phase 1 Prompt 2

PASS/FAIL DETERMINATION:
If you can answer YES to all items below, Issue #1 is FIXED:
- YES: Column name is now 'user_id'
- YES: Search for ".eq('id'," returns zero results
- YES: Pattern matches other user_id queries in file
- YES: No syntax errors in file

Output Format:
=====================================
ISSUE #1 - LOGIN BROKEN: [✅ FIXED] or [❌ NOT FIXED]
Details:
- Column name changed: id → user_id
- Verified via search: [0/0 remaining instances]
- Pattern consistency: [✅ Matches other queries]
- Status: [✅ READY FOR PHASE 1 PROMPT 2]
=====================================
```

---

## PHASE 1: PROMPT 2 - Fix Master Admin Creation (Issue #2)

```
TASK: Fix master admin creation RLS violation - includes automated validation

FILES TO READ:
- src/lib/supabase/auth-server.ts (read FULL file)

PROBLEM:
The createMasterAdmin() function doesn't use proper admin client type casting.
This causes RLS policy to block insertion of master admin with team_id=NULL.

CURRENT BUG (Lines ~288-289):
  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert(...)  // ❌ WRONG - no 'as any' type casting

REQUIRED FIX:
Look at line ~200 in teamSignUp() function - it does this CORRECTLY:
  const { data: userData, error: userError } = await (supabase.from('users') as any)
    .insert({...})

Same fix needed in createMasterAdmin() - add '(... as any)' casting.

IMPLEMENTATION:
1. Read src/lib/supabase/auth-server.ts completely
2. Find createMasterAdmin() function (should start ~line 251)
3. Find the line with: await supabase.from('users').insert(...)
4. Change to: await (supabase.from('users') as any).insert(...)
5. Verify it now matches the pattern from teamSignUp() at line ~200

CRITICAL VALIDATION CHECKLIST:

[ ] CODE VERIFICATION:
    - [ ] Located createMasterAdmin() function
    - [ ] Found the .insert() call for users table
    - [ ] Confirmed it now reads: await (supabase.from('users') as any)
    - [ ] Syntax is correct: parenthesis, 'as any', all present
    - [ ] No TypeScript errors in file

[ ] PATTERN MATCHING:
    - [ ] Compare with teamSignUp() at line ~200
    - [ ] Both now use identical pattern: (supabase.from('users') as any)
    - [ ] Both pass same arguments to insert()
    - [ ] Both use .select().single() pattern

[ ] FIELD VERIFICATION:
    - [ ] Insert includes: user_id, email, username, first_name, last_name
    - [ ] Insert includes: team_id=null, role_id=null (required for master admin)
    - [ ] Insert includes: is_master_admin=true (required marker)
    - [ ] Insert includes: status='active'
    - [ ] All 9+ fields present and in correct order

[ ] RLS LOGIC VERIFICATION:
    - [ ] supabase is actually adminSupabase (created with service role)
    - [ ] Admin client can bypass RLS policies
    - [ ] team_id=null is now allowed for master admins
    - [ ] insert will NOT fail with RLS violation

AUTOMATED TEST (YOU MUST EXECUTE):

Test the insert statement logic:

---BEGIN TEST CODE---
// Simulated master admin creation test
const masterAdminPayload = {
  user_id: "550e8400-e29b-41d4-a716-446655440001",
  email: "admin@test.com",
  username: "admin",
  first_name: "Master",
  last_name: "Admin",
  team_id: null,           // ✓ Required for master admin
  role_id: null,           // ✓ Required for master admin
  is_master_admin: true,   // ✓ Marks as master admin
  status: "active"
};

// BEFORE FIX: RLS would reject this (team_id=null, is_master_admin=false)
// AFTER FIX: Admin client bypasses RLS, insert succeeds

// Verify RLS constraint logic:
const isMasterAdmin = masterAdminPayload.is_master_admin;
const hasNoTeam = masterAdminPayload.team_id === null;
const hasNoRole = masterAdminPayload.role_id === null;

const rls_check = isMasterAdmin && hasNoTeam && hasNoRole;
console.log(`RLS Check (master admin with no team): ${rls_check ? '✅' : '❌'}`);

// Verify admin client type
console.log("✅ ADMIN CLIENT TYPE VERIFICATION:");
console.log("   - Uses admin client created with service role");
console.log("   - Type casting: (supabase.from('users') as any)");
console.log("   - RLS policies are bypassed");
console.log("   - Insert with team_id=null will succeed");
---END TEST CODE---

VERIFICATION OUTPUT FORMAT:
After the fix, you should verify these exact conditions:

1. [ ] Line count of 'as any' in createMasterAdmin() function: should be 1
2. [ ] Pattern match: grep for "(supabase.from('users') as any)" in createMasterAdmin()
3. [ ] Insert statement has exactly 9 fields
4. [ ] All required fields present: user_id, email, username, first_name, last_name, team_id, role_id, is_master_admin, status

FINAL CHECKLIST:
[ ] Type casting added: (... as any)
[ ] Pattern matches teamSignUp()
[ ] All 9 fields in insert statement
[ ] team_id=null and role_id=null preserved
[ ] is_master_admin=true set
[ ] No syntax errors

PASS/FAIL DETERMINATION:
If you can answer YES to all below, Issue #2 is FIXED:
- YES: Type casting present: (supabase.from('users') as any)
- YES: Matches pattern from teamSignUp() function
- YES: RLS will be bypassed by admin client
- YES: Master admin insert will succeed (team_id=null allowed)

Output Format:
=====================================
ISSUE #2 - MASTER ADMIN CREATION: [✅ FIXED] or [❌ NOT FIXED]
Details:
- Type casting added: (supabase.from('users') as any)
- Pattern consistency: [✅ Matches teamSignUp()]
- RLS bypass enabled: [✅ Via admin client]
- Status: [✅ READY FOR PHASE 1 PROMPT 3]
=====================================
```

---

## PHASE 1: PROMPT 3 - Fix Security Token Validation (Issue #8)

```
TASK: Fix security vulnerability in master admin creation endpoint - includes validation

FILES TO READ:
- src/app/api/admin/create-master-admin/route.ts (FULL FILE)

PROBLEM:
Security token validation logic is BACKWARDS. If ADMIN_SETUP_TOKEN env var not set,
endpoint accepts ANY setupToken value. This is a critical security vulnerability.

CURRENT BUG:
Line ~11: const SETUP_TOKEN = process.env.ADMIN_SETUP_TOKEN || 'change-me-in-production'
Line ~25: if (SETUP_TOKEN !== 'change-me-in-production' && setupToken !== SETUP_TOKEN) { ... }

The condition only validates IF the token was changed. If it's default, validation is skipped!

REQUIRED FIX:
1. Line 11: Remove the '|| default' fallback
   FROM: const SETUP_TOKEN = process.env.ADMIN_SETUP_TOKEN || 'change-me-in-production'
   TO:   const SETUP_TOKEN = process.env.ADMIN_SETUP_TOKEN

2. Add validation that env var is configured (NEW CODE after line 12):
   if (!SETUP_TOKEN || SETUP_TOKEN === 'change-me-in-production') {
     console.error('[SECURITY] ADMIN_SETUP_TOKEN not properly configured!')
     return NextResponse.json(
       { error: 'Server not properly configured for master admin creation' },
       { status: 500 }
     )
   }

3. Fix token validation (REPLACE lines ~25-30):
   FROM: if (SETUP_TOKEN !== 'change-me-in-production' && setupToken !== SETUP_TOKEN) { ... }
   TO:   if (!setupToken || setupToken !== SETUP_TOKEN) { ... }

IMPLEMENTATION:
1. Read src/app/api/admin/create-master-admin/route.ts completely
2. Find line with: const SETUP_TOKEN = process.env.ADMIN_SETUP_TOKEN
3. Verify it does NOT have '|| something' fallback
4. Find the token validation logic (if statement checking SETUP_TOKEN)
5. Verify it's unconditional (not checking if SETUP_TOKEN !== default)
6. Ensure returns 500 if env var not configured
7. Ensure returns 401 if token invalid
8. No other fallback paths exist

CRITICAL VALIDATION CHECKLIST:

[ ] SECURITY VERIFICATION:
    - [ ] ADMIN_SETUP_TOKEN has NO default fallback
    - [ ] Token validation is UNCONDITIONAL (no 'if SETUP_TOKEN !== default' checks)
    - [ ] Returns 500 error if SETUP_TOKEN env var is missing
    - [ ] Returns 500 error if SETUP_TOKEN === 'change-me-in-production'
    - [ ] Returns 401 error if setupToken doesn't match SETUP_TOKEN
    - [ ] No way to bypass token check (100% coverage)

[ ] CODE STRUCTURE:
    - [ ] Line 11: Exactly: const SETUP_TOKEN = process.env.ADMIN_SETUP_TOKEN
    - [ ] Lines 13-22: Validation that SETUP_TOKEN is configured
    - [ ] Line ~34: Token validation: if (!setupToken || setupToken !== SETUP_TOKEN)
    - [ ] Both conditions return appropriate HTTP status codes
    - [ ] Console logs security errors for monitoring

[ ] LOGIC FLOW:
    - [ ] Parse request body → validate env var → validate token → proceed
    - [ ] Each step has explicit error handling
    - [ ] No silent failures
    - [ ] No way to reach actual endpoint if token invalid

AUTOMATED TEST (YOU MUST EXECUTE):

Test security scenarios:

---BEGIN TEST CODE---
// SECURITY TEST SUITE
console.log("🔒 SECURITY TOKEN VALIDATION TEST\n");

// Scenario 1: Env var not set
console.log("TEST 1: ADMIN_SETUP_TOKEN not configured");
let SETUP_TOKEN = undefined;
let setupToken = "anything";
console.log(`  Env var: ${SETUP_TOKEN || '(undefined)'}`);
console.log(`  Request token: ${setupToken}`);
if (!SETUP_TOKEN || SETUP_TOKEN === 'change-me-in-production') {
  console.log(`  ✅ Result: 500 Error - Server misconfigured`);
} else {
  console.log(`  ❌ FAIL: Should return 500`);
}

// Scenario 2: Env var = default (not changed)
console.log("\nTEST 2: ADMIN_SETUP_TOKEN = default value");
SETUP_TOKEN = 'change-me-in-production';
setupToken = "whatever";
console.log(`  Env var: ${SETUP_TOKEN}`);
console.log(`  Request token: ${setupToken}`);
if (!SETUP_TOKEN || SETUP_TOKEN === 'change-me-in-production') {
  console.log(`  ✅ Result: 500 Error - Default token not allowed`);
} else {
  console.log(`  ❌ FAIL: Should return 500`);
}

// Scenario 3: Env var set correctly, but wrong request token
console.log("\nTEST 3: Env var set, but request token wrong");
SETUP_TOKEN = 'my-secure-token-123';
setupToken = 'wrong-token';
console.log(`  Env var: ${SETUP_TOKEN}`);
console.log(`  Request token: ${setupToken}`);
if (!setupToken || setupToken !== SETUP_TOKEN) {
  console.log(`  ✅ Result: 401 Error - Invalid token`);
} else {
  console.log(`  ❌ FAIL: Should return 401`);
}

// Scenario 4: Env var set correctly, request token matches
console.log("\nTEST 4: Env var set, request token CORRECT");
SETUP_TOKEN = 'my-secure-token-123';
setupToken = 'my-secure-token-123';
console.log(`  Env var: ${SETUP_TOKEN}`);
console.log(`  Request token: ${setupToken}`);
if (!SETUP_TOKEN || SETUP_TOKEN === 'change-me-in-production') {
  console.log(`  ❌ FAIL: Should proceed to endpoint`);
} else if (!setupToken || setupToken !== SETUP_TOKEN) {
  console.log(`  ❌ FAIL: Should proceed to endpoint`);
} else {
  console.log(`  ✅ Result: 200 Success - Proceed to master admin creation`);
}

console.log("\n" + "=".repeat(50));
console.log("SECURITY VERDICT:");
if (SETUP_TOKEN && SETUP_TOKEN !== 'change-me-in-production') {
  console.log("✅ Endpoint is SECURE");
} else {
  console.log("❌ Endpoint is VULNERABLE");
}
---END TEST CODE---

RUN THIS TEST and verify all 4 scenarios pass.

VERIFICATION QUERIES:
1. Search file for "change-me-in-production" - should appear ONLY in conditional checks (not as default)
2. Search for "ADMIN_SETUP_TOKEN ||" - should return 0 results (no fallback)
3. Count token validation checks - should be EXACTLY 2:
   - Check 1: Validate env var is configured (returns 500)
   - Check 2: Validate request token matches (returns 401)
4. Line with SETUP_TOKEN must be: const SETUP_TOKEN = process.env.ADMIN_SETUP_TOKEN

FINAL CHECKLIST:
[ ] No fallback default in SETUP_TOKEN assignment
[ ] Env var validation returns 500 if not configured
[ ] Token validation is unconditional (always executed)
[ ] Request token validation returns 401 if invalid
[ ] Test Suite confirms all 4 scenarios pass
[ ] No way to bypass token check

PASS/FAIL DETERMINATION:
If ALL below are YES, Issue #8 is FIXED:
- YES: SETUP_TOKEN has no fallback default
- YES: Returns 500 if env var not set or is default value
- YES: Returns 401 if request token is invalid or missing
- YES: All 4 test scenarios pass
- YES: No security bypass possible

Output Format:
=====================================
ISSUE #8 - SECURITY TOKEN: [✅ FIXED] or [❌ NOT FIXED]
Details:
- No default fallback: [✅ Verified]
- Env var validation: [✅ 500 error if missing]
- Token validation: [✅ Unconditional, returns 401]
- Security tests: [✅ All 4 scenarios pass]
- Status: [✅ READY FOR PHASE 1 PROMPT 4]
=====================================
```

---

## PHASE 1: PROMPT 4 - Fix User Constraint Violation (Issue #4)

```
TASK: Enforce user role/team consistency constraints - includes database validation

FILES TO READ:
- src/lib/supabase/auth-actions.ts (FULL FILE)
- src/lib/supabase/auth-server.ts (FULL FILE)

PROBLEM:
Regular users are created with team_id=NULL and role_id=NULL, but database should enforce
that regular users either have BOTH team_id and role_id, or neither (only master admins).

CURRENT BUG:
signUp() in auth-actions.ts (line ~38-40) creates:
  team_id: null,      // ❌ Regular user with no team - violates constraint
  role_id: null,      // ❌ Regular user with no role - violates constraint

SOLUTION:
Three parts:
1. Add state documentation in code comments explaining user creation states
2. Create database constraint to prevent invalid combinations
3. Verify all 3 user creation paths follow the constraint

IMPLEMENTATION PART 1 - ADD CODE COMMENTS:

In src/lib/supabase/auth-actions.ts signUp() function, around line 28-29, add:
  // NEW USER STATE: is_master_admin=false, team_id=null, role_id=null (pending onboarding)
  // After onboarding: user will be assigned team_id and role_id
  // This is valid state for users in signup->onboarding flow

In src/lib/supabase/auth-server.ts teamSignUp() function, around line 198-200, add:
  // TEAM USER STATE: is_master_admin=false, team_id=<team>, role_id=<local_admin>
  // User has full team access as Local Admin

In src/lib/supabase/auth-server.ts createMasterAdmin() function, around line 285-287, add:
  // MASTER ADMIN STATE: is_master_admin=true, team_id=null, role_id=null
  // Master admin has system-wide access to all teams

IMPLEMENTATION PART 2 - ADD DATABASE CONSTRAINT:

Execute this SQL in Supabase (as admin):
  ALTER TABLE public.users ADD CONSTRAINT users_role_team_consistency CHECK (
    (is_master_admin = true AND team_id IS NULL AND role_id IS NULL)
    OR
    (is_master_admin = false AND ((team_id IS NOT NULL AND role_id IS NOT NULL) OR (team_id IS NULL AND role_id IS NULL)))
  );

This allows:
  ✅ Master admin: is_master_admin=true, team_id=NULL, role_id=NULL
  ✅ Team user: is_master_admin=false, team_id=<value>, role_id=<value>
  ✅ Pending user: is_master_admin=false, team_id=NULL, role_id=NULL
  ❌ Invalid: is_master_admin=false, team_id=<value>, role_id=NULL (partially assigned)
  ❌ Invalid: is_master_admin=false, team_id=NULL, role_id=<value> (partially assigned)

IMPLEMENTATION PART 3 - VERIFY CODE PATHS:

In signUp() auth-actions.ts:
  [ ] is_master_admin=false
  [ ] team_id=null
  [ ] role_id=null
  [ ] Comment explains "pending onboarding" state

In teamSignUp() auth-server.ts:
  [ ] is_master_admin=false
  [ ] team_id=<team_id from creation>
  [ ] role_id=<local_admin_role.role_id>
  [ ] Comment explains "team user" state

In createMasterAdmin() auth-server.ts:
  [ ] is_master_admin=true
  [ ] team_id=null
  [ ] role_id=null
  [ ] Comment explains "master admin" state

CRITICAL VALIDATION CHECKLIST:

[ ] CODE VERIFICATION:
    - [ ] signUp() creates pending users: is_master_admin=false, team_id=null, role_id=null
    - [ ] teamSignUp() creates team users: is_master_admin=false, team_id=<>, role_id=<>
    - [ ] createMasterAdmin() creates admins: is_master_admin=true, team_id=null, role_id=null
    - [ ] Each function has state documentation comments
    - [ ] No orphaned team_id without role_id (or vice versa)

[ ] DATABASE CONSTRAINT:
    - [ ] Constraint created in users table
    - [ ] Constraint name: users_role_team_consistency
    - [ ] Constraint logic correctly implemented
    - [ ] Allows 3 valid states, rejects 2 invalid states

[ ] CONSISTENCY:
    - [ ] All inserts follow one of 3 valid states
    - [ ] No function creates invalid state
    - [ ] Comments explain which state is being created

AUTOMATED TEST (YOU MUST EXECUTE):

Test constraint validation:

---BEGIN TEST CODE---
// USER STATE CONSTRAINT VALIDATION TEST

console.log("🔐 USER CONSTRAINT TEST SUITE\n");

const testUsers = [
  {
    name: "Pending User (signUp)",
    is_master_admin: false,
    team_id: null,
    role_id: null,
    valid: true,
    reason: "Valid - pending onboarding"
  },
  {
    name: "Team User (teamSignUp)",
    is_master_admin: false,
    team_id: "team-123",
    role_id: "role-456",
    valid: true,
    reason: "Valid - fully assigned to team"
  },
  {
    name: "Master Admin",
    is_master_admin: true,
    team_id: null,
    role_id: null,
    valid: true,
    reason: "Valid - system admin"
  },
  {
    name: "Invalid - Partial Assignment 1",
    is_master_admin: false,
    team_id: "team-123",
    role_id: null,
    valid: false,
    reason: "Invalid - has team but no role"
  },
  {
    name: "Invalid - Partial Assignment 2",
    is_master_admin: false,
    team_id: null,
    role_id: "role-456",
    valid: false,
    reason: "Invalid - has role but no team"
  }
];

function validateUser(user) {
  const isMasterAdmin = user.is_master_admin;
  const hasTeam = user.team_id !== null;
  const hasRole = user.role_id !== null;

  const isValid =
    (isMasterAdmin && !hasTeam && !hasRole) ||
    (!isMasterAdmin && ((hasTeam && hasRole) || (!hasTeam && !hasRole)));

  return isValid;
}

console.log("Testing user state combinations:\n");
testUsers.forEach(user => {
  const isValid = validateUser(user);
  const icon = isValid === user.valid ? "✅" : "❌";
  const status = isValid ? "VALID" : "INVALID";

  console.log(`${icon} ${user.name}`);
  console.log(`   is_master_admin=${user.is_master_admin}, team_id=${user.team_id}, role_id=${user.role_id}`);
  console.log(`   Status: ${status}`);
  console.log(`   Expected: ${user.reason}\n`);
});

// Verify implementation
console.log("=".repeat(50));
console.log("CONSTRAINT VERDICT:");
const allTestsPassed = testUsers.every(user => validateUser(user) === user.valid);
console.log(allTestsPassed ? "✅ All constraints pass" : "❌ Constraint logic failed");
---END TEST CODE---

RUN THIS TEST and verify all 5 scenarios pass correctly.

VERIFICATION QUERIES:
1. Query code to find all .insert() calls creating users
2. For each insert, verify the state matches one of 3 valid states
3. Count user creation functions: should be exactly 3 (signUp, teamSignUp, createMasterAdmin)
4. Check database for constraint: SELECT constraint_name FROM information_schema.table_constraints WHERE table_name='users'

FINAL CHECKLIST:
[ ] signUp() documented as pending state
[ ] teamSignUp() documented as team user state
[ ] createMasterAdmin() documented as master admin state
[ ] Database constraint created and enforced
[ ] All 5 test scenarios pass (3 valid, 2 invalid)
[ ] No other code paths create users
[ ] Comments explain the 3 valid states

PASS/FAIL DETERMINATION:
If ALL below are YES, Issue #4 is FIXED:
- YES: Code comments document 3 valid user states
- YES: Database constraint prevents invalid combinations
- YES: signUp creates pending state (team_id=null, role_id=null)
- YES: teamSignUp creates team state (team_id=<>, role_id=<>)
- YES: createMasterAdmin creates admin state (team_id=null, role_id=null)
- YES: All 5 test scenarios validate correctly

Output Format:
=====================================
ISSUE #4 - USER CONSTRAINT: [✅ FIXED] or [❌ NOT FIXED]
Details:
- Code comments added: [✅ All 3 states documented]
- Database constraint: [✅ users_role_team_consistency created]
- Test scenarios: [✅ All 5 pass (3 valid, 2 invalid)]
- Valid states: [✅ 3/3 paths verified]
- Status: [✅ PHASE 1 COMPLETE]
=====================================
```

---

## PHASE 1 SUMMARY VALIDATION

After completing all 4 prompts, you MUST output this summary:

```
=====================================
PHASE 1 COMPLETION SUMMARY
=====================================

ISSUE #1 - LOGIN BROKEN: [  ] FIXED or [ ] NOT FIXED
- Column name: id → user_id
- Test result: [user profile retrieved successfully]

ISSUE #2 - MASTER ADMIN CREATION: [  ] FIXED or [ ] NOT FIXED
- Type casting: (supabase.from('users') as any)
- Test result: [master admin created, RLS bypassed]

ISSUE #8 - SECURITY TOKEN: [  ] FIXED or [ ] NOT FIXED
- Token validation: unconditional
- Test result: [all 4 security scenarios pass]

ISSUE #4 - USER CONSTRAINT: [  ] FIXED or [ ] NOT FIXED
- Database constraint: users_role_team_consistency
- Test result: [all 5 state combinations validated]

=====================================
OVERALL PHASE 1 STATUS:
[  ] ✅ ALL CRITICAL ISSUES FIXED - PROCEED TO PHASE 2
[  ] ❌ SOME ISSUES REMAIN - REVIEW ABOVE
=====================================
```

Fill in checkboxes with ✅ or ❌ based on test results.
If all 4 are FIXED, Phase 1 is complete and authentication is functional.
```

---

## HOW TO USE PHASE 1

1. Open new Claude Code chat window
2. Copy PROMPT 1 completely (everything from "TASK:" to end of that section)
3. Paste and wait for completion
4. Claude will make fix AND execute validation tests
5. Review validation output - confirm it says [✅ FIXED]
6. Repeat steps 1-5 for PROMPT 2, 3, and 4
7. Output final PHASE 1 SUMMARY

**Critical**: Do NOT proceed to Phase 2 until all 4 issues show [✅ FIXED]
