#!/bin/bash

# GBNX Gold Trader - Docker Data Volume Setup
# This script moves Docker and containerd data directories to /data
# to avoid filling up the root partition on small boot disks.

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
print_message "$BLUE" "Docker + Containerd Data Directory Setup"
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

# Stop Docker and containerd
print_message "$BLUE" "Step 2: Stopping Docker/containerd services..."
systemctl stop docker
systemctl stop docker.socket
systemctl stop containerd || true
print_message "$GREEN" "✓ Docker/containerd stopped"
echo ""

# Create new directories
print_message "$BLUE" "Step 3: Creating /data/docker and /data/containerd directories..."
mkdir -p /data/docker
mkdir -p /data/containerd
print_message "$GREEN" "✓ Directories created"
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

# Move containerd data as well (newer Docker can use containerd snapshot paths
# under /var/lib/containerd during build export/unpack).
if [ -d "/var/lib/containerd" ] && [ ! -L "/var/lib/containerd" ]; then
    print_message "$BLUE" "Step 5: Moving existing containerd data..."
    print_message "$YELLOW" "This may take a few minutes..."
    rsync -aP /var/lib/containerd/ /data/containerd/ || true
    mv /var/lib/containerd /var/lib/containerd.backup.$(date +%Y%m%d-%H%M%S)
    ln -s /data/containerd /var/lib/containerd
    print_message "$GREEN" "✓ containerd data moved and symlinked"
elif [ -L "/var/lib/containerd" ]; then
    print_message "$YELLOW" "containerd already symlinked: $(readlink -f /var/lib/containerd)"
else
    print_message "$YELLOW" "No existing /var/lib/containerd directory found"
fi
echo ""

# Configure Docker
print_message "$BLUE" "Step 6: Configuring Docker daemon..."
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

# Start Docker/containerd
print_message "$BLUE" "Step 7: Starting containerd and Docker services..."
systemctl start containerd || true
systemctl start docker
print_message "$GREEN" "✓ Docker started"
echo ""

# Verify
print_message "$BLUE" "Step 8: Verifying configuration..."
DOCKER_ROOT=$(docker info 2>/dev/null | grep "Docker Root Dir" | awk '{print $4}')
if [ "$DOCKER_ROOT" = "/data/docker" ]; then
    print_message "$GREEN" "✓ Verification successful!"
    print_message "$GREEN" "Docker Root Dir: $DOCKER_ROOT"
else
    print_message "$RED" "⚠ Warning: Docker root is still: $DOCKER_ROOT"
    print_message "$YELLOW" "You may need to restart Docker manually"
fi
if [ -L "/var/lib/containerd" ]; then
    print_message "$GREEN" "containerd dir link: /var/lib/containerd -> $(readlink -f /var/lib/containerd)"
fi
echo ""

# Clean up old kernels and system cache
print_message "$BLUE" "Step 9: Cleaning up system..."
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
echo "3. sudo ./setup-docker-data.sh"
echo "4. ./deploy.sh"
echo ""
print_message "$YELLOW" "Note: Old Docker data backup is at /var/lib/docker.backup"
print_message "$YELLOW" "You can delete it after verifying everything works"
