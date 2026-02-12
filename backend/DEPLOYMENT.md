# GBNX Gold Trader - Backend Deployment Guide

This guide covers how to deploy the GBNX Gold Trader backend using Docker.

## Prerequisites

- Docker installed (version 20.10+)
- Docker Compose installed (version 1.29+)
- `.env` file configured in the backend directory

## Quick Start

### Option 1: Using Deployment Script (Recommended)

The easiest way to deploy is using the provided deployment script:

```bash
cd backend
./deploy.sh
```

The script will:
1. Check for required `.env` file
2. Ask you to choose between Docker or Docker Compose
3. Build the Docker image
4. Start the container
5. Verify the backend is healthy

### Option 2: Using Docker Compose

```bash
cd backend
docker-compose up -d --build
```

Check logs:
```bash
docker-compose logs -f
```

Stop services:
```bash
docker-compose down
```

### Option 3: Using Docker Manually

Build the image:
```bash
cd backend
docker build -t gbnx-gold-trader-backend:latest .
```

Run the container:
```bash
docker run -d \
  --name gbnx_gold_trader_backend \
  -p 8081:8081 \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/.env:/app/.env:ro \
  --restart unless-stopped \
  gbnx-gold-trader-backend:latest
```

## Configuration

### Environment Variables

The backend reads configuration from the `.env` file. Key variables include:

```bash
# PostgreSQL Configuration
DB_HOST=127.0.0.1
DB_PORT=5433
DB_NAME=transactions
DB_USER=steven
DB_PASS=your_password

# API Keys
GOLDIO=your_goldio_api_key
GOOGLE_API_KEY=your_google_api_key

# MongoDB (if used)
MONGO_URL=your_mongo_connection_string

# MySQL (if used)
MYSQL_URL=your_mysql_connection_string
```

### Ports

The backend runs on port **8081** by default. You can change this in:
- `docker-compose.yml` - update the ports mapping
- `Dockerfile` - update the EXPOSE directive
- Or pass as environment variable: `-e PORT=8081`

## Health Check

The backend includes a health check that runs every 30 seconds:

```bash
curl http://localhost:8081/
```

Expected response:
```json
{
  "message": "AI Agent platform is running v1!",
  "datetime": "2024-02-12 10:30:45"
}
```

## Useful Commands

### View Logs
```bash
# Docker Compose
docker-compose logs -f

# Docker
docker logs -f gbnx_gold_trader_backend
```

### Restart Container
```bash
# Docker Compose
docker-compose restart

# Docker
docker restart gbnx_gold_trader_backend
```

### Stop Container
```bash
# Docker Compose
docker-compose stop

# Docker
docker stop gbnx_gold_trader_backend
```

### Remove Container
```bash
# Docker Compose
docker-compose down

# Docker
docker rm -f gbnx_gold_trader_backend
```

### Access Container Shell
```bash
# Docker Compose
docker-compose exec backend bash

# Docker
docker exec -it gbnx_gold_trader_backend bash
```

### Rebuild and Restart
```bash
# Docker Compose
docker-compose up -d --build

# Docker
docker stop gbnx_gold_trader_backend
docker rm gbnx_gold_trader_backend
docker build -t gbnx-gold-trader-backend:latest .
docker run -d --name gbnx_gold_trader_backend -p 8081:8081 \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/.env:/app/.env:ro \
  gbnx-gold-trader-backend:latest
```

## Production Deployment

For production deployment, consider:

1. **Use a reverse proxy** (Nginx, Traefik) for SSL/TLS
2. **Set up proper logging** - mount logs to a persistent volume
3. **Configure restart policies** - use `restart: always` in production
4. **Use secrets management** - don't commit `.env` to git
5. **Set resource limits** in docker-compose.yml:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '2'
         memory: 2G
       reservations:
         memory: 1G
   ```

6. **Use environment-specific .env files**:
   - `.env.development`
   - `.env.staging`
   - `.env.production`

## Troubleshooting

### Container won't start
1. Check logs: `docker logs gbnx_gold_trader_backend`
2. Verify `.env` file exists and is readable
3. Ensure port 8081 is not already in use: `lsof -i :8081`

### Health check failing
1. Check if the app is running: `docker ps`
2. Check application logs for errors
3. Verify database connections in `.env`

### Database connection issues
1. If using external database, ensure `DB_HOST` is accessible from container
2. For `localhost` databases, use `host.docker.internal` instead
3. Check firewall rules and network connectivity

### Permission issues with logs
```bash
sudo chmod -R 777 logs/
```

## API Endpoints

Once deployed, the following endpoints are available:

- `GET /` - Health check
- `POST /livechart_data` - Get live chart data with technical indicators
- `POST /latest_news` - Get latest news articles
- `POST /analyze_sentiment` - Analyze market sentiment
- `GET /api/balance/{user_id}` - Get user balance
- `POST /api/trade` - Execute gold trade

Full API documentation available at: `http://localhost:8081/docs`

## Support

For issues or questions:
1. Check the logs first
2. Verify `.env` configuration
3. Ensure all required services (PostgreSQL, etc.) are running
4. Review the application documentation

## License

[Your License Here]
