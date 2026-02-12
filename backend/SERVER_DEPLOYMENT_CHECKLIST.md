# Server Deployment Checklist

## Pre-Deployment Setup

### 1. Database IP Whitelisting ⚠️ CRITICAL

#### PostgreSQL (Railway/Cloud)
- [ ] Lấy IP public của server: `curl ifconfig.me`
- [ ] Vào Railway/Cloud console
- [ ] Thêm IP vào whitelist/firewall rules
- [ ] Test connection từ server:
  ```bash
  psql -h 34.171.199.115 -p 5433 -U steven -d transactions
  ```

#### MongoDB (Railway)
- [ ] Whitelist server IP trong MongoDB Atlas/Railway
- [ ] Update connection string nếu cần
- [ ] Test connection:
  ```bash
  mongosh "mongodb://mongo:password@hopper.proxy.rlwy.net:51646"
  ```

#### MySQL (Railway)
- [ ] Whitelist server IP
- [ ] Test connection:
  ```bash
  mysql -h metro.proxy.rlwy.net -P 23263 -u root -p railway
  ```

### 2. Update .env for Production

```bash
# PostgreSQL – Use external host
DB_HOST=34.171.199.115  # NOT localhost or 127.0.0.1
DB_PORT=5433
DB_NAME=transactions
DB_USER=steven
DB_PASS="}XF3zA+5B=.j(Yy5"

# MongoDB – Use public URL
MONGO_URL=mongodb://mongo:bMuaMHDYlyeqKoOWsbGwuRgXUdVaTHmp@hopper.proxy.rlwy.net:51646

# MySQL – Use public URL
MYSQL_URL=mysql://root:ixAkAZCFasOBYISybojoqPfMeiVxeUpb@metro.proxy.rlwy.net:23263/railway
```

### 3. Server Requirements

- [ ] Docker installed: `docker --version` (20.10+)
- [ ] Docker Compose installed: `docker compose version` (2.0+)
- [ ] Port 8081 available: `lsof -i :8081`
- [ ] Firewall allows port 8081 (nếu cần external access)
- [ ] Sufficient disk space: `df -h`
- [ ] Sufficient memory: `free -h` (recommend 2GB+)

### 4. Security Setup

- [ ] Copy .env file securely (SCP/SFTP, NOT commit to git)
  ```bash
  scp .env user@server:/path/to/backend/
  ```
- [ ] Set proper permissions:
  ```bash
  chmod 600 .env  # Only owner can read/write
  ```
- [ ] Setup SSL/TLS if exposing to internet (use Nginx reverse proxy)
- [ ] Change all default passwords
- [ ] Rotate API keys if needed

## Deployment Steps

### Step 1: Clone/Upload Code to Server

```bash
# Option 1: Git clone
git clone https://github.com/your-repo/GBNX-Gold-Trader.git
cd GBNX-Gold-Trader/backend

# Option 2: Upload via SCP
scp -r backend/ user@server:/path/to/app/
```

### Step 2: Upload .env File

```bash
# From local machine
scp backend/.env user@server:/path/to/app/backend/.env

# On server, verify
cat .env  # Check content
chmod 600 .env  # Secure it
```

### Step 3: Get Server IP

```bash
# On the server
curl ifconfig.me
# Or
curl icanhazip.com
# Or
ip addr show
```

**Save this IP! You need it for database whitelist.**

### Step 4: Whitelist Server IP in Databases

#### Railway PostgreSQL
1. Go to Railway dashboard: https://railway.app
2. Select your PostgreSQL service
3. Go to "Settings" → "Networking" or "Firewall"
4. Add server IP to whitelist
5. Save changes

#### Railway MongoDB
1. Same steps as PostgreSQL
2. Or if using MongoDB Atlas, go to Network Access

#### Railway MySQL
1. Same steps as PostgreSQL

### Step 5: Test Database Connections

```bash
# Test PostgreSQL
psql -h 34.171.199.115 -p 5433 -U steven -d transactions
# Should connect successfully

# Test with nc (netcat) if psql not available
nc -zv 34.171.199.115 5433
# Should show: Connection succeeded

# Test MongoDB
nc -zv hopper.proxy.rlwy.net 51646

# Test MySQL
nc -zv metro.proxy.rlwy.net 23263
```

### Step 6: Deploy Docker Container

```bash
cd /path/to/backend

# Option 1: Use deploy script
./deploy.sh
# Choose option 2 (Docker Compose)

# Option 2: Direct docker compose
docker compose up -d --build
```

### Step 7: Verify Deployment

```bash
# Check container is running
docker ps

# Check logs
docker compose logs -f

# Test health endpoint
curl http://localhost:8081/
# Should return: {"message": "AI Agent platform is running v1!", ...}

# Run test script
./test-deployment.sh
```

## Post-Deployment Configuration

### 1. Setup Reverse Proxy (Nginx) - RECOMMENDED

```nginx
# /etc/nginx/sites-available/gbnx-backend
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/gbnx-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2. Setup SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 3. Setup Firewall (UFW)

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS (if using Nginx)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow backend port (only if direct access needed)
sudo ufw allow 8081/tcp

# Enable firewall
sudo ufw enable
```

### 4. Setup Auto-restart on Server Reboot

```bash
# Docker already has restart policy in docker-compose.yml
# But ensure Docker service starts on boot:
sudo systemctl enable docker
```

### 5. Setup Log Rotation

```bash
# Create log rotation config
sudo nano /etc/logrotate.d/docker-backend

# Add:
/path/to/backend/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 root root
    sharedscripts
}
```

## Troubleshooting

### Issue: Cannot connect to database

```bash
# 1. Check server IP is whitelisted
curl ifconfig.me

# 2. Test connection
nc -zv 34.171.199.115 5433

# 3. Check .env has correct DB_HOST (NOT localhost!)
cat .env | grep DB_HOST

# 4. Check container can reach database
docker compose exec backend curl -v telnet://34.171.199.115:5433
```

### Issue: Container won't start

```bash
# Check logs
docker compose logs backend

# Check .env file exists
ls -la .env

# Verify Docker is running
sudo systemctl status docker
```

### Issue: Port 8081 already in use

```bash
# Find what's using the port
sudo lsof -i :8081

# Kill it or change port in docker-compose.yml
```

## Monitoring

### View Logs
```bash
# Follow logs
docker compose logs -f

# Last 100 lines
docker compose logs --tail 100

# Specific time range
docker compose logs --since 30m
```

### Check Container Health
```bash
# Container status
docker ps

# Container stats (CPU, Memory)
docker stats gbnx_gold_trader_backend --no-stream

# Health check
curl http://localhost:8081/
```

### Monitor Resources
```bash
# Disk usage
df -h

# Memory usage
free -h

# Docker disk usage
docker system df
```

## Backup Strategy

### 1. Backup .env file
```bash
# Encrypted backup
tar -czf - .env | openssl enc -aes-256-cbc -e > env-backup.tar.gz.enc
```

### 2. Backup logs periodically
```bash
# Create backup script
#!/bin/bash
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/
```

## Security Best Practices

- [ ] Never commit .env to git
- [ ] Use strong passwords for all services
- [ ] Rotate API keys regularly
- [ ] Enable firewall on server
- [ ] Use SSL/TLS for all connections
- [ ] Keep Docker and packages updated
- [ ] Monitor logs for suspicious activity
- [ ] Limit database access to specific IPs only
- [ ] Use non-root user to run containers (if possible)
- [ ] Regular security audits

## Maintenance

### Update Application
```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose up -d --build

# Check logs
docker compose logs -f
```

### Update Dependencies
```bash
# Update uv.lock
uv sync --upgrade

# Rebuild
docker compose up -d --build
```

### Clean Up
```bash
# Remove unused images
docker image prune -a

# Clean system
docker system prune -a --volumes
```

## Emergency Recovery

### Rollback to Previous Version
```bash
# Stop current version
docker compose down

# Checkout previous version
git checkout <previous-commit>

# Rebuild and start
docker compose up -d --build
```

### Complete Reset
```bash
# Stop and remove everything
docker compose down -v

# Remove images
docker rmi gbnx-gold-trader-backend:latest

# Start fresh
docker compose up -d --build
```

## Contact Information

**For Support:**
- Check logs first: `docker compose logs -f`
- Review this checklist
- Check DEPLOYMENT.md for more details

**Useful Commands Reference:**
```bash
# Deploy:           docker compose up -d --build
# Stop:             docker compose down
# Restart:          docker compose restart
# Logs:             docker compose logs -f
# Shell:            docker compose exec backend bash
# Test:             ./test-deployment.sh
```
