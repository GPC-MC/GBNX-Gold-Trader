# BuildKit Fix for Docker Build

## Problem
Docker build was failing with error:
```
the --mount option requires BuildKit
```

## Solution Applied

### 1. Updated Dockerfile
Removed the BuildKit-specific `--mount` cache option to make it compatible with both standard Docker and BuildKit:

**Before:**
```dockerfile
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev
```

**After:**
```dockerfile
RUN uv sync --frozen --no-dev --no-cache
```

### 2. Created Alternative Dockerfile
Created `Dockerfile.buildkit` with BuildKit cache optimization for those who have BuildKit enabled.

### 3. Updated deploy.sh
The deploy script now automatically detects and uses BuildKit if available, otherwise falls back to standard build.

## Deployment

### Standard Deployment (Works on all systems)
```bash
./deploy.sh
```

The script will automatically:
- Detect if BuildKit is available
- Use BuildKit if present (faster)
- Fall back to standard build if not

### Manual BuildKit Deployment (Optional)
If you want to use BuildKit manually:

```bash
# Enable BuildKit for current session
export DOCKER_BUILDKIT=1

# Build with docker compose
docker compose build

# Or build manually
docker build -t backend:latest .
```

### Using BuildKit-Optimized Dockerfile (Advanced)
```bash
DOCKER_BUILDKIT=1 docker build -f Dockerfile.buildkit -t backend:latest .
```

## Enabling BuildKit Permanently (Optional)

### On Linux
Add to `/etc/docker/daemon.json`:
```json
{
  "features": {
    "buildkit": true
  }
}
```

Then restart Docker:
```bash
sudo systemctl restart docker
```

### Set as Environment Variable
Add to `~/.bashrc` or `~/.profile`:
```bash
export DOCKER_BUILDKIT=1
```

## Trade-offs

### Standard Build (Current Default)
- ✅ Works on all Docker versions
- ✅ No configuration needed
- ✅ Compatible with older systems
- ❌ Slower builds (no cache)
- ❌ Downloads all dependencies every time

### BuildKit Build
- ✅ Faster builds with cache
- ✅ Reduced bandwidth usage
- ✅ Better layer caching
- ❌ Requires BuildKit support
- ❌ May need Docker configuration

## Current Status

✅ **Fixed**: Dockerfile now works without BuildKit
✅ **Backward Compatible**: Works on all Docker versions
✅ **Optimized**: Auto-detects and uses BuildKit when available
✅ **Flexible**: Manual BuildKit option still available

## Testing

Test the deployment:
```bash
# Clean up first (optional)
./cleanup_server.sh

# Deploy
./deploy.sh

# Choose option 2 (Docker Compose - recommended)

# Check logs
docker compose logs -f
```

## Troubleshooting

### If build still fails
```bash
# Check Docker version
docker --version

# Check if BuildKit is available
docker buildx version

# Try manual build without cache
docker build --no-cache -t backend:latest .

# Check disk space
df -h
```

### Clean up space if needed
```bash
./cleanup_server.sh
```
