#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"
HEADER_JSON="Content-Type: application/json"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Multi-Tenant v2 Membership API Test Suite${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Test 1: Join Team - Success Path
echo -e "${YELLOW}TEST 1: POST /api/auth/join-team - Success${NC}"
echo "Description: Authenticated user requests to join a team"
echo ""
echo -e "${BLUE}Request:${NC}"
echo "curl -X POST http://localhost:3000/api/auth/join-team \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{
  \"teamId\": \"550e8400-e29b-41d4-a716-446655440000\",
  \"firstName\": \"Jane\",
  \"lastName\": \"Doe\",
  \"requestedRole\": \"Member\"
}'"
echo ""
echo -e "${BLUE}Response:${NC}"
curl -X POST "$BASE_URL/api/auth/join-team" \
  -H "$HEADER_JSON" \
  -d '{
    "teamId": "550e8400-e29b-41d4-a716-446655440000",
    "firstName": "Jane",
    "lastName": "Doe",
    "requestedRole": "Member"
  }' 2>/dev/null | jq . || echo "Error: Server not ready"
echo ""
echo ""

# Test 2: Join Team - Missing Fields
echo -e "${YELLOW}TEST 2: POST /api/auth/join-team - Missing Required Fields${NC}"
echo "Description: Request without required fields should fail with 400"
echo ""
echo -e "${BLUE}Request:${NC}"
echo "curl -X POST http://localhost:3000/api/auth/join-team \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"teamId\": \"550e8400-e29b-41d4-a716-446655440000\"}'"
echo ""
echo -e "${BLUE}Response (Expected Status: 400):${NC}"
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST "$BASE_URL/api/auth/join-team" \
  -H "$HEADER_JSON" \
  -d '{"teamId": "550e8400-e29b-41d4-a716-446655440000"}' | jq . || echo "Error: Server not ready"
echo ""
echo ""

# Test 3: Join Team - Not Authenticated
echo -e "${YELLOW}TEST 3: POST /api/auth/join-team - Not Authenticated${NC}"
echo "Description: Request without authentication should fail with 401"
echo ""
echo -e "${BLUE}Request (simulating unauthenticated request):${NC}"
echo "curl -X POST http://localhost:3000/api/auth/join-team \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -b '' \\"
echo "  -d '{...}'"
echo ""
echo -e "${BLUE}Note:${NC} Actual authentication depends on session/token setup"
echo ""
echo ""

# Test 4: Approve Membership - Missing Fields
echo -e "${YELLOW}TEST 4: POST /api/admin/approve-membership - Missing Fields${NC}"
echo "Description: Request without required fields should fail with 400"
echo ""
echo -e "${BLUE}Request:${NC}"
echo "curl -X POST http://localhost:3000/api/admin/approve-membership \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"membershipId\": \"some-uuid\"}'"
echo ""
echo -e "${BLUE}Response (Expected Status: 400):${NC}"
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST "$BASE_URL/api/admin/approve-membership" \
  -H "$HEADER_JSON" \
  -d '{"membershipId": "some-uuid"}' | jq . || echo "Error: Server not ready"
echo ""
echo ""

# Test 5: Reject Membership - Missing Fields
echo -e "${YELLOW}TEST 5: POST /api/admin/reject-membership - Missing Fields${NC}"
echo "Description: Request without required fields should fail with 400"
echo ""
echo -e "${BLUE}Request:${NC}"
echo "curl -X POST http://localhost:3000/api/admin/reject-membership \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"membershipId\": \"some-uuid\"}'"
echo ""
echo -e "${BLUE}Response (Expected Status: 400):${NC}"
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST "$BASE_URL/api/admin/reject-membership" \
  -H "$HEADER_JSON" \
  -d '{"membershipId": "some-uuid"}' | jq . || echo "Error: Server not ready"
echo ""
echo ""

# Test 6: Approve Membership - Admin Only
echo -e "${YELLOW}TEST 6: POST /api/admin/approve-membership - Requires Admin Role${NC}"
echo "Description: Non-admin user should get 403 Forbidden"
echo ""
echo -e "${BLUE}Request:${NC}"
echo "curl -X POST http://localhost:3000/api/admin/approve-membership \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{
  \"membershipId\": \"550e8400-e29b-41d4-a716-446655440000\",
  \"roleId\": \"550e8400-e29b-41d4-a716-446655440001\"
}'"
echo ""
echo -e "${BLUE}Response (Expected Status: 401 or 403 depending on auth):${NC}"
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST "$BASE_URL/api/admin/approve-membership" \
  -H "$HEADER_JSON" \
  -d '{
    "membershipId": "550e8400-e29b-41d4-a716-446655440000",
    "roleId": "550e8400-e29b-41d4-a716-446655440001"
  }' | jq . || echo "Error: Server not ready"
echo ""
echo ""

# Test 7: Reject Membership - Admin Only
echo -e "${YELLOW}TEST 7: POST /api/admin/reject-membership - Requires Admin Role${NC}"
echo "Description: Non-admin user should get 403 Forbidden"
echo ""
echo -e "${BLUE}Request:${NC}"
echo "curl -X POST http://localhost:3000/api/admin/reject-membership \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{
  \"membershipId\": \"550e8400-e29b-41d4-a716-446655440000\",
  \"reason\": \"Does not meet requirements\"
}'"
echo ""
echo -e "${BLUE}Response (Expected Status: 401 or 403 depending on auth):${NC}"
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST "$BASE_URL/api/admin/reject-membership" \
  -H "$HEADER_JSON" \
  -d '{
    "membershipId": "550e8400-e29b-41d4-a716-446655440000",
    "reason": "Does not meet requirements"
  }' | jq . || echo "Error: Server not ready"
echo ""
echo ""

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Test Suite Complete${NC}"
echo -e "${BLUE}================================================${NC}"
