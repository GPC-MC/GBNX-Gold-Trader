# 🚀 Quick Start - Docker Deployment

## TL;DR

```bash
# 1. Make sure .env file exists
cp .env.example .env  # If you don't have .env yet
# Edit .env with your actual credentials

# 2. Deploy with one command
./deploy.sh
# Choose option 2 (Docker Compose)

# 3. Test
./test-deployment.sh
```

## What Was Created

I've set up a complete Docker deployment system for your GBNX Gold Trader backend:

### Core Files
- ✅ **Dockerfile** - Optimized for Python 3.11 with uv package manager
- ✅ **docker-compose.yml** - Easy orchestration
- ✅ **.dockerignore** - Keeps image lean
- ✅ **deploy.sh** - Interactive deployment script
- ✅ **test-deployment.sh** - Automated testing
- ✅ **Makefile** - Convenient shortcuts

### Documentation
- 📘 **DEPLOYMENT.md** - Comprehensive deployment guide
- 📘 **DOCKER_SETUP.md** - Quick reference
- 📘 **.env.example** - Template for configuration

## Using the Deployment Scripts

### Option 1: Interactive Deployment Script (Recommended for first time)
```bash
./deploy.sh
```
This will:
- Check for .env file
- Let you choose Docker or Docker Compose
- Build the image
- Start the container
- Verify health

### Option 2: Using Makefile (Convenient for daily use)
```bash
make help          # Show all available commands
make full-deploy   # Complete deployment workflow
make logs          # View logs
make test          # Run tests
make restart       # Restart services
```

### Option 3: Docker Compose Directly
```bash
docker-compose up -d --build   # Build and start
docker-compose logs -f         # View logs
docker-compose down            # Stop
```

## Key Configuration

### ⚠️ Important: Database Host

Your current `.env` has:
```bash
DB_HOST=127.0.0.1
```

**For Docker deployment, you need to change this to:**

**On Mac/Windows:**
```bash
DB_HOST=host.docker.internal
```

**On Linux:**
```bash
DB_HOST=172.17.0.1
```

This allows the container to connect to your host's PostgreSQL database.

## Verify Deployment

After deployment, check:

1. **Health endpoint:**
   ```bash
   curl http://localhost:8081/
   ```

2. **API Documentation:**
   Open http://localhost:8081/docs in your browser

3. **Run tests:**
   ```bash
   ./test-deployment.sh
   ```

## Common Operations

```bash
# View logs
make logs
# or
docker-compose logs -f

# Restart after code changes
make rebuild
# or
docker-compose up -d --build

# Access container shell
make shell
# or
docker-compose exec backend bash

# Check container status
make ps
# or
docker ps

# Stop services
make down
# or
docker-compose down
```

## File Structure

```
backend/
├── 🐳 Dockerfile                 # Docker image definition
├── 🐳 docker-compose.yml         # Compose configuration
├── 📝 .dockerignore              # Files to exclude
├── 🚀 deploy.sh                  # Deployment script (executable)
├── 🧪 test-deployment.sh         # Testing script (executable)
├── 🔧 Makefile                   # Command shortcuts
├── 🔐 .env                       # Your config (KEEP SECRET!)
├── 📋 .env.example               # Config template
├── 📘 DEPLOYMENT.md              # Full guide
├── 📘 DOCKER_SETUP.md            # Quick reference
└── 📘 README_DOCKER.md           # This file
```

## Troubleshooting

### Container won't start?
```bash
docker logs gbnx_gold_trader_backend
```

### Port already in use?
```bash
# Check what's using port 8081
lsof -i :8081

# Change port in docker-compose.yml if needed
```

### Database connection issues?
```bash
# Make sure DB_HOST is set correctly in .env
# For local PostgreSQL on host:
DB_HOST=host.docker.internal  # Mac/Windows
DB_HOST=172.17.0.1           # Linux
```

### Changes not reflected?
```bash
make rebuild
# or
docker-compose up -d --build
```

## Next Steps

1. ✅ Verify .env file has correct values
2. ✅ Update DB_HOST for Docker networking
3. ✅ Run `./deploy.sh`
4. ✅ Test with `./test-deployment.sh`
5. ✅ Access API docs at http://localhost:8081/docs

## Production Notes

For production deployment:
- Use proper secrets management
- Set up SSL/TLS with reverse proxy
- Configure resource limits
- Enable monitoring and logging
- See DEPLOYMENT.md for full checklist

## Need Help?

- Check `docker-compose logs -f` for errors
- Review DEPLOYMENT.md for detailed troubleshooting
- Verify .env configuration matches your environment
