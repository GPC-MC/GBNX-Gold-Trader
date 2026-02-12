#!/bin/bash

# Script to check database connectivity and get server IP
# Run this on your server before deploying

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

print_message "$BLUE" "========================================="
print_message "$BLUE" "Database Connectivity Check"
print_message "$BLUE" "========================================="
echo ""

# Step 1: Get Server IP
print_message "$YELLOW" "Step 1: Getting Server Public IP..."
SERVER_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || curl -s ipinfo.io/ip)

if [ -z "$SERVER_IP" ]; then
    print_message "$RED" "✗ Could not determine server IP"
    exit 1
else
    print_message "$GREEN" "✓ Server Public IP: $SERVER_IP"
    echo ""
    print_message "$YELLOW" "⚠️  IMPORTANT: Add this IP to your database whitelist!"
    echo "   - Railway: Go to service → Settings → Networking"
    echo "   - MongoDB Atlas: Go to Network Access"
    echo "   - Cloud SQL: Go to Connections → Add network"
    echo ""
fi

# Check if .env exists
if [ ! -f .env ]; then
    print_message "$RED" "✗ .env file not found!"
    print_message "$YELLOW" "Please create .env file first before running connectivity tests"
    exit 1
fi

print_message "$GREEN" "✓ .env file found"
echo ""

# Load database config from .env
print_message "$YELLOW" "Step 2: Loading database configuration from .env..."
source .env 2>/dev/null || true

# Step 3: Test PostgreSQL
print_message "$YELLOW" "Step 3: Testing PostgreSQL Connection..."
if [ ! -z "$DB_HOST" ] && [ ! -z "$DB_PORT" ]; then
    echo "Testing: $DB_HOST:$DB_PORT"

    if command -v nc &> /dev/null; then
        if nc -zv -w 5 "$DB_HOST" "$DB_PORT" 2>&1 | grep -q "succeeded\|open"; then
            print_message "$GREEN" "✓ PostgreSQL port is reachable"
        else
            print_message "$RED" "✗ Cannot connect to PostgreSQL"
            print_message "$YELLOW" "  Make sure $SERVER_IP is whitelisted in your database firewall"
        fi
    else
        print_message "$YELLOW" "! nc (netcat) not installed, skipping port test"
        print_message "$YELLOW" "  Install with: sudo apt install netcat"
    fi

    # Try psql if available
    if command -v psql &> /dev/null; then
        print_message "$YELLOW" "  Testing with psql..."
        if PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
            print_message "$GREEN" "✓ PostgreSQL connection successful!"
        else
            print_message "$RED" "✗ PostgreSQL authentication failed"
            print_message "$YELLOW" "  Check credentials in .env or verify IP whitelist"
        fi
    fi
else
    print_message "$YELLOW" "! PostgreSQL config not found in .env"
fi
echo ""

# Step 4: Test MongoDB
print_message "$YELLOW" "Step 4: Testing MongoDB Connection..."
if [ ! -z "$MONGOHOST" ] && [ ! -z "$MONGOPORT" ]; then
    echo "Testing: $MONGOHOST:$MONGOPORT"

    if command -v nc &> /dev/null; then
        if nc -zv -w 5 "$MONGOHOST" "$MONGOPORT" 2>&1 | grep -q "succeeded\|open"; then
            print_message "$GREEN" "✓ MongoDB port is reachable"
        else
            print_message "$RED" "✗ Cannot connect to MongoDB"
            print_message "$YELLOW" "  Make sure $SERVER_IP is whitelisted"
        fi
    fi
else
    print_message "$YELLOW" "! MongoDB config not found in .env or not used"
fi
echo ""

# Step 5: Test MySQL
print_message "$YELLOW" "Step 5: Testing MySQL Connection..."
if [ ! -z "$MYSQLHOST" ] && [ ! -z "$MYSQLPORT" ]; then
    echo "Testing: $MYSQLHOST:$MYSQLPORT"

    if command -v nc &> /dev/null; then
        if nc -zv -w 5 "$MYSQLHOST" "$MYSQLPORT" 2>&1 | grep -q "succeeded\|open"; then
            print_message "$GREEN" "✓ MySQL port is reachable"
        else
            print_message "$RED" "✗ Cannot connect to MySQL"
            print_message "$YELLOW" "  Make sure $SERVER_IP is whitelisted"
        fi
    fi
else
    print_message "$YELLOW" "! MySQL config not found in .env or not used"
fi
echo ""

# Summary
print_message "$BLUE" "========================================="
print_message "$BLUE" "Summary"
print_message "$BLUE" "========================================="
echo ""
print_message "$GREEN" "Server Public IP: $SERVER_IP"
echo ""
print_message "$YELLOW" "Next Steps:"
echo "1. ✓ Save this IP: $SERVER_IP"
echo "2. → Go to your database provider (Railway/Atlas/Cloud SQL)"
echo "3. → Add this IP to the whitelist/firewall rules"
echo "4. → Run this script again to verify connectivity"
echo "5. → Once all tests pass, run: ./deploy.sh"
echo ""
print_message "$BLUE" "Configuration Check:"
echo "  DB_HOST: ${DB_HOST:-Not set}"
echo "  DB_PORT: ${DB_PORT:-Not set}"
echo "  MONGOHOST: ${MONGOHOST:-Not set}"
echo "  MYSQLHOST: ${MYSQLHOST:-Not set}"
echo ""

# Warning about localhost
if [ "$DB_HOST" = "localhost" ] || [ "$DB_HOST" = "127.0.0.1" ]; then
    print_message "$RED" "⚠️  WARNING: DB_HOST is set to localhost/127.0.0.1"
    print_message "$YELLOW" "   For Docker deployment, this will NOT work!"
    print_message "$YELLOW" "   Update .env to use the actual database host IP"
    echo ""
fi

print_message "$BLUE" "For detailed deployment guide, see:"
echo "  - SERVER_DEPLOYMENT_CHECKLIST.md"
echo "  - DEPLOYMENT.md"
