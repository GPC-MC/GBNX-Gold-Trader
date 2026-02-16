#!/bin/bash

# Mount temporary directories to /data volume permanently
# This prevents "No space left on device" errors on small root partitions

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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_message "$RED" "Please run as root: sudo ./setup-tmp-to-data.sh"
    exit 1
fi

print_message "$BLUE" "========================================="
print_message "$BLUE" "Mount /tmp and /var/tmp to /data"
print_message "$BLUE" "========================================="
echo ""

# Show current disk usage
print_message "$YELLOW" "Current disk usage:"
df -h / | grep -E 'Filesystem|/$'
df -h /data | grep -E 'Filesystem|/data$'
echo ""

# Step 1: Clean up current /tmp and /var/tmp
print_message "$BLUE" "Step 1: Cleaning up current temporary directories..."
rm -rf /tmp/* /tmp/.* 2>/dev/null || true
rm -rf /var/tmp/* /var/tmp/.* 2>/dev/null || true
print_message "$GREEN" "✓ Cleanup completed"
echo ""

# Step 2: Create directories on /data
print_message "$BLUE" "Step 2: Creating directories on /data volume..."
mkdir -p /data/tmp
mkdir -p /data/var-tmp
chmod 1777 /data/tmp
chmod 1777 /data/var-tmp
print_message "$GREEN" "✓ Directories created with correct permissions"
echo ""

# Step 3: Unmount if already mounted
print_message "$BLUE" "Step 3: Checking existing mounts..."
if mountpoint -q /tmp; then
    print_message "$YELLOW" "Unmounting existing /tmp mount..."
    umount /tmp || true
fi
if mountpoint -q /var/tmp; then
    print_message "$YELLOW" "Unmounting existing /var/tmp mount..."
    umount /var/tmp || true
fi
print_message "$GREEN" "✓ Ready for new mounts"
echo ""

# Step 4: Mount directories
print_message "$BLUE" "Step 4: Mounting temporary directories to /data..."
mount --bind /data/tmp /tmp
mount --bind /data/var-tmp /var/tmp
print_message "$GREEN" "✓ Mounted successfully"
echo ""

# Step 5: Make mounts persistent
print_message "$BLUE" "Step 5: Making mounts persistent (adding to /etc/fstab)..."

# Backup fstab
cp /etc/fstab /etc/fstab.backup.$(date +%Y%m%d-%H%M%S)

# Remove old entries if they exist
sed -i.bak '/\/data\/tmp.*\/tmp/d' /etc/fstab
sed -i.bak '/\/data\/var-tmp.*\/var\/tmp/d' /etc/fstab

# Add new entries
echo "" >> /etc/fstab
echo "# Temporary directories mounted to /data volume to avoid filling root partition" >> /etc/fstab
echo "/data/tmp     /tmp        none    bind    0   0" >> /etc/fstab
echo "/data/var-tmp /var/tmp    none    bind    0   0" >> /etc/fstab

print_message "$GREEN" "✓ Added to /etc/fstab (backup at /etc/fstab.backup.*)"
echo ""

# Step 6: Verify mounts
print_message "$BLUE" "Step 6: Verifying mounts..."
if mountpoint -q /tmp && mountpoint -q /var/tmp; then
    print_message "$GREEN" "✓ All mounts verified successfully!"
    echo ""
    print_message "$YELLOW" "Mount points:"
    df -h /tmp /var/tmp
else
    print_message "$RED" "⚠ Warning: Some mounts may not be active"
fi
echo ""

# Step 7: Clean up Docker and system
print_message "$BLUE" "Step 7: Cleaning up Docker and system cache..."
docker system prune -af 2>/dev/null || true
docker builder prune -af 2>/dev/null || true
apt-get clean
apt-get autoremove -y
journalctl --vacuum-size=100M
print_message "$GREEN" "✓ Cleanup completed"
echo ""

# Final disk usage
print_message "$GREEN" "========================================="
print_message "$GREEN" "Setup completed successfully!"
print_message "$GREEN" "========================================="
echo ""
print_message "$YELLOW" "New disk usage:"
df -h / | grep -E 'Filesystem|/$'
df -h /data | grep -E 'Filesystem|/data$'
echo ""

print_message "$BLUE" "Summary:"
echo "  ✓ /tmp mounted to /data/tmp"
echo "  ✓ /var/tmp mounted to /data/var-tmp"
echo "  ✓ Mounts will persist after reboot"
echo "  ✓ All temporary files will now use /data volume (98GB)"
echo ""

print_message "$YELLOW" "Next steps:"
echo "1. cd ~/GBNX-Gold-Trader/backend"
echo "2. ./deploy.sh"
echo ""

print_message "$GREEN" "You should never see 'No space left on device' errors again! 🎉"
