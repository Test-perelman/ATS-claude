# QA TEST EXECUTION GUIDE - PERELMAN ATS
**Quick Reference for QA Testing Team**
**Date**: December 20, 2025

---

## QUICK START

### Prerequisites (Complete Before Testing)
- [ ] Node.js and npm installed
- [ ] Dev environment running on `http://localhost:3000`
- [ ] Supabase configured and running
- [ ] Environment variables set (`.env.local`)
- [ ] Test data created (see Test Data Setup below)

### Essential Credentials for Testing
```
ADMIN_SETUP_TOKEN: Check .env.local for value (production should be secure random string)
SUPABASE_URL: https://awujhuncfghjshggkqyo.supabase.co
Master Admin Email: master@test.com (if previously created)
Test User 1: user1@test.com
Test User 2: user2@test.com
```

---

## TEST DATA SETUP (30 minutes)

### Step 1: Create Master Admin
```bash
# Option A: Use API directly
curl -X POST http://localhost:3000/api/admin/create-master-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "master@test.com",
    "password": "MasterPass123!@#",
    "firstName": "System",
    "lastName": "Admin",
    "setupToken": "[ADMIN_SETUP_TOKEN from .env.local]"
  }'

# Expected Response:
# {
#   "success": true,
#   "message": "Master admin created successfully",
#   "data": { "user_id": "...", "email": "master@test.com", ... }
# }
```

### Step 2: Create Test Teams (via signup + onboarding)
**Team 1:**
- [ ] Go to `http://localhost:3000/auth/signup`
- [ ] Email: `user1@test.com`
- [ ] Password: `User1Pass123!@#`
- [ ] Confirm password
- [ ] Click Sign Up
- [ ] Should redirect to `/onboarding`
- [ ] Company Name: "Test Company A"
- [ ] Click Continue
- [ ] Team Name: "QA Team A"
- [ ] Click Create Team
- [ ] Verify redirect to dashboard

**Team 2:**
- [ ] Logout (if needed)
- [ ] Repeat signup with:
  - Email: `user2@test.com`
  - Password: `User2Pass123!@#`
  - Company: "Test Company B"
  - Team: "QA Team B"

---

## TEST PHASE A: AUTHENTICATION (1 hour)

### A1: Master Admin Can Login
```
Steps:
1. Navigate to http://localhost:3000/auth/login
2. Email: master@test.com
3. Password: MasterPass123!@#
4. Click Login

Expected Result:
✅ Redirects to /dashboard
✅ See dashboard with "System Admin" or "Master Admin" label
✅ Can see team selector showing all teams

If it fails:
❌ Check auth.users in Supabase - master user should exist
❌ Check public.users table - master user record should exist with is_master_admin=true
❌ Check .env.local - Supabase credentials must be correct
```

### A2: Regular User Can Login
```
Steps:
1. Navigate to http://localhost:3000/auth/login
2. Email: user1@test.com
3. Password: User1Pass123!@#
4. Click Login

Expected Result:
✅ Redirects to /dashboard
✅ See dashboard with "QA Team A" selected
✅ Cannot see other teams (no team selector or disabled)

If it fails:
❌ Check public.users table - user1 should exist
❌ Check team_id and role_id are not null
```

### A3: Session Persists After Page Refresh
```
Steps:
1. Login as user1@test.com
2. Refresh page (Ctrl+R or F5)
3. Wait for page to load

Expected Result:
✅ Still on /dashboard
✅ User context still loaded (no redirect to login)
✅ Team name still visible

If it fails:
❌ AuthContext not initializing properly
❌ Session API endpoint not returning data
```

### A4: Logout Works
```
Steps:
1. Login as user1@test.com
2. Click logout button (likely in header or settings)
3. Wait for redirect

Expected Result:
✅ Redirects to /auth/login or home page
✅ Cannot access /dashboard (redirects to login)
✅ Session cleared

If it fails:
❌ Check signOut() function in auth-actions.ts
```

---

## TEST PHASE B: USER SIGNUP & ONBOARDING (1.5 hours)

### B1: Signup Validation - Password Mismatch
```
Steps:
1. Navigate to /auth/signup
2. Email: newuser@test.com
3. Password: Pass123!@#
4. Confirm Password: DifferentPass!@#
5. Click Sign Up

Expected Result:
❌ Form should show error: "Passwords do not match"
✅ No API call made
✅ User not created

If it fails:
❌ Form validation not working
```

### B2: Signup Validation - Invalid Email
```
Steps:
1. Navigate to /auth/signup
2. Email: notanemail
3. Password: Pass123!@#
4. Confirm Password: Pass123!@#
5. Click Sign Up

Expected Result:
❌ Browser validation should show "Invalid email" or similar
❌ No API call made

If it fails:
❌ HTML5 email validation not working
```

### B3: Successful Signup Redirects to Onboarding
```
Steps:
1. Navigate to /auth/signup
2. Email: signup-test@test.com
3. Password: TestPass123!@#
4. Confirm Password: TestPass123!@#
5. Click Sign Up
6. Watch for redirect

Expected Result:
✅ Shows "Account created! Setting up your team..." message
✅ Redirects to /onboarding within 1 second
✅ Onboarding page shows progress bar (step 1 of 2)

If it fails:
❌ signUp server action not returning success
❌ Client-side redirect not triggering
```

### B4: Onboarding Step 1 - Company Name Validation
```
Steps:
1. On onboarding step 1
2. Leave company name empty
3. Click Continue

Expected Result:
❌ Error message: "Company name is required"
✅ Does not advance to step 2

If it fails:
❌ Form validation not working
```

### B5: Onboarding Step 1 - Enter Company
```
Steps:
1. On onboarding step 1
2. Enter "Test Company XYZ"
3. Click Continue

Expected Result:
✅ Advances to step 2
✅ Progress bar shows both steps
✅ Team name pre-filled with "Test Company XYZ"

If it fails:
❌ Form submission failing
❌ Team name not being pre-filled
```

### B6: Onboarding Step 2 - Back Button Works
```
Steps:
1. On onboarding step 2
2. Click Back button

Expected Result:
✅ Goes back to step 1
✅ Company name still has value
✅ Progress bar shows step 1

If it fails:
❌ Back button not working
```

### B7: Onboarding Step 2 - Team Name Validation
```
Steps:
1. On onboarding step 2
2. Clear team name field
3. Click Create Team

Expected Result:
❌ Error message: "Team name is required"
✅ Does not submit

If it fails:
❌ Form validation missing
```

### B8: Onboarding Step 2 - Create Team Success
```
Steps:
1. On onboarding step 2
2. Modify team name to "QA Test Team XYZ"
3. Click Create Team
4. Wait for loading to complete

Expected Result:
✅ Shows loading state: "Creating Team..."
✅ Redirects to /dashboard
✅ Dashboard shows "QA Test Team XYZ" as active team

Check in Supabase:
✅ New team created in public.teams
✅ User's team_id updated to new team
✅ User's role_id set to Local Admin role
✅ Role templates cloned for new team (should have 4-6 roles)

If it fails:
❌ /api/auth/team-setup endpoint not working
❌ Role cloning failing
❌ User not being assigned to team
```

---

## TEST PHASE C: CANDIDATE MANAGEMENT (2 hours)

### C1: Create Candidate - Validation
```
Steps:
1. Navigate to /candidates/new
2. Click Create without filling any fields

Expected Result:
❌ Form validation errors appear (likely under each field)
✅ "First name is required"
✅ "Last name is required"

If it fails:
❌ Client-side form validation missing
```

### C2: Create Candidate - Success
```
Steps:
1. Navigate to /candidates/new
2. Fill form:
   - First Name: John
   - Last Name: Doe
   - Email: john.doe@acme.com
   - Phone: +1-555-0100
   - Current Title: Senior Developer
   - Current Company: Acme Corp
   - Experience Years: 5
   - Skills: React, Node.js, TypeScript
   - Status: New
3. Click Create

Expected Result:
✅ Form submits
✅ Shows loading state
✅ Redirects to /candidates list
✅ New candidate appears in list
✅ Shows: "John Doe" with email and status

Check in Supabase:
✅ New record in public.candidates
✅ team_id matches user's team
✅ created_by matches user_id
✅ Status is "new"

If it fails:
❌ API endpoint returning error (check browser console)
❌ Team context not being set
❌ Permissions check failing
```

### C3: Create Multiple Candidates
```
Steps:
1. Create candidate: Jane Smith (jane.smith@acme.com)
2. Create candidate: Bob Johnson (bob.johnson@acme.com)
3. Navigate to /candidates

Expected Result:
✅ List shows all 3 candidates (John Doe, Jane Smith, Bob Johnson)
✅ Most recent first (Bob)
✅ Pagination shows total count

If it fails:
❌ List query not working
❌ Team filtering not working
```

### C4: Filter Candidates by Status
```
Steps:
1. Navigate to /candidates
2. Look for filter control (dropdown, buttons, etc.)
3. Select status: "Interviewing"
4. Verify only candidates with "interviewing" status show

Expected Result:
✅ Filter control works
✅ List updates to show only filtered candidates
✅ Count shows filtered total

If it fails:
❌ Filter control missing or broken
❌ Query parameter not being used
```

### C5: Search Candidates
```
Steps:
1. Navigate to /candidates
2. Look for search input
3. Type "jane"
4. Wait for results to filter

Expected Result:
✅ Shows only "Jane Smith" candidate
✅ Search is case-insensitive
✅ Searches first_name, last_name, email

If it fails:
❌ Search control missing
❌ Search not working
```

### C6: Update Candidate
```
Steps:
1. Navigate to /candidates
2. Click on "John Doe" to view details
3. Edit fields (change status to "Interviewing")
4. Click Save

Expected Result:
✅ Form submits
✅ Redirects back to list
✅ John Doe now shows status "Interviewing"

Check in Supabase:
✅ Candidate record updated
✅ updated_at timestamp changed
✅ updated_by set to current user

If it fails:
❌ Update API not working
❌ List not refreshing
```

### C7: Delete Candidate (Soft Delete)
```
Steps:
1. Navigate to /candidates list
2. Find candidate "Bob Johnson"
3. Click delete button (if available) or go to detail and click delete
4. Confirm deletion

Expected Result:
✅ Candidate removed from list
✅ Loading state shown during delete
✅ No errors in console

Check in Supabase:
✅ deleted_at field set to current timestamp
✅ Candidate still in database (soft delete)
✅ Query with "deleted_at IS NULL" excludes it

If it fails:
❌ Delete endpoint not working
❌ Soft delete not implemented
```

---

## TEST PHASE D: CLIENT MANAGEMENT (1 hour)

### D1: Create Client
```
Steps:
1. Navigate to /clients/new
2. Fill form:
   - Client Name: Acme Corporation
   - Industry: Technology
   - Contact Name: John Smith
   - Contact Email: john@acme.com
   - Status: Active
3. Click Create

Expected Result:
✅ Redirects to /clients list
✅ "Acme Corporation" appears in list

Check in Supabase:
✅ New record in public.clients
✅ client_name: "Acme Corporation"
✅ team_id matches user's team
✅ created_by matches user_id
```

### D2: List Clients
```
Steps:
1. Create 2-3 clients
2. Navigate to /clients
3. Verify all clients shown

Expected Result:
✅ All clients appear in list
✅ Pagination works
✅ Can filter by status

If it fails:
❌ List query broken
❌ Filtering not working
```

---

## TEST PHASE E: JOB REQUIREMENTS (1 hour)

### E1: Create Job Requirement
```
Steps:
1. Navigate to /requirements/new
2. Fill form:
   - Title: Senior React Developer
   - Description: We need an experienced React developer
   - Client: (select "Acme Corporation" from dropdown)
   - Status: Open
   - Target Salary (optional): 150000
3. Click Create

Expected Result:
✅ Redirects to /requirements list
✅ New requirement shows in list

Check in Supabase:
✅ New record in public.job_requirements
✅ title: "Senior React Developer"
✅ client_id links to Acme Corporation
✅ team_id matches user's team
```

### E2: Verify Client Link
```
Steps:
1. Navigate to /clients
2. Click "Acme Corporation"
3. Should show associated requirements

Expected Result:
✅ Shows "Senior React Developer" requirement linked to this client
✅ Can navigate back

If it fails:
❌ Client detail page not showing requirements
❌ Foreign key relationship not working
```

---

## TEST PHASE F: SUBMISSIONS & INTERVIEWS (1.5 hours)

### F1: Create Submission
```
Steps:
1. Navigate to /submissions/new
2. Fill form:
   - Requirement: "Senior React Developer"
   - Candidate: "John Doe"
   - Status: Submitted
3. Click Create

Expected Result:
✅ Redirects to /submissions list
✅ Shows submission: "John Doe" → "Senior React Developer"

Check in Supabase:
✅ New record in public.submissions
✅ requirement_id links to requirement
✅ candidate_id links to candidate
✅ team_id matches user's team
```

### F2: Update Submission Status
```
Steps:
1. Navigate to /submissions
2. Click on submission to view details
3. Change status to "Interview Scheduled"
4. Click Save

Expected Result:
✅ Status updates in list
✅ Timestamp updated

Check in Supabase:
✅ submission.status changed
✅ updated_at updated
```

### F3: Schedule Interview
```
Steps:
1. Navigate to /interviews/new
2. Fill form:
   - Submission: (select John Doe submission)
   - Scheduled Date/Time: Tomorrow at 2:00 PM
   - Status: Scheduled
3. Click Create

Expected Result:
✅ Redirects to /interviews list
✅ Shows interview with correct date/time

Check in Supabase:
✅ New record in public.interviews
✅ submission_id is set
✅ scheduled_at is correct datetime
```

### F4: Update Interview
```
Steps:
1. Navigate to /interviews
2. Click on interview
3. Change time to 3:00 PM
4. Click Save

Expected Result:
✅ Time updated in list
✅ No errors

If it fails:
❌ Update endpoint broken
```

---

## TEST PHASE G: DATA ISOLATION (1 hour)

### G1: Create Second User in Different Team
```
Steps:
1. Logout (if needed)
2. Signup new user:
   - Email: different.user@test.com
   - Password: DiffPass123!@#
3. Complete onboarding:
   - Company: "Different Corp"
   - Team: "Different Team"
4. Create a candidate: "Alice Wonder"
```

### G2: Verify User 1 Cannot See User 2's Data
```
Steps:
1. Logout
2. Login as user1@test.com
3. Navigate to /candidates
4. Search for "Alice Wonder"

Expected Result:
❌ Alice Wonder should NOT appear in list
✅ Only shows candidates from "QA Team A"
✅ Total count doesn't include Alice

Check in Supabase:
✅ Query filters by team_id = user's team_id
✅ RLS policy blocks cross-team access

If it fails:
❌ CRITICAL: Data isolation broken!
❌ Users can see other team's data
❌ RLS policies not enforced
```

### G3: Master Admin Can See All Teams
```
Steps:
1. Logout
2. Login as master@test.com
3. Look for team selector/switcher
4. Should see multiple teams: "QA Team A", "QA Team B", "Different Team"
5. Switch to "Different Team"
6. Navigate to /candidates
7. Verify "Alice Wonder" appears

Expected Result:
✅ Master admin can see all teams
✅ Can switch between teams
✅ Can see all team's data
✅ No data leakage (only shows selected team's data)

If it fails:
❌ Team switching not working
❌ Master admin can't access other teams
```

---

## TEST PHASE H: PERMISSIONS (1 hour)

### H1: Local Admin Can Create Candidates
```
Steps:
1. Login as user1@test.com (Local Admin of "QA Team A")
2. Navigate to /candidates/new
3. Try to create a candidate

Expected Result:
✅ Can access page
✅ Can create candidate
✅ No "Forbidden" error

If it fails:
❌ Permission check broken
❌ User not being identified as Local Admin
```

### H2: Verify Role-Based Permissions
```
Current test setup should have:
- Master Admin: user@test.com (system-wide access)
- Local Admin: user1@test.com (team admin)
- Regular User: user2@test.com (basic access, if created differently)

If you have a recruiter role:
Steps:
1. Create user with Recruiter role
2. Try to create candidate (should work)
3. Try to manage roles (should fail with "Forbidden")

Expected Result:
✅ User can only do actions their role allows
✅ Forbidden actions return 403 status
✅ No unintended access grants
```

### H3: Verify Master Admin Has All Permissions
```
Steps:
1. Login as master@test.com
2. Try to: create candidate, create role, manage users, etc.

Expected Result:
✅ Can perform all actions
✅ No permission denials
```

---

## TEST PHASE I: ERROR HANDLING (1 hour)

### I1: Invalid Email Format
```
Steps:
1. Navigate to /auth/signup
2. Email: not-an-email
3. Try to submit

Expected Result:
❌ Browser validation prevents submission
✅ Clear error message shown

If it fails:
❌ Email validation missing
```

### I2: Duplicate Email on Signup
```
Steps:
1. Navigate to /auth/signup
2. Email: user1@test.com (already exists)
3. Password: Pass123!@#
4. Click Sign Up

Expected Result:
❌ API returns error (likely "Email already exists")
✅ Error message shown to user
✅ User not created

If it fails:
❌ API not checking for duplicate
❌ Database constraint not enforced
```

### I3: Unauthorized Access to API
```
Steps:
1. Open browser dev tools
2. In console, run:
   ```javascript
   fetch('/api/candidates', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ first_name: 'Test', last_name: 'User' })
   }).then(r => r.json()).then(console.log)
   ```
3. (Do this while logged out)

Expected Result:
❌ Returns status 401 with error: "User authentication required"
✅ No candidate created

If it fails:
❌ CRITICAL: Unauthenticated access allowed!
❌ Anyone can create candidates
```

### I4: Missing Required Fields
```
Steps:
1. Navigate to /candidates/new
2. Don't fill any fields
3. Click Create

Expected Result:
❌ Form shows validation errors
❌ No API call made (or API returns 400 error)
✅ User guided to fill required fields

If it fails:
❌ Validation not working
```

### I5: Server Error Handling
```
Steps:
1. With dev tools open (Network tab)
2. Create a candidate normally
3. Look at network response

Expected Result:
✅ Status 200 on success
✅ Status 400 on bad input
✅ Status 401 on unauthorized
✅ Status 403 on forbidden
❌ Status 500 should NOT appear (if it does, it's a bug)

If it fails:
❌ Error handling not returning correct status codes
```

---

## AUTOMATED TESTING (Optional)

If you want to run automated tests:

```bash
# Run test script
node test-comprehensive-qa.js

# Or with specific base URL
BASE_URL=http://localhost:3000 node test-comprehensive-qa.js

# Capture output
node test-comprehensive-qa.js > test-results.txt 2>&1
```

---

## BUG REPORTING TEMPLATE

When you find a bug, document it like this:

```
TEST CASE: [Phase][Number] - [Name]
SEVERITY: Critical / High / Medium / Low
STATUS: Reproducible / Intermittent / One-time

STEPS TO REPRODUCE:
1. Step 1
2. Step 2
3. Expected: X, Actual: Y

ERROR MESSAGE:
[Copy full error from console or alert]

SCREENSHOT:
[If possible, attach screenshot]

ENVIRONMENT:
- Browser: Chrome 120
- User: user1@test.com
- Team: QA Team A
- Time: 2025-12-20 14:32 UTC

ADDITIONAL NOTES:
[Any other relevant info]
```

---

## QUICK REFERENCE CHECKLIST

### Before Starting
- [ ] Dev server running (http://localhost:3000)
- [ ] Supabase configured
- [ ] Master admin created
- [ ] Test teams created
- [ ] Test users created

### Test Phases
- [ ] Phase A: Authentication (1 hr)
- [ ] Phase B: Signup & Onboarding (1.5 hrs)
- [ ] Phase C: Candidates (2 hrs)
- [ ] Phase D: Clients (1 hr)
- [ ] Phase E: Requirements (1 hr)
- [ ] Phase F: Submissions & Interviews (1.5 hrs)
- [ ] Phase G: Data Isolation (1 hr)
- [ ] Phase H: Permissions (1 hr)
- [ ] Phase I: Error Handling (1 hr)

### Success Criteria (All Must Pass)
- [ ] All phases complete without critical bugs
- [ ] No unhandled errors in console
- [ ] No 500 errors (or documented)
- [ ] Data isolation verified
- [ ] Authentication working
- [ ] Permissions enforced
- [ ] Forms validate properly
- [ ] APIs return correct status codes

---

## SUPPORT CONTACTS

**Questions during testing?**
- Check the Comprehensive QA Report: `FINAL_QA_REPORT_2025_12_20.md`
- Check the Executive Summary: `QA_TESTING_EXECUTIVE_SUMMARY.md`
- Review API endpoints: `QA_COMPREHENSIVE_TEST_2025_12_20.md`

**For technical issues:**
- Check browser console (F12)
- Check server logs
- Check Supabase dashboard for database issues

---

**Good luck with testing! 🚀**
