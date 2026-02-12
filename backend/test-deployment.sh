#!/bin/bash

# Test script to verify the backend deployment is working correctly

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

BASE_URL="http://localhost:8081"

print_message "$BLUE" "========================================="
print_message "$BLUE" "Testing GBNX Gold Trader Backend"
print_message "$BLUE" "========================================="
echo ""

# Test 1: Health check
print_message "$YELLOW" "Test 1: Health Check"
if curl -f -s "$BASE_URL/" > /dev/null; then
    RESPONSE=$(curl -s "$BASE_URL/")
    print_message "$GREEN" "✓ Health check passed"
    echo "Response: $RESPONSE"
else
    print_message "$RED" "✗ Health check failed"
    exit 1
fi
echo ""

# Test 2: Check if container is running
print_message "$YELLOW" "Test 2: Container Status"
if docker ps | grep -q "gbnx_gold_trader_backend"; then
    print_message "$GREEN" "✓ Container is running"
    docker ps | grep "gbnx_gold_trader_backend"
else
    print_message "$RED" "✗ Container is not running"
    exit 1
fi
echo ""

# Test 3: Check API docs
print_message "$YELLOW" "Test 3: API Documentation"
if curl -f -s "$BASE_URL/docs" > /dev/null; then
    print_message "$GREEN" "✓ API documentation available at $BASE_URL/docs"
else
    print_message "$RED" "✗ API documentation not accessible"
fi
echo ""

# Test 4: Check OpenAPI spec
print_message "$YELLOW" "Test 4: OpenAPI Specification"
if curl -f -s "$BASE_URL/openapi.json" > /dev/null; then
    print_message "$GREEN" "✓ OpenAPI spec available at $BASE_URL/openapi.json"
else
    print_message "$RED" "✗ OpenAPI spec not accessible"
fi
echo ""

# Test 5: Test livechart_data endpoint
print_message "$YELLOW" "Test 5: Live Chart Data Endpoint"
LIVECHART_RESPONSE=$(curl -s -X POST "$BASE_URL/livechart_data" \
  -H "Content-Type: application/json" \
  -d '{
    "trading_pairs": "xau_usd",
    "timezone": "UTC",
    "interval": 3600,
    "sort": "asc",
    "limit": 2,
    "offset": 7001
  }')

if [ $? -eq 0 ] && [ ! -z "$LIVECHART_RESPONSE" ]; then
    print_message "$GREEN" "✓ Live chart data endpoint working"
    echo "Sample response: ${LIVECHART_RESPONSE:0:200}..."
else
    print_message "$RED" "✗ Live chart data endpoint failed"
fi
echo ""

# Test 6: Check logs
print_message "$YELLOW" "Test 6: Container Logs (last 10 lines)"
docker logs --tail 10 gbnx_gold_trader_backend
echo ""

# Summary
print_message "$GREEN" "========================================="
print_message "$GREEN" "All tests completed!"
print_message "$GREEN" "========================================="
echo ""
print_message "$BLUE" "Useful URLs:"
echo "  - Health Check:    $BASE_URL/"
echo "  - API Docs:        $BASE_URL/docs"
echo "  - OpenAPI Spec:    $BASE_URL/openapi.json"
echo ""
print_message "$BLUE" "Next steps:"
echo "  1. Test the /api/balance/{user_id} endpoint"
echo "  2. Test the /api/trade endpoint"
echo "  3. Monitor logs with: docker logs -f gbnx_gold_trader_backend"
