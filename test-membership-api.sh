#!/bin/bash

# Membership API Test Suite
# This script tests all 3 membership endpoints
# Run with: bash test-membership-api.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASE_URL="http://localhost:3000"
HEADER_JSON="Content-Type: application/json"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to run a test
run_test() {
  local test_num=$1
  local description=$2
  local method=$3
  local endpoint=$4
  local data=$5
  local expected_status=$6

  echo ""
  echo -e "${YELLOW}TEST $test_num: $description${NC}"
  echo "Endpoint: $method $endpoint"
  echo "Expected HTTP Status: $expected_status"
  echo ""
  echo "Request Body:"
  echo "$data" | head -c 200
  echo "..."
  echo ""

  # Make the request
  response=$(curl -s -w "\n%{http_code}" \
    -X "$method" \
    "$BASE_URL$endpoint" \
    -H "$HEADER_JSON" \
    -b "" \
    -d "$data")

  # Extract status code and body
  http_status=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  echo "Response:"
  echo "$body" | head -c 300
  echo "..."
  echo ""
  echo "HTTP Status: $http_status"

  # Check if status matches expected
  if [ "$http_status" = "$expected_status" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}❌ FAIL (Expected $expected_status, got $http_status)${NC}"
    ((TESTS_FAILED++))
  fi
}

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Multi-Tenant v2 Membership API Test Suite${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo "Testing endpoints:"
echo "  1. POST /api/auth/join-team"
echo "  2. POST /api/admin/approve-membership"
echo "  3. POST /api/admin/reject-membership"
echo ""

# Test 1: Join Team - Not Authenticated
run_test 1 \
  "Join Team - Not Authenticated" \
  "POST" \
  "/api/auth/join-team" \
  '{"teamId":"550e8400-e29b-41d4-a716-446655440000","firstName":"Jane","lastName":"Doe"}' \
  "401"

# Test 2: Join Team - Missing Required Fields
run_test 2 \
  "Join Team - Missing Required Fields" \
  "POST" \
  "/api/auth/join-team" \
  '{"teamId":"550e8400-e29b-41d4-a716-446655440000"}' \
  "401"

# Test 3: Approve Membership - Not Authenticated
run_test 3 \
  "Approve Membership - Not Authenticated" \
  "POST" \
  "/api/admin/approve-membership" \
  '{"membershipId":"550e8400-e29b-41d4-a716-446655440000","roleId":"550e8400-e29b-41d4-a716-446655440001"}' \
  "401"

# Test 4: Approve Membership - Missing Fields
run_test 4 \
  "Approve Membership - Missing roleId" \
  "POST" \
  "/api/admin/approve-membership" \
  '{"membershipId":"550e8400-e29b-41d4-a716-446655440000"}' \
  "401"

# Test 5: Reject Membership - Not Authenticated
run_test 5 \
  "Reject Membership - Not Authenticated" \
  "POST" \
  "/api/admin/reject-membership" \
  '{"membershipId":"550e8400-e29b-41d4-a716-446655440000","reason":"Does not meet requirements"}' \
  "401"

# Test 6: Reject Membership - Missing Fields
run_test 6 \
  "Reject Membership - Missing reason" \
  "POST" \
  "/api/admin/reject-membership" \
  '{"membershipId":"550e8400-e29b-41d4-a716-446655440000"}' \
  "401"

# Print summary
echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}================================================${NC}"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed${NC}"
  exit 1
fi
