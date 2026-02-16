#!/bin/bash

# GBNX Gold Trader - Docker Data Volume Setup
# This script moves Docker data directory to /data to avoid filling up root partition

set -e

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
print_message "$BLUE" "Docker Data Directory Setup"
print_message "$BLUE" "========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_message "$RED" "Please run as root: sudo ./setup-docker-data.sh"
    exit 1
fi

# Show current disk usage
print_message "$YELLOW" "Current disk usage:"
df -h / | tail -n 1
df -h /data | tail -n 1
echo ""

# Clean up first
print_message "$BLUE" "Step 1: Cleaning up Docker artifacts..."
docker system prune -af || true
docker volume prune -f || true
print_message "$GREEN" "✓ Cleanup completed"
echo ""

# Stop Docker
print_message "$BLUE" "Step 2: Stopping Docker service..."
systemctl stop docker
systemctl stop docker.socket
print_message "$GREEN" "✓ Docker stopped"
echo ""

# Create new directory
print_message "$BLUE" "Step 3: Creating /data/docker directory..."
mkdir -p /data/docker
print_message "$GREEN" "✓ Directory created"
echo ""

# Move existing data
if [ -d "/var/lib/docker" ] && [ "$(ls -A /var/lib/docker)" ]; then
    print_message "$BLUE" "Step 4: Moving existing Docker data..."
    print_message "$YELLOW" "This may take a few minutes..."
    rsync -aP /var/lib/docker/ /data/docker/
    mv /var/lib/docker /var/lib/docker.backup
    print_message "$GREEN" "✓ Data moved (backup at /var/lib/docker.backup)"
else
    print_message "$YELLOW" "No existing Docker data to move"
fi
echo ""

# Configure Docker
print_message "$BLUE" "Step 5: Configuring Docker daemon..."
cat > /etc/docker/daemon.json <<EOF
{
  "data-root": "/data/docker",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
print_message "$GREEN" "✓ Configuration updated"
echo ""

# Start Docker
print_message "$BLUE" "Step 6: Starting Docker service..."
systemctl start docker
print_message "$GREEN" "✓ Docker started"
echo ""

# Verify
print_message "$BLUE" "Step 7: Verifying configuration..."
DOCKER_ROOT=$(docker info 2>/dev/null | grep "Docker Root Dir" | awk '{print $4}')
if [ "$DOCKER_ROOT" = "/data/docker" ]; then
    print_message "$GREEN" "✓ Verification successful!"
    print_message "$GREEN" "Docker Root Dir: $DOCKER_ROOT"
else
    print_message "$RED" "⚠ Warning: Docker root is still: $DOCKER_ROOT"
    print_message "$YELLOW" "You may need to restart Docker manually"
fi
echo ""

# Clean up old kernels and system cache
print_message "$BLUE" "Step 8: Cleaning up system..."
apt-get autoremove -y
apt-get autoclean
journalctl --vacuum-time=3d
print_message "$GREEN" "✓ System cleanup completed"
echo ""

# Show new disk usage
print_message "$GREEN" "========================================="
print_message "$GREEN" "Setup completed successfully!"
print_message "$GREEN" "========================================="
echo ""
print_message "$YELLOW" "New disk usage:"
df -h / | tail -n 1
df -h /data | tail -n 1
echo ""

print_message "$BLUE" "Next steps:"
echo "1. cd ~/GBNX-Gold-Trader/backend"
echo "2. git pull"
echo "3. ./deploy.sh"
echo ""
print_message "$YELLOW" "Note: Old Docker data backup is at /var/lib/docker.backup"
print_message "$YELLOW" "You can delete it after verifying everything works"
