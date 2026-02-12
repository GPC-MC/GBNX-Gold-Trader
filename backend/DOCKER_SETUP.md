# Docker Setup - Quick Reference

## Files Created

1. **Dockerfile** - Production-ready Docker image configuration
2. **docker-compose.yml** - Easy orchestration with Docker Compose
3. **.dockerignore** - Excludes unnecessary files from the image
4. **deploy.sh** - Interactive deployment script
5. **test-deployment.sh** - Automated testing script
6. **.env.example** - Template for environment variables
7. **DEPLOYMENT.md** - Comprehensive deployment guide

## Quick Start (3 Steps)

### Step 1: Ensure .env file is configured
```bash
cd backend
# Make sure your .env file exists and has the correct values
ls -la .env
```

### Step 2: Deploy
```bash
./deploy.sh
# Choose option 2 (Docker Compose - recommended)
```

### Step 3: Test
```bash
./test-deployment.sh
```

## Important Notes

### Database Host Configuration

⚠️ **CRITICAL**: If your PostgreSQL database is running on your host machine (localhost), you need to update the `DB_HOST` in your `.env` file:

**For Docker on Mac/Windows:**
```bash
DB_HOST=host.docker.internal
```

**For Docker on Linux:**
```bash
DB_HOST=172.17.0.1
# Or add --add-host=host.docker.internal:host-gateway to docker run
```

**For external database:**
```bash
DB_HOST=your.database.host.com
```

### .env File Handling

The Dockerfile handles the `.env` file in two ways:

1. **Built into image**: `.env` is copied during build (good for immutable deployments)
2. **Mounted as volume**: `.env` is mounted at runtime (good for configuration changes without rebuild)

Both methods are active, with the mounted volume taking precedence.

### Port Configuration

The backend runs on **port 8081**. Make sure this port is available:
```bash
# Check if port is in use
lsof -i :8081

# If something is using it, either:
# 1. Stop that service
# 2. Change the port mapping in docker-compose.yml
```

## Common Commands

### Start/Stop
```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Restart
docker-compose restart
```

### View Logs
```bash
# Follow logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail 100
```

### Rebuild
```bash
# After code changes
docker-compose up -d --build
```

### Access Container
```bash
# Open shell in container
docker-compose exec backend bash

# Run a command
docker-compose exec backend uv run python -c "print('Hello')"
```

## Troubleshooting

### Issue: Container starts but health check fails
```bash
# Check logs
docker-compose logs backend

# Check if app is listening
docker-compose exec backend curl localhost:8081
```

### Issue: Database connection refused
```bash
# Update DB_HOST in .env to:
DB_HOST=host.docker.internal  # For Mac/Windows
# or
DB_HOST=172.17.0.1  # For Linux
```

### Issue: Changes to code not reflected
```bash
# Rebuild the image
docker-compose up -d --build

# Or stop, remove, and rebuild
docker-compose down
docker-compose up -d --build
```

### Issue: Permission denied on logs directory
```bash
chmod -R 777 logs/
```

## Production Checklist

- [ ] Update `.env` with production values
- [ ] Set `DB_HOST` to production database
- [ ] Configure proper secrets management (don't commit `.env`)
- [ ] Set up SSL/TLS with reverse proxy (Nginx/Traefik)
- [ ] Configure resource limits in docker-compose.yml
- [ ] Set up log rotation for logs directory
- [ ] Enable monitoring and alerting
- [ ] Configure backup strategy for data
- [ ] Use `restart: always` policy
- [ ] Review and harden security settings

## API Endpoints After Deployment

Once deployed, access:

- **Health Check**: http://localhost:8081/
- **API Documentation**: http://localhost:8081/docs
- **OpenAPI Spec**: http://localhost:8081/openapi.json

### Key Endpoints:
- `POST /livechart_data` - Get live chart data with technical indicators
- `POST /latest_news` - Get latest gold-related news
- `POST /analyze_sentiment` - Analyze market sentiment
- `GET /api/balance/{user_id}` - Get user balance
- `POST /api/trade` - Execute trade

## Security Notes

1. **Never commit .env file to git** - it contains sensitive credentials
2. **Use .env.example** as a template and create your own `.env`
3. **Rotate API keys regularly**
4. **Use strong passwords** for database connections
5. **In production, use Docker secrets** instead of environment variables

## Support

For deployment issues:
1. Check `docker-compose logs -f`
2. Verify `.env` configuration
3. Ensure database is accessible
4. Review DEPLOYMENT.md for detailed troubleshooting

## File Structure
```
backend/
├── Dockerfile              # Docker image definition
├── docker-compose.yml      # Docker Compose configuration
├── .dockerignore          # Files to exclude from image
├── deploy.sh              # Deployment automation script
├── test-deployment.sh     # Testing script
├── .env                   # Your configuration (DO NOT COMMIT)
├── .env.example          # Template for .env
├── DEPLOYMENT.md         # Full deployment guide
├── DOCKER_SETUP.md       # This file
├── src/                  # Application code
│   ├── main.py          # FastAPI application
│   └── ...
├── pyproject.toml        # Python dependencies
└── uv.lock              # Locked dependencies
```
