# Test Verification Steps

## Quick Verification (2 minutes)

### Step 1: Start the server
```bash
npm run dev
```

Wait for message: "✓ Ready in Xs"

### Step 2: In another terminal, run the quick test
```bash
node scripts/test-full-flow.js
```

**Expected output**:
```
✅ Test user found
✅ Candidate created in database
✅ Candidate retrieved from database
✅ API is running and correctly rejecting unauthenticated requests
✅ Created 5 candidates with all fields filled
✅ TEST COMPLETE - EVERYTHING IS WORKING
```

**Status**: If you see all checkmarks, the API is working! ✅

---

## Complete Verification (3 minutes)

Run all three test scripts:

### Test 1: Full Flow
```bash
node scripts/test-full-flow.js
```

**What it tests**:
- Database connectivity
- Direct inserts via Supabase SDK
- Mock data creation
- API endpoint reachability
- Authentication validation

**Expected**: All ✅

### Test 2: API with Auth
```bash
node scripts/test-api-with-auth.js
```

**What it tests**:
- User authentication
- API endpoint behavior
- Request validation
- Data transformation
- Field completeness

**Expected**: All ✅

### Test 3: Form Data Transformation
```bash
node scripts/test-insert-via-form-data.js
```

**What it tests**:
- camelCase field names
- Schema validation
- Data transformation
- Database insert

**Expected**: All ✅

### Test 4: Comprehensive Diagnostics
```bash
node scripts/diagnostic-api-test.js
```

**What it tests**:
- Database connectivity
- Table schema
- Direct inserts
- Query operations
- API endpoint
- User lookup

**Expected**: All ✅

---

## Manual Testing in Browser

### Prerequisites
- Dev server running: `npm run dev`
- Terminal showing "✓ Ready in Xs"

### Test User Credentials
```
Email: test.swagath@gmail.com
Password: 12345678
```

### Test Steps

#### 1. Log In
- Go to http://localhost:3000 (or actual port from terminal)
- Click "Sign In" or "Login"
- Enter credentials
- Submit
- Expected: Redirected to dashboard

#### 2. View Pre-Created Candidates
- Click "Candidates" in sidebar
- Expected: See 5 candidates:
  - Sarah Patel (Senior Python Developer, 8 years)
  - James Williams (Full Stack Developer, 7 years)
  - Kavya Brown (Java Engineer, 4 years)
  - Sarah Singh (Frontend Developer, 6 years)
  - Arjun Kumar (Lead Data Engineer, 11 years)

#### 3. Create New Candidate
- Click "Add New Candidate" button
- Fill form with:
  - **First Name**: TestUser (required)
  - **Last Name**: Success (required)
  - Email: test.success@example.com
  - Phone: 555-1234
  - Current Location: Test City
  - Current Title: Test Developer
  - Current Company: Test Inc
  - Years of Experience: 5
  - Skills: Add JavaScript, React
  - Status: new
  - Notes: Test candidate

#### 4. Submit Form
- Click "Create Candidate" button
- Expected:
  - Form submits
  - No error message
  - Redirected to candidate detail page
  - Shows "TestUser Success" with all filled fields

#### 5. Verify Candidate Created
- Go back to Candidates list
- Find "TestUser Success" in list
- Click to view detail
- Verify all fields are present:
  - ✅ Email
  - ✅ Phone
  - ✅ Location
  - ✅ Title
  - ✅ Company
  - ✅ Experience
  - ✅ Skills
  - ✅ Status

---

## Debug Info (If Tests Fail)

### Check 1: Dev Server Status
```bash
# Check if server is running on correct port
lsof -i :3000 | grep node

# If not, try other ports
lsof -i :3001 | grep node
lsof -i :3002 | grep node
```

### Check 2: Environment Variables
```bash
# Verify .env.local has required values
cat .env.local | grep SUPABASE
```

**Should output**:
```
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Check 3: Database Connection
```bash
# Test database directly
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
sb.from('users').select('count()', { count: 'exact' }).then(r => console.log('Users:', r.data))
"
```

### Check 4: API Logs
```bash
# Watch dev server logs for errors
# Terminal running "npm run dev" should show:
# [POST /candidates] Checking authentication...
# [POST /candidates] User authenticated: <user-id>
# [POST /candidates] ✅ Candidate created successfully: <id>
```

---

## Expected Test Results

### Full Flow Test Output
```
✅ Test user found: test.swagath@gmail.com
✅ Candidate created in database
✅ Candidate retrieved from database
✅ API is running and correctly rejecting unauthenticated requests
✅ Created 5 candidates with all fields filled
✅ TEST COMPLETE - EVERYTHING IS WORKING
```

### API with Auth Test Output
```
✅ User found
✅ API is running
✅ All direct database operations working
✅ Database schema is correct
✅ Multi-tenant isolation verified
✅ All fields are stored and retrieved correctly
✅ API IS FULLY OPERATIONAL
```

### Form Data Transformation Test Output
```
✅ INSERT SUCCESS!
Inserted: {
  "first_name": "Test",
  "last_name": "User",
  "email": "test.xxx@test.com",
  ...
}
```

### Diagnostics Test Output
```
✅ Direct insert succeeded
✅ Query succeeded
✅ Found candidate
✅ API returned JSON
✅ Test user found
✅ DIAGNOSTIC COMPLETE
```

---

## What Each File Tests

| File | Purpose | Tests |
|------|---------|-------|
| `test-full-flow.js` | Full integration test | DB, mock data, API endpoint |
| `test-api-with-auth.js` | API behavior | Auth, validation, transformation |
| `test-insert-via-form-data.js` | Form data handling | camelCase → snake_case |
| `diagnostic-api-test.js` | Comprehensive check | All components |

---

## Success Criteria

✅ All tests pass
✅ No error messages
✅ All candidates created
✅ API responds with 401 for unauth (correct!)
✅ API validates and accepts form data
✅ Data transforms correctly
✅ Multi-tenant isolation works
✅ Form submission succeeds in UI

If all above are true, the API is fully fixed and operational!

---

## Next Action

1. Run: `npm run dev`
2. Run: `node scripts/test-full-flow.js`
3. Verify: All checkmarks (✅)
4. Then: Log in and test form submission

That's it! Everything should work now. 🎉
