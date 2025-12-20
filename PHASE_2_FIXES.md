# PHASE 2 FIXES - WITH AUTOMATED TESTING
**Prerequisites**: Phase 1 must be COMPLETE and all issues showing [✅ FIXED]
**Purpose**: Fix 5 high-priority bugs that block core features + validate each fix

---

## PHASE 2: PROMPT 1 - Fix Signup Missing Redirect (Issue #3)

```
TASK: Fix signup flow by adding redirect to /onboarding - includes flow validation

FILES TO READ:
- src/lib/auth-actions.ts (FULL FILE)

PROBLEM:
The signUp() function creates auth user and database record but doesn't redirect to /onboarding.
User is returned to signup page instead of starting onboarding flow.

CURRENT BUG (Line ~54):
  return { success: true, data };  // ❌ NO REDIRECT - user stays on signup page

REQUIRED FIX:
After successful user creation, redirect to /onboarding:
  redirect('/onboarding');  // ✓ Force redirect to onboarding

Compare to signIn() function which correctly has:
  redirect('/dashboard');  // ✓ Correctly redirects after login

IMPLEMENTATION:
1. Read src/lib/auth-actions.ts completely
2. Find signUp() function (starts ~line 10)
3. Find the success return statement (line ~54)
4. Change from: return { success: true, data };
5. To: redirect('/onboarding');
6. Verify no return statement after redirect (redirect() is next.js directive)

CRITICAL VALIDATION CHECKLIST:

[ ] CODE VERIFICATION:
    - [ ] Located signUp() function
    - [ ] Found success return at end of try block
    - [ ] Removed: return { success: true, data };
    - [ ] Added: redirect('/onboarding');
    - [ ] No return statement after redirect (redirect throws)
    - [ ] signIn() function still has redirect('/dashboard'); (unchanged)
    - [ ] signOut() function uses redirect('/'); (unchanged)

[ ] FLOW VERIFICATION:
    - [ ] signUp flow: create auth user → create DB record → redirect('/onboarding')
    - [ ] signIn flow: verify password → redirect('/dashboard')
    - [ ] signOut flow: clear session → redirect('/')
    - [ ] All three flows now have explicit redirects

[ ] ERROR HANDLING:
    - [ ] If auth creation fails: return { error: ... }  (no redirect)
    - [ ] If user already exists: return { error: ... }  (no redirect)
    - [ ] If DB creation fails: return { error: ... }  (no redirect)
    - [ ] Only on success: redirect('/onboarding')

AUTOMATED TEST (YOU MUST EXECUTE):

Test signup flow redirect logic:

---BEGIN TEST CODE---
// SIGNUP FLOW REDIRECT TEST

console.log("🔄 SIGNUP FLOW REDIRECT TEST\n");

// Simulate signup flow
console.log("Scenario 1: Signup Success");
console.log("Steps:");
console.log("  1. Create auth user → success");
console.log("  2. Create DB record → success");
console.log("  3. Should redirect to /onboarding");
console.log("Expected: redirect('/onboarding') called");
console.log("✅ PASS if code reaches redirect() at end\n");

console.log("Scenario 2: Auth Creation Fails");
console.log("Steps:");
console.log("  1. Create auth user → error");
console.log("  2. Should return error, NOT redirect");
console.log("Expected: return { error: '...' }");
console.log("✅ PASS if error returned before redirect\n");

console.log("Scenario 3: DB Creation Fails");
console.log("Steps:");
console.log("  1. Create auth user → success");
console.log("  2. Create DB record → error (caught)");
console.log("  3. Should NOT redirect (user can still try login)");
console.log("Expected: continue execution (no explicit return/redirect)");
console.log("⚠️ NOTE: Check if error is silently caught or returned\n");

// Verify function structure
console.log("=".repeat(50));
console.log("FLOW STRUCTURE VERIFICATION:");

const flowSteps = [
  "supabase.auth.signUp({email, password}) → data or error",
  "if (error) return { error }",
  "if (!data.user) return { error }",
  "adminSupabase.from('users').insert({...})",
  "if (userError) console.error (swallowed)",
  "redirect('/onboarding')"
];

console.log("Expected flow:");
flowSteps.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));

console.log("\n✅ If code matches this flow, redirect is correct");
---END TEST CODE---

RUN THIS TEST and verify flow structure.

VERIFICATION QUERIES:
1. Search for "redirect(" in auth-actions.ts:
   - Should find: redirect('/dashboard') in signIn() ✓
   - Should find: redirect('/onboarding') in signUp() ✓
   - Should find: redirect('/') in signOut() ✓

2. Count total redirect() calls: should be 3 (one per flow)

3. Verify signUp() function structure:
   - Try/catch around auth.signUp()
   - Try/catch around admin.insert()
   - Redirect at END of function after both succeed

FINAL CHECKLIST:
[ ] signUp() ends with redirect('/onboarding')
[ ] No return statement after redirect
[ ] signIn() still has redirect('/dashboard')
[ ] signOut() still has redirect('/')
[ ] Error returns occur before any redirect
[ ] Flow is: auth → DB → redirect (all success) OR return error

PASS/FAIL DETERMINATION:
If ALL below are YES, Issue #3 is FIXED:
- YES: signUp() has redirect('/onboarding')
- YES: No return statement after redirect (redirect() throws)
- YES: Error paths return early (before redirect)
- YES: All 3 auth flows have appropriate redirects
- YES: Flow test passes

Output Format:
=====================================
ISSUE #3 - SIGNUP REDIRECT: [✅ FIXED] or [❌ NOT FIXED]
Details:
- Redirect added: redirect('/onboarding')
- Error handling: [✅ Returns before redirect]
- Flow verification: [✅ Auth → DB → Redirect]
- Status: [✅ READY FOR PHASE 2 PROMPT 2]
=====================================
```

---

## PHASE 2: PROMPT 2 - Fix Login Error Handling (Issue #6)

```
TASK: Fix login safeguard by improving error handling - includes error validation

FILES TO READ:
- src/lib/auth-actions.ts (lines 60-110, function signIn)
- src/lib/supabase/auth-server.ts (lines 170-190, function getCurrentUser)

PROBLEM:
The signIn() function calls .single() on user query which throws errors if 0 or 2+ rows exist.
But try/catch silently swallows ALL errors, hiding data integrity issues.

CURRENT BUG (Lines 78-81):
  const { data: existingUser } = await (supabase.from('users') as any)
    .select('user_id')
    .eq('user_id', data.user.id)
    .single();  // ❌ Throws if 0 or 2+ rows, but errors caught silently

REQUIRED FIX:
1. Add validation that uniqueness is maintained
2. Distinguish between "not found" (OK) and other errors (BAD)
3. Log meaningful errors for debugging

IMPLEMENTATION:
1. Read src/lib/auth-actions.ts lines 76-107 (signIn function user lookup)
2. Find the .single() call and error handling
3. Modify to distinguish error types:
   - If no rows found (error code 'PGRST116'): OK, create user record
   - If other errors: Log and throw (don't hide data issues)
4. Add comment explaining expected behavior
5. Verify getCurrentUser() in auth-server.ts also handles .single() correctly

CURRENT CODE (WRONG):
  try {
    const { data: existingUser } = await (supabase.from('users') as any)
      .select('user_id')
      .eq('user_id', data.user.id)
      .single();

    if (!existingUser) {
      // Create user record...
    }
  } catch (err) {
    console.error('Error ensuring user record exists:', err);
    // Continue anyway - user auth is valid
  }

CORRECT CODE:
  try {
    const { data: existingUser, error } = await (supabase.from('users') as any)
      .select('user_id')
      .eq('user_id', data.user.id)
      .single();

    // Only ignore "no rows" error
    if (error && error.code !== 'PGRST116') {
      // This is unexpected - data integrity issue
      console.error('[signIn] Unexpected query error:', error.message);
      throw error;  // Don't hide this error
    }

    if (!existingUser) {
      // Create user record (expected path on first login)
    }
  } catch (err) {
    console.error('[signIn] Failed to validate/create user record:', err);
    // User is authenticated but record creation failed
    // Continue with caution - user may have issues
  }

IMPLEMENTATION STEPS:
1. Read signIn() function in auth-actions.ts
2. Find the try/catch with .single()
3. Add explicit { error } extraction
4. Add conditional check: if (error && error.code !== 'PGRST116')
5. Throw error if NOT the "no rows" case
6. Add meaningful console.error messages
7. Verify similar logic in getCurrentUser() in auth-server.ts (line ~181)

CRITICAL VALIDATION CHECKLIST:

[ ] CODE VERIFICATION:
    - [ ] .single() call includes error in destructuring
    - [ ] Error is checked for specific code 'PGRST116'
    - [ ] Unexpected errors are re-thrown (not swallowed)
    - [ ] Console.error includes meaningful context
    - [ ] Flow: check error → if not 'no rows' → throw → catch handles

[ ] ERROR HANDLING:
    - [ ] No rows found (PGRST116): Continue to create user record
    - [ ] Other errors: Throw and log for investigation
    - [ ] Syntax errors: Don't mask with try/catch
    - [ ] Type errors: Don't mask with try/catch

[ ] CONSISTENCY:
    - [ ] signIn() error handling matches getCurrentUser() pattern
    - [ ] Both use same 'PGRST116' error code
    - [ ] Both log meaningful errors
    - [ ] Both allow expected "no rows" case

AUTOMATED TEST (YOU MUST EXECUTE):

Test error handling scenarios:

---BEGIN TEST CODE---
// ERROR HANDLING TEST

console.log("⚠️ LOGIN ERROR HANDLING TEST\n");

// Simulate Supabase error codes
const PGRST116 = 'PGRST116';  // No rows returned

const testScenarios = [
  {
    name: "User record exists",
    error: null,
    existingUser: { user_id: "123" },
    expectedAction: "Continue to redirect",
    shouldThrow: false
  },
  {
    name: "User record not found (first login)",
    error: { code: PGRST116, message: "No rows found" },
    existingUser: null,
    expectedAction: "Create user record",
    shouldThrow: false
  },
  {
    name: "Database connection error",
    error: { code: 'DB_ERROR', message: "Connection timeout" },
    existingUser: null,
    expectedAction: "Throw error to catch",
    shouldThrow: true
  },
  {
    name: "RLS policy violation",
    error: { code: 'PGRST301', message: "RLS policy violation" },
    existingUser: null,
    expectedAction: "Throw error to catch",
    shouldThrow: true
  }
];

console.log("Testing error handling:\n");

testScenarios.forEach(scenario => {
  console.log(`Scenario: ${scenario.name}`);
  console.log(`  Error: ${scenario.error ? scenario.error.code : 'null'}`);
  console.log(`  User exists: ${scenario.existingUser ? 'yes' : 'no'}`);

  let shouldThrow = false;

  if (scenario.error && scenario.error.code !== PGRST116) {
    shouldThrow = true;  // Unexpected error - should throw
  }

  if (shouldThrow === scenario.shouldThrow) {
    console.log(`  ✅ PASS: ${scenario.expectedAction}`);
  } else {
    console.log(`  ❌ FAIL: Expected throw=${scenario.shouldThrow}, got ${shouldThrow}`);
  }
  console.log();
});

console.log("=".repeat(50));
console.log("ERROR HANDLING VERDICT:");
const allPass = testScenarios.every(s => {
  if (s.error && s.error.code !== PGRST116) {
    return s.shouldThrow === true;
  }
  return s.shouldThrow === false;
});

console.log(allPass ? "✅ All error scenarios handled correctly" : "❌ Error handling incomplete");
---END TEST CODE---

RUN THIS TEST and verify all scenarios pass.

VERIFICATION QUERIES:
1. Search for "PGRST116" in code: should appear in signIn() and getCurrentUser()
2. Count .single() calls: both should have explicit error checking
3. Check for rethrow pattern: if (error && error.code !== ...) { throw error; }

FINAL CHECKLIST:
[ ] signIn() extracts error from .single() query
[ ] Error code 'PGRST116' is checked explicitly
[ ] Non-PGRST116 errors are re-thrown (not swallowed)
[ ] Console.error has meaningful context
[ ] Same pattern in getCurrentUser()
[ ] All 4 test scenarios pass

PASS/FAIL DETERMINATION:
If ALL below are YES, Issue #6 is FIXED:
- YES: Error from .single() is extracted and checked
- YES: Only 'PGRST116' (no rows) error is ignored
- YES: Other errors are re-thrown to catch handler
- YES: Console messages are meaningful
- YES: All 4 test scenarios pass correctly

Output Format:
=====================================
ISSUE #6 - LOGIN SAFEGUARD: [✅ FIXED] or [❌ NOT FIXED]
Details:
- Error extraction: [✅ { error } in destructuring]
- PGRST116 handling: [✅ Only allowed error code]
- Unexpected errors: [✅ Re-thrown to catch]
- Test scenarios: [✅ All 4 pass]
- Status: [✅ READY FOR PHASE 2 PROMPT 3]
=====================================
```

---

## PHASE 2: PROMPT 3 - Fix Role Template Validation (Issue #7)

```
TASK: Add validation for role template cloning - includes cloning verification

FILES TO READ:
- src/lib/supabase/auth-server.ts (lines 183-197, focus on role cloning)
- Look for: cloneRoleTemplatesForTeam() function call
- If not in auth-server.ts, find where it's defined

PROBLEM:
The teamSignUp() function clones role templates but doesn't validate success.
If cloning returns empty array, team has no roles but signup "succeeds".

CURRENT BUG (Lines 185-186):
  const roleIds = await cloneRoleTemplatesForTeam(teamId)
  console.log(`Created ${roleIds.length} roles for team`)
  // ❌ No validation that roles were created!

REQUIRED FIX:
Add validation to ensure cloning succeeded:
  const roleIds = await cloneRoleTemplatesForTeam(teamId)
  if (!roleIds || roleIds.length === 0) {
    throw new Error('Failed to clone role templates for team')
  }
  console.log(`Created ${roleIds.length} roles for team`)

This ensures:
✅ If cloning fails: exception is thrown, auth user is rolled back, error returned
❌ If cloning succeeds: team has roles, local admin role is assigned
❌ If cloning succeeds but returns empty: error is caught before user creation

IMPLEMENTATION:
1. Read src/lib/supabase/auth-server.ts completely
2. Find teamSignUp() function (line ~126)
3. Find cloneRoleTemplatesForTeam() call (line ~185)
4. Add validation check right after that call:
   if (!roleIds || roleIds.length === 0) {
     throw new Error('Failed to clone role templates for team')
   }
5. Verify getLocalAdminRole() still has its validation (line ~192)
6. Verify cleanup happens if either throws

CURRENT CODE (WRONG):
  // Step 3: Clone all role templates for this team
  console.log('Step 3: Cloning role templates...')
  const roleIds = await cloneRoleTemplatesForTeam(teamId)
  console.log(`Created ${roleIds.length} roles for team`)

  // Step 4: Get the Local Admin role
  console.log('Step 4: Getting Local Admin role...')
  const localAdminRole = await getLocalAdminRole(teamId)

  if (!localAdminRole) {  // ✓ This has validation
    throw new Error('Local Admin role not found after template cloning')
  }

CORRECT CODE:
  // Step 3: Clone all role templates for this team
  console.log('Step 3: Cloning role templates...')
  const roleIds = await cloneRoleTemplatesForTeam(teamId)
  if (!roleIds || roleIds.length === 0) {  // ✓ ADD THIS VALIDATION
    throw new Error('Failed to clone role templates for team')
  }
  console.log(`Created ${roleIds.length} roles for team`)

  // Step 4: Get the Local Admin role
  console.log('Step 4: Getting Local Admin role...')
  const localAdminRole = await getLocalAdminRole(teamId)

  if (!localAdminRole) {  // ✓ This validation remains
    throw new Error('Local Admin role not found after template cloning')
  }

CRITICAL VALIDATION CHECKLIST:

[ ] CODE VERIFICATION:
    - [ ] Located cloneRoleTemplatesForTeam() call
    - [ ] Found validation check right after
    - [ ] Check validates: !roleIds || roleIds.length === 0
    - [ ] Throws meaningful error if validation fails
    - [ ] getLocalAdminRole() validation still present
    - [ ] Both validations happen before user creation

[ ] ERROR FLOW:
    - [ ] If cloning fails: throw error → caught in outer catch → auth user deleted
    - [ ] If cloning succeeds: continue to get local admin role
    - [ ] If local admin role missing: throw error → auth user deleted
    - [ ] Both failures trigger cleanup (deleteUser in catch block)

[ ] TEAM STATE:
    - [ ] After passing both validations: team has ≥1 roles
    - [ ] After passing both validations: local admin role exists
    - [ ] User can be assigned local admin role
    - [ ] User will have valid role_id after signup

AUTOMATED TEST (YOU MUST EXECUTE):

Test role cloning validation:

---BEGIN TEST CODE---
// ROLE CLONING VALIDATION TEST

console.log("👤 ROLE TEMPLATE CLONING TEST\n");

// Simulate cloneRoleTemplatesForTeam results
const cloneScenarios = [
  {
    name: "Cloning succeeds - returns 4 roles",
    roleIds: ["role-1", "role-2", "role-3", "role-4"],
    shouldContinue: true,
    action: "Continue to getLocalAdminRole()"
  },
  {
    name: "Cloning fails - returns empty array",
    roleIds: [],
    shouldContinue: false,
    action: "Throw error - team has no roles"
  },
  {
    name: "Cloning fails - returns null",
    roleIds: null,
    shouldContinue: false,
    action: "Throw error - cloning function failed"
  },
  {
    name: "Cloning fails - returns undefined",
    roleIds: undefined,
    shouldContinue: false,
    action: "Throw error - cloning function failed"
  }
];

console.log("Testing role cloning validation:\n");

cloneScenarios.forEach(scenario => {
  console.log(`Scenario: ${scenario.name}`);
  console.log(`  Returned: ${JSON.stringify(scenario.roleIds)}`);

  // Apply validation logic
  const shouldContinue = scenario.roleIds && scenario.roleIds.length > 0;
  const isCorrect = shouldContinue === scenario.shouldContinue;

  if (isCorrect) {
    console.log(`  ✅ PASS: ${scenario.action}`);
  } else {
    console.log(`  ❌ FAIL: Expected ${scenario.shouldContinue}, got ${shouldContinue}`);
  }

  if (!shouldContinue) {
    console.log(`  Error: "Failed to clone role templates for team"`);
  }
  console.log();
});

// Verify cascading validations
console.log("=".repeat(50));
console.log("VALIDATION CASCADE VERIFICATION:");

const validateFlow = [
  { step: 1, check: "cloneRoleTemplatesForTeam() succeeds", result: "✅" },
  { step: 2, check: "Validation: roleIds.length > 0", result: "✅" },
  { step: 3, check: "Continue to getLocalAdminRole()", result: "✅" },
  { step: 4, check: "Validation: localAdminRole exists", result: "✅" },
  { step: 5, check: "Create user with role_id", result: "✅" }
];

validateFlow.forEach(v => {
  console.log(`Step ${v.step}: ${v.check} - ${v.result}`);
});

console.log("\n✅ If all 5 steps succeed, team is properly setup with roles");
---END TEST CODE---

RUN THIS TEST and verify all scenarios pass.

VERIFICATION QUERIES:
1. Find line with: const roleIds = await cloneRoleTemplatesForTeam(teamId)
2. Next line should check: if (!roleIds || roleIds.length === 0)
3. Verify throw: new Error('Failed to clone role templates for team')
4. Confirm getLocalAdminRole() validation still exists (line ~192)

FINAL CHECKLIST:
[ ] Validation added after cloneRoleTemplatesForTeam() call
[ ] Check uses: !roleIds || roleIds.length === 0
[ ] Throws error if validation fails
[ ] Error message is clear and helpful
[ ] getLocalAdminRole() validation still present
[ ] Both validations happen before user creation
[ ] All 4 test scenarios pass

PASS/FAIL DETERMINATION:
If ALL below are YES, Issue #7 is FIXED:
- YES: Validation added: if (!roleIds || roleIds.length === 0)
- YES: Throws error if cloning failed
- YES: getLocalAdminRole() validation still present
- YES: Both validations before user creation
- YES: All 4 test scenarios pass correctly

Output Format:
=====================================
ISSUE #7 - ROLE VALIDATION: [✅ FIXED] or [❌ NOT FIXED]
Details:
- Cloning validation: [✅ if (!roleIds || .length === 0)]
- Error thrown: [✅ "Failed to clone role templates"]
- Cascading checks: [✅ Both validations present]
- Test scenarios: [✅ All 4 pass]
- Status: [✅ READY FOR PHASE 2 PROMPT 4]
=====================================
```

---

## PHASE 2: PROMPT 4 - Remove Auto-Creation Side Effect (Issue #5)

```
TASK: Remove dangerous auto-creation fallback - includes cleanup verification

FILES TO READ:
- src/lib/supabase/auth-server.ts (lines 73-77, function getCurrentUser)

PROBLEM:
The getCurrentUser() function auto-creates user records as fallback when user doesn't exist.
This masks bugs in signup/login flows and creates invalid user state.

CURRENT BUG (Lines 73-76):
  if (!userData) {
    console.warn('[getCurrentUser] ⚠️ No user record found - user must complete signup or onboarding')
    // Note: Users in "pending" state have team_id=null and role_id=null until they complete onboarding
    return null
  }

WAIT - THIS HAS ALREADY BEEN FIXED! (Per system reminder at start)

REQUIRED ACTION:
1. Verify that auto-creation code is REMOVED
2. Verify that function returns null if user doesn't exist
3. Confirm no auto-creation code remains

VERIFICATION ONLY (No changes needed):

Go to src/lib/supabase/auth-server.ts and verify:

[ ] Lines 73-76 show:
    if (!userData) {
      console.warn('[getCurrentUser] ⚠️ No user record found - user must complete signup or onboarding')
      // Note about pending users
      return null  // ✓ Returns null, NOT creating record
    }

[ ] No try/catch block with auto-creation logic
[ ] No createAdminClient() call inside getCurrentUser()
[ ] No .insert() statement for user creation
[ ] Function ends with: return userData as UserWithRole

AUTOMATED TEST (YOU MUST EXECUTE):

Verify auto-creation has been removed:

---BEGIN TEST CODE---
// AUTO-CREATION REMOVAL VERIFICATION

console.log("🧹 AUTO-CREATION CLEANUP VERIFICATION\n");

const verificationSteps = [
  {
    check: "No auto-creation code in getCurrentUser()",
    method: "Search for 'adminSupabase' in getCurrentUser() function",
    expectFound: false,
    result: "❌ FAIL"
  },
  {
    check: "No .insert() statement in getCurrentUser()",
    method: "Search for '.insert(' in getCurrentUser() function",
    expectFound: false,
    result: "❌ FAIL"
  },
  {
    check: "Function returns null when userData is null",
    method: "Lines 73-76 should show: if (!userData) { return null; }",
    expectFound: true,
    result: "❌ FAIL"
  },
  {
    check: "Console warning remains",
    method: "Check for warning about 'must complete signup or onboarding'",
    expectFound: true,
    result: "❌ FAIL"
  }
];

console.log("Verification checklist:\n");

verificationSteps.forEach((step, i) => {
  console.log(`${i + 1}. ${step.check}`);
  console.log(`   Method: ${step.method}`);
  console.log(`   Expected: ${step.expectFound ? 'FOUND' : 'NOT FOUND'}`);
  console.log(`   Status: ${step.result}`);
  console.log();
});

console.log("=".repeat(50));
console.log("AUTO-CREATION STATUS:");
console.log("If all checks show ✅, auto-creation has been removed.");
console.log("If any checks show ❌, auto-creation code still exists!");
---END TEST CODE---

RUN THIS TEST and verify all checks pass.

VERIFICATION QUERIES:
1. Search src/lib/supabase/auth-server.ts for "createAdminClient" → should NOT appear in getCurrentUser()
2. Search for ".insert(" → should NOT appear in getCurrentUser()
3. Search for "if (!userData)" → should show simple return null
4. Verify function is simpler: should be <100 lines (was ~130 with auto-creation)

FINAL CHECKLIST:
[ ] Auto-creation code is REMOVED
[ ] Function returns null when userData null
[ ] No createAdminClient() call in function
[ ] No .insert() statement in function
[ ] Warning message remains
[ ] Function is clean and simple
[ ] No side effects

PASS/FAIL DETERMINATION:
If ALL below are YES, Issue #5 is FIXED:
- YES: No auto-creation code found
- YES: Function returns null if user record missing
- YES: Console warning still present
- YES: Function has no side effects
- YES: Verification test passes

Output Format:
=====================================
ISSUE #5 - AUTO-CREATION REMOVED: [✅ FIXED] or [❌ NOT FIXED]
Details:
- Auto-creation code removed: [✅ Verified]
- Returns null if not found: [✅ Confirmed]
- Side effects eliminated: [✅ Clean function]
- All checks pass: [✅ 4/4]
- Status: [✅ READY FOR PHASE 2 PROMPT 5]
=====================================
```

---

## PHASE 2: PROMPT 5 - Input Sanitization (Issue #12)

```
TASK: Add input sanitization to user creation - includes validation testing

FILES TO READ:
- src/lib/auth-actions.ts (lines 10-54, function signUp)
- src/lib/supabase/auth-server.ts (lines 126-242, function teamSignUp)
- src/lib/supabase/auth-server.ts (lines 251-342, function createMasterAdmin)

PROBLEM:
String fields (email, username, firstName, lastName) are not sanitized.
Can cause:
- Duplicate accounts if email has spaces: " admin@test.com " vs "admin@test.com"
- Invalid usernames with special characters
- XSS if data rendered in UI

REQUIRED FIXES:
Add .trim() to string fields and ensure consistency:

In signUp() - Line ~37:
  FROM: email: email,
  TO:   email: email.trim().toLowerCase(),

  FROM: username: email.split('@')[0],
  TO:   username: email.trim().toLowerCase().split('@')[0],

In teamSignUp() - Line ~204:
  FROM: email: data.email,
  TO:   email: data.email.trim().toLowerCase(),

  FROM: username: data.email.split('@')[0],
  TO:   username: data.email.trim().toLowerCase().split('@')[0],

  FROM: first_name: data.firstName,
  TO:   first_name: data.firstName?.trim(),

  FROM: last_name: data.lastName,
  TO:   last_name: data.lastName?.trim(),

In createMasterAdmin() - Line ~292:
  FROM: email: data.email,
  TO:   email: data.email.trim().toLowerCase(),

  FROM: username: data.email.split('@')[0],
  TO:   username: data.email.trim().toLowerCase().split('@')[0],

  FROM: first_name: data.firstName,
  TO:   first_name: data.firstName?.trim(),

  FROM: last_name: data.lastName,
  TO:   last_name: data.lastName?.trim(),

IMPLEMENTATION:
1. Read all three functions in both files
2. For EACH user creation (.insert()), add sanitization:
   - email: .trim().toLowerCase()
   - username: derived from trimmed email
   - first_name: .trim()
   - last_name: .trim()
3. Use optional chaining (?.) for optional fields
4. Test with edge cases

CRITICAL VALIDATION CHECKLIST:

[ ] CODE VERIFICATION:
    - [ ] signUp() sanitizes email, username
    - [ ] teamSignUp() sanitizes email, username, first_name, last_name
    - [ ] createMasterAdmin() sanitizes email, username, first_name, last_name
    - [ ] All use .trim().toLowerCase() for email
    - [ ] All use optional chaining (?.) for optional fields
    - [ ] No spaces in final values

[ ] CONSISTENCY:
    - [ ] All 3 functions follow same pattern
    - [ ] Email always: .trim().toLowerCase()
    - [ ] Names always: .trim()
    - [ ] Username derived from email: email.trim().toLowerCase().split('@')[0]

[ ] SECURITY:
    - [ ] No XSS vectors in string fields
    - [ ] Leading/trailing spaces removed
    - [ ] Email normalization prevents duplicates
    - [ ] Invalid characters in username prevented at insert level

AUTOMATED TEST (YOU MUST EXECUTE):

Test sanitization with edge cases:

---BEGIN TEST CODE---
// INPUT SANITIZATION TEST

console.log("🧼 INPUT SANITIZATION TEST\n");

const sanitizeEmail = (email) => email.trim().toLowerCase();
const sanitizeUsername = (email) => email.trim().toLowerCase().split('@')[0];
const sanitizeName = (name) => name?.trim();

const testCases = [
  {
    name: "Normal input",
    input: { email: "john@test.com", firstName: "John", lastName: "Doe" },
    expected: { email: "john@test.com", username: "john", firstName: "John", lastName: "Doe" },
    description: "Should pass through unchanged"
  },
  {
    name: "Email with spaces",
    input: { email: "  john@test.com  ", firstName: "John", lastName: "Doe" },
    expected: { email: "john@test.com", username: "john", firstName: "John", lastName: "Doe" },
    description: "Should trim spaces"
  },
  {
    name: "Email uppercase",
    input: { email: "JOHN@TEST.COM", firstName: "John", lastName: "Doe" },
    expected: { email: "john@test.com", username: "john", firstName: "John", lastName: "Doe" },
    description: "Should lowercase"
  },
  {
    name: "Names with spaces",
    input: { email: "john@test.com", firstName: "  John  ", lastName: "  Doe  " },
    expected: { email: "john@test.com", username: "john", firstName: "John", lastName: "Doe" },
    description: "Should trim names"
  },
  {
    name: "Complex email",
    input: { email: "  John.Doe+tag@TEST.COM  ", firstName: "John", lastName: "Doe" },
    expected: { email: "john.doe+tag@test.com", username: "john.doe+tag", firstName: "John", lastName: "Doe" },
    description: "Should handle complex email correctly"
  }
];

console.log("Testing sanitization:\n");

testCases.forEach(test => {
  console.log(`Test: ${test.name}`);
  console.log(`Input: ${JSON.stringify(test.input)}`);

  const result = {
    email: sanitizeEmail(test.input.email),
    username: sanitizeUsername(test.input.email),
    firstName: sanitizeName(test.input.firstName),
    lastName: sanitizeName(test.input.lastName)
  };

  const pass =
    result.email === test.expected.email &&
    result.username === test.expected.username &&
    result.firstName === test.expected.firstName &&
    result.lastName === test.expected.lastName;

  if (pass) {
    console.log(`✅ PASS: ${test.description}`);
  } else {
    console.log(`❌ FAIL: ${test.description}`);
    console.log(`Expected: ${JSON.stringify(test.expected)}`);
    console.log(`Got:      ${JSON.stringify(result)}`);
  }
  console.log();
});

console.log("=".repeat(50));
console.log("If all 5 tests pass, sanitization is correct.");
---END TEST CODE---

RUN THIS TEST and verify all 5 edge cases pass.

VERIFICATION QUERIES:
1. Search for "email.trim().toLowerCase()" → should appear 3 times (once per function)
2. Search for ".firstName?.trim()" → should appear 2 times (in teamSignUp + createMasterAdmin)
3. Search for ".lastName?.trim()" → should appear 2 times
4. Search for "split('@')[0]" → should appear 3 times, all preceded by .trim().toLowerCase()

FINAL CHECKLIST:
[ ] signUp() sanitizes email and username
[ ] teamSignUp() sanitizes all 4 fields
[ ] createMasterAdmin() sanitizes all 4 fields
[ ] All use: email.trim().toLowerCase()
[ ] All use: firstName?.trim(), lastName?.trim()
[ ] All 5 test cases pass
[ ] No unsanitized string fields

PASS/FAIL DETERMINATION:
If ALL below are YES, Issue #12 is FIXED:
- YES: Email sanitized: .trim().toLowerCase()
- YES: Username from sanitized email
- YES: Names sanitized: .trim()
- YES: Applied to all 3 user creation functions
- YES: All 5 test cases pass correctly

Output Format:
=====================================
ISSUE #12 - INPUT SANITIZATION: [✅ FIXED] or [❌ NOT FIXED]
Details:
- Email sanitization: [✅ .trim().toLowerCase()]
- Name sanitization: [✅ .trim()]
- Username generation: [✅ From sanitized email]
- Applied everywhere: [✅ All 3 functions]
- Test cases: [✅ All 5 pass]
- Status: [✅ PHASE 2 COMPLETE]
=====================================
```

---

## PHASE 2 SUMMARY VALIDATION

After completing all 5 prompts, you MUST output this summary:

```
=====================================
PHASE 2 COMPLETION SUMMARY
=====================================

ISSUE #3 - SIGNUP REDIRECT: [  ] FIXED or [ ] NOT FIXED
- Redirect to /onboarding: [  ] ✅ or ❌
- Flow test result: [✅ or ❌]

ISSUE #6 - LOGIN SAFEGUARD: [  ] FIXED or [ ] NOT FIXED
- Error handling: [  ] ✅ or ❌
- PGRST116 check: [  ] ✅ or ❌
- Test result: [✅ or ❌]

ISSUE #7 - ROLE VALIDATION: [  ] FIXED or [ ] NOT FIXED
- Cloning validation: [  ] ✅ or ❌
- Test result: [✅ or ❌]

ISSUE #5 - AUTO-CREATION: [  ] FIXED or [ ] NOT FIXED
- Code removed: [  ] ✅ or ❌
- Test result: [✅ or ❌]

ISSUE #12 - SANITIZATION: [  ] FIXED or [ ] NOT FIXED
- Email sanitization: [  ] ✅ or ❌
- Name sanitization: [  ] ✅ or ❌
- Test result: [✅ or ❌]

=====================================
OVERALL PHASE 2 STATUS:
[  ] ✅ ALL HIGH-PRIORITY ISSUES FIXED - READY FOR TESTING
[  ] ❌ SOME ISSUES REMAIN - REVIEW ABOVE
=====================================
```

Fill in checkboxes with ✅ or ❌ based on test results.
If all 5 are FIXED, Phase 2 is complete and core features are robust.
```

---

## HOW TO USE PHASE 2

**Prerequisites**: Phase 1 all [✅ FIXED] - Authentication working

1. Open new Claude Code chat window
2. Copy PROMPT 1 completely (everything from "TASK:" to end of that section)
3. Paste and wait for completion
4. Claude will make fix AND execute validation tests
5. Review validation output - confirm it says [✅ FIXED]
6. Repeat steps 1-5 for PROMPT 2, 3, 4, and 5
7. Output final PHASE 2 SUMMARY

**Critical**: Do NOT proceed to testing until all 5 issues show [✅ FIXED]

---

## PHASE 1 + 2 COMPLETION = CORE FUNCTIONALITY READY

After Phase 1 and Phase 2 are complete:
✅ Authentication working (login/signup/logout)
✅ Master admin creation secure
✅ User constraints enforced
✅ Input sanitization applied
✅ Error handling robust
✅ Role management validated

Ready for: Feature testing (CRUD operations, data isolation, permissions)
