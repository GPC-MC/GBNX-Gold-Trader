#!/bin/bash
set -e

echo "=== Docker Cleanup Script ==="
echo "This will free up disk space by removing unused Docker resources"

echo -e "\n1. Removing stopped containers..."
docker container prune -f

echo -e "\n2. Removing unused images..."
docker image prune -a -f

echo -e "\n3. Removing unused volumes..."
docker volume prune -f

echo -e "\n4. Removing build cache..."
docker builder prune -a -f

echo -e "\n5. System cleanup..."
docker system prune -a -f --volumes

echo -e "\n=== Current disk usage ==="
df -h | grep -E 'Filesystem|/$'

echo -e "\n=== Docker disk usage ==="
docker system df

echo -e "\n✅ Cleanup complete!"
