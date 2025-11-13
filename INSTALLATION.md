# Security Monitoring System - Complete Installation Guide

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [System Requirements](#system-requirements)
3. [Offline Installation on Ubuntu](#offline-installation)
4. [Online Installation](#online-installation)
5. [Configuration](#configuration)
6. [Running the System](#running-the-system)
7. [System Architecture](#system-architecture)
8. [Troubleshooting](#troubleshooting)
9. [Security Best Practices](#security-best-practices)

---

## 1. Overview

**Better than Cisco** is an enterprise-grade, real-time security alert monitoring platform that provides:

- **Real-time Alert Monitoring**: WebSocket-based instant alert notifications
- **User Authentication**: JWT-based secure authentication with role-based access control
- **Advanced Search & Filtering**: Full-text search, date ranges, IP filtering
- **Professional Dashboard**: Multi-page React application with charts and statistics
- **Alert Management**: Bulk delete, export (JSON/CSV), acknowledgment system
- **Settings Management**: User profiles, system configuration, retention policies

### Key Components
- **ClickHouse**: High-performance time-series database for alert storage
- **Vector**: Log aggregation and transformation pipeline
- **ASP.NET Core 8 API**: RESTful API with SignalR WebSocket support
- **React + Vite Frontend**: Modern, responsive web interface
- **Docker Compose**: Containerized orchestration (optional)

---

## 💻 System Requirements

### Minimum Requirements
| Component | Specification |
|-----------|---------------|
| **CPU** | 4 cores (2.0 GHz+) |
| **RAM** | 8 GB |
| **Storage** | 50 GB SSD |
| **OS** | Ubuntu 20.04 LTS or 22.04 LTS |
| **Network** | 1 Gbps NIC |

### Recommended Requirements
| Component | Specification |
|-----------|---------------|
| **CPU** | 8+ cores (3.0 GHz+) |
| **RAM** | 16-32 GB |
| **Storage** | 500 GB NVMe SSD |
| **OS** | Ubuntu 22.04 LTS |
| **Network** | 10 Gbps NIC |

### Software Dependencies
- **Docker**: 24.0+ (for containerized deployment)
- **.NET SDK**: 8.0+ (for native API deployment)
- **Node.js**: 20+ (for native frontend deployment)
- **ClickHouse**: 24.8+
- **Vector**: 0.38.0+
- **Suricata**: 7.0+ (for alert generation)

---

## 📦 Offline Installation on Ubuntu

### Step 1: Prepare Offline Packages

On a machine with internet access, download all required packages:

#### 1.1 Download Docker Packages
\`\`\`bash
### Create Directory Structure

```bash
mkdir -p ~/security-offline/{docker,dotnet,node,packages}
cd ~/security-offline
```

# Download Docker
wget https://download.docker.com/linux/ubuntu/dists/jammy/pool/stable/amd64/containerd.io_1.7.22-1_amd64.deb
wget https://download.docker.com/linux/ubuntu/dists/jammy/pool/stable/amd64/docker-ce_27.3.1-1~ubuntu.22.04~jammy_amd64.deb
wget https://download.docker.com/linux/ubuntu/dists/jammy/pool/stable/amd64/docker-ce-cli_27.3.1-1~ubuntu.22.04~jammy_amd64.deb
wget https://download.docker.com/linux/ubuntu/dists/jammy/pool/stable/amd64/docker-buildx-plugin_0.17.1-1~ubuntu.22.04~jammy_amd64.deb
wget https://download.docker.com/linux/ubuntu/dists/jammy/pool/stable/amd64/docker-compose-plugin_2.29.7-1~ubuntu.22.04~jammy_amd64.deb

mv *.deb docker/
\`\`\`

#### 1.2 Download .NET SDK
\`\`\`bash
cd ~/security-offline/dotnet
wget https://download.visualstudio.microsoft.com/download/pr/67c7dc5f-eb8a-4cd9-a0a2-07e49d8d8ba1/8eddeb4e33d0bdbcf1c4ff3f2e5f3b98/dotnet-sdk-8.0.404-linux-x64.tar.gz
\`\`\`

#### 1.3 Download Node.js
\`\`\`bash
cd ~/security-offline/node
wget https://nodejs.org/dist/v20.18.0/node-v20.18.0-linux-x64.tar.xz
\`\`\`

#### 1.4 Download Docker Images
\`\`\`bash
cd ~/security-offline/packages

# Pull and save Docker images
docker pull clickhouse/clickhouse-server:24.8
docker pull timberio/vector:0.38.0-debian
docker pull mcr.microsoft.com/dotnet/sdk:8.0
docker pull mcr.microsoft.com/dotnet/aspnet:8.0
docker pull node:20-alpine

docker save clickhouse/clickhouse-server:24.8 -o clickhouse-24.8.tar
docker save timberio/vector:0.38.0-debian -o vector-0.38.0.tar
docker save mcr.microsoft.com/dotnet/sdk:8.0 -o dotnet-sdk-8.tar
docker save mcr.microsoft.com/dotnet/aspnet:8.0 -o dotnet-aspnet-8.tar
docker save node:20-alpine -o node-20-alpine.tar
\`\`\`

#### 1.5 Clone Application Code
\`\`\`bash
cd ~/security-offline
git clone https://github.com/your-org/suricata-monitoring.git app
cd app

# Install npm dependencies and create offline cache
cd web
npm install
npm pack --pack-destination=../packages/npm-cache
cd ..

# Create tarball
cd ~/security-offline
tar -czf suricata-monitoring-offline.tar.gz *
\`\`\`

### Step 2: Transfer to Offline Machine

Transfer `suricata-monitoring-offline.tar.gz` to your offline Ubuntu server via USB, SCP, or physical media.

### Step 3: Install on Offline Ubuntu

\`\`\`bash
# Extract package
cd ~
tar -xzf suricata-monitoring-offline.tar.gz
cd security-offline

# Install Docker
cd docker
sudo dpkg -i containerd.io*.deb
sudo dpkg -i docker-ce-cli*.deb
sudo dpkg -i docker-ce*.deb
sudo dpkg -i docker-buildx-plugin*.deb
sudo dpkg -i docker-compose-plugin*.deb

# Start Docker
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
newgrp docker

# Load Docker images
cd ../packages
docker load -i clickhouse-24.8.tar
docker load -i vector-0.38.0.tar
docker load -i dotnet-sdk-8.tar
docker load -i dotnet-aspnet-8.tar
docker load -i node-20-alpine.tar

# Install .NET SDK (optional, for native deployment)
cd ../dotnet
mkdir -p /usr/share/dotnet
tar -xzf dotnet-sdk-8.0.404-linux-x64.tar.gz -C /usr/share/dotnet
ln -s /usr/share/dotnet/dotnet /usr/local/bin/dotnet

# Install Node.js (optional, for native deployment)
cd ../node
tar -xf node-v20.18.0-linux-x64.tar.xz
sudo mv node-v20.18.0-linux-x64 /opt/nodejs
sudo ln -s /opt/nodejs/bin/node /usr/local/bin/node
sudo ln -s /opt/nodejs/bin/npm /usr/local/bin/npm
\`\`\`

### Step 4: Deploy Application

\`\`\`bash
cd ~/security-offline/app

# Build and start all services
docker compose up -d --build

# Verify all services are running
docker compose ps

# Check logs
docker logs alerts-api
docker logs alerts-web
docker logs vector
\`\`\`

### Step 5: Access the System

- **Web Dashboard**: http://your-server-ip:5173
- **API Swagger**: http://your-server-ip:8080/swagger
- **Default Credentials**:
  - Username: `admin`
  - Password: `admin123`

⚠️ **IMPORTANT**: Change the default admin password immediately after first login!

---

## 🌐 Online Installation

For systems with internet access, installation is simpler:

\`\`\`bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Clone repository
git clone https://github.com/your-org/suricata-monitoring.git
cd suricata-monitoring

# Start all services
docker compose up -d --build

# Wait for services to be healthy
docker compose ps
\`\`\`

---

## ⚙️ Configuration

### Environment Variables

Create `.env` file in the project root:

\`\`\`env
# Database Configuration
CLICKHOUSE_USER=vector
CLICKHOUSE_PASSWORD=vector
CLICKHOUSE_DB=observability

# JWT Configuration
JWT_SECRET_KEY=YourSuperSecretKey123!ChangeThis
JWT_ISSUER=SuricataAlertSystem
JWT_AUDIENCE=SuricataAlertSystemUsers

# API Configuration
ASPNETCORE_URLS=http://+:8080
ASPNETCORE_ENVIRONMENT=Production

# Vector Configuration
VECTOR_LOG=info

# Ports
API_PORT=8080
WEB_PORT=5173
CLICKHOUSE_HTTP_PORT=8123
CLICKHOUSE_NATIVE_PORT=9000
\`\`\`

### ClickHouse Configuration

Edit `clickhouse/init/01_init.sql` to customize:
- Data retention periods
- Table partitioning
- Compression codecs
- Replication settings

### Vector Configuration

Edit `vector/vector.toml` to configure:
- Log file paths
- Transform rules
- Sink destinations
- Buffer sizes

---

## 🚀 Running the System

### Docker Deployment (Recommended)

\`\`\`bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Rebuild after changes
docker compose up -d --build
\`\`\`

### Native Deployment (Maximum Performance)

For production environments requiring maximum performance:

\`\`\`bash
# Terminal 1: Start infrastructure
docker compose up -d clickhouse vector

# Terminal 2: Run API natively
cd api
dotnet run --configuration Release --urls http://0.0.0.0:8080

# Terminal 3: Run frontend natively
cd web
npm run dev -- --host 0.0.0.0 --port 5173
\`\`\`

### Systemd Service Setup (Production)

Create `/etc/systemd/system/suricata-api.service`:

\`\`\`ini
[Unit]
Description=Suricata Alert API
After=network.target docker.service

[Service]
Type=simple
User=suricata
WorkingDirectory=/opt/suricata-monitoring/api
ExecStart=/usr/bin/dotnet /opt/suricata-monitoring/api/bin/Release/net8.0/api.dll
Restart=always
RestartSec=10
Environment="ASPNETCORE_URLS=http://0.0.0.0:8080"
Environment="ASPNETCORE_ENVIRONMENT=Production"

[Install]
WantedBy=multi-user.target
\`\`\`

Enable and start:
\`\`\`bash
sudo systemctl enable suricata-api
sudo systemctl start suricata-api
sudo systemctl status suricata-api
\`\`\`

---

## 🏗️ System Architecture

\`\`\`
┌─────────────────────────────────────────────────────────┐
│                     User Browser                         │
│                  (React Application)                     │
└───────────────┬─────────────────────────────────────────┘
                │ HTTPS/WSS
                │ Port 5173
┌───────────────▼─────────────────────────────────────────┐
│              Nginx Reverse Proxy                         │
│          (SSL Termination, Load Balancing)              │
└───────────────┬─────────────────────────────────────────┘
                │
        ┌───────┴────────┐
        │                │
┌───────▼────┐   ┌───────▼──────┐
│ API Server │   │ SignalR Hub  │
│ (REST)     │   │ (WebSocket)  │
│ Port 8080  │   │ Port 8080    │
└───────┬────┘   └───────┬──────┘
        │                │
        └───────┬────────┘
                │
        ┌───────▼────────┐
        │  ClickHouse DB │
        │  Port 9000     │
        │  (Storage)     │
        └───────▲────────┘
                │
        ┌───────┴────────┐
        │     Vector     │
        │  (Ingestion)   │
        └───────▲────────┘
                │
        ┌───────┴────────┐
        │    Suricata    │
        │  EVE JSON Log  │
        └────────────────┘
\`\`\`

### Component Responsibilities

| Component | Purpose | Technology |
|-----------|---------|------------|
| **React Frontend** | User interface, visualization | React 18, Vite, TailwindCSS |
| **API Server** | Business logic, authentication | ASP.NET Core 8, JWT |
| **SignalR Hub** | Real-time push notifications | SignalR WebSocket |
| **ClickHouse** | Alert storage, analytics | ClickHouse 24.8 |
| **Vector** | Log ingestion, transformation | Vector 0.38.0 |
| **Suricata** | Network monitoring, alert generation | IDS/Security Tools/IPS |

### Data Flow

1. **Alert Generation**: Suricata monitors network traffic and writes alerts to EVE JSON log
2. **Ingestion**: Vector tails the log file, parses JSON, transforms data
3. **Storage**: Vector inserts transformed alerts into ClickHouse database
4. **Detection**: Background service polls ClickHouse for new alerts (1s interval)
5. **Broadcast**: New alerts are pushed to all connected clients via SignalR
6. **Display**: React frontend receives and displays alerts in real-time

---

## 🔧 Troubleshooting

### Common Issues

#### Services Won't Start
\`\`\`bash
# Check Docker status
sudo systemctl status docker

# Check service logs
docker compose logs clickhouse
docker compose logs vector
docker compose logs alerts-api
docker compose logs alerts-web

# Restart services
docker compose restart
\`\`\`

#### ClickHouse Connection Errors
\`\`\`bash
# Test connection
docker exec ch-server clickhouse-client -u vector --password vector --query "SELECT 1"

# Check if database exists
docker exec ch-server clickhouse-client -u vector --password vector --query "SHOW DATABASES"

# Verify table schema
docker exec ch-server clickhouse-client -u vector --password vector --query "DESC observability.alerts"
\`\`\`

#### Vector Not Ingesting Data
\`\`\`bash
# Check Vector config
docker exec vector cat /etc/vector/vector.toml

# Test Vector manually
docker exec vector vector validate /etc/vector/vector.toml

# Check file permissions
ls -la /path/to/alerts-only.json

# View Vector logs
docker logs vector --tail=100 -f
\`\`\`

#### API Authentication Failures
\`\`\`bash
# Reset admin password
docker exec ch-server clickhouse-client -u vector --password vector --query "
ALTER TABLE observability.users 
UPDATE password_hash = '\\$2a\\$11\\$...' 
WHERE username = 'admin'"

# Check JWT configuration
docker exec alerts-api printenv | grep JWT
\`\`\`

#### Frontend Not Loading
\`\`\`bash
# Check web service
docker logs alerts-web

# Verify port binding
netstat -tulpn | grep 5173

# Test API connectivity from frontend
curl http://localhost:8080/api/stats -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

### Performance Optimization

#### Slow Query Performance
\`\`\`sql
-- Add indexes
ALTER TABLE observability.alerts ADD INDEX idx_ts ts TYPE minmax GRANULARITY 4;
ALTER TABLE observability.alerts ADD INDEX idx_level level TYPE set(100) GRANULARITY 1;

-- Optimize table
OPTIMIZE TABLE observability.alerts FINAL;
\`\`\`

#### High Memory Usage
\`\`\`bash
# Limit ClickHouse memory in docker-compose.yml
services:
  clickhouse:
    environment:
      - CLICKHOUSE_MAX_MEMORY_USAGE=8GB
\`\`\`

#### Slow Real-time Updates
- Decrease polling interval in `AlertMonitorService.cs` from 1000ms to 500ms
- Run API and frontend natively instead of Docker
- Upgrade to native ClickHouse instead of Docker
- Add Redis cache layer for recent alerts

---

## 🔐 Security Best Practices

### 1. Change Default Credentials
\`\`\`bash
# Change admin password immediately
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Use returned token to create new admin user, then disable default
\`\`\`

### 2. Use Strong JWT Secret
Edit `.env` file:
\`\`\`env
JWT_SECRET_KEY=$(openssl rand -base64 64)
\`\`\`

### 3. Enable HTTPS
\`\`\`bash
# Generate SSL certificate
sudo certbot certonly --standalone -d yourdomain.com

# Configure Nginx reverse proxy
sudo nano /etc/nginx/sites-available/suricata

# Add SSL configuration
server {
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:5173;
    }
    
    location /api {
        proxy_pass http://localhost:8080;
    }
}
\`\`\`

### 4. Firewall Configuration
\`\`\`bash
# Allow only necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow 80/tcp   # HTTP (for Let's Encrypt)
sudo ufw enable
\`\`\`

### 5. Role-Based Access Control

Create different user roles with appropriate permissions:
- **Admin**: Full access, user management, system configuration
- **Analyst**: View alerts, search, export, acknowledge
- **User**: View-only access to alerts

### 6. Regular Backups
\`\`\`bash
# Backup ClickHouse data
docker exec ch-server clickhouse-client -u vector --password vector --query "BACKUP TABLE observability.alerts TO Disk('default', 'backup.zip')"

# Backup using native tools
sudo rsync -avz /var/lib/docker/volumes/clickhouse_data /backup/clickhouse-$(date +%Y%m%d)
\`\`\`

### 7. Audit Logging
Enable audit logging for all API requests:
\`\`\`csharp
// In Program.cs
app.Use(async (context, next) =>
{
    var username = context.User.Identity?.Name ?? "anonymous";
    var endpoint = context.Request.Path;
    logger.LogInformation($"User {username} accessed {endpoint}");
    await next();
});
\`\`\`

---

## 📊 Monitoring & Maintenance

### Health Checks
\`\`\`bash
# Check all services
curl http://localhost:8080/health
curl http://localhost:8123/ping
docker ps --filter health=healthy

# View metrics
curl http://localhost:8080/metrics
\`\`\`

### Log Rotation
Configure logrotate:
\`\`\`bash
sudo nano /etc/logrotate.d/suricata-monitoring

/var/log/suricata-monitoring/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 suricata suricata
    sharedscripts
    postrotate
        systemctl reload suricata-api
    endscript
}
\`\`\`

### Database Maintenance
\`\`\`sql
-- Schedule regular optimization
CREATE MATERIALIZED VIEW observability.alerts_daily
ENGINE = SummingMergeTree()
ORDER BY (toDate(ts), level)
AS SELECT
    toDate(ts) as date,
    level,
    count(*) as alert_count
FROM observability.alerts
GROUP BY date, level;

-- Drop old partitions
ALTER TABLE observability.alerts DROP PARTITION '2024-10-01';
\`\`\`

---

## 📚 Additional Resources

- **Official Documentation**: https://docs.suricata-monitoring.com
- **API Reference**: http://localhost:8080/swagger
- **Community Forum**: https://community.suricata-monitoring.com
- **GitHub Issues**: https://github.com/your-org/suricata-monitoring/issues
- **Security Advisories**: https://security.suricata-monitoring.com

---

## 📝 License

This software is licensed under the MIT License. See LICENSE file for details.

---

## 🤝 Support

For enterprise support, contact: support@suricata-monitoring.com

For community support, visit: https://community.suricata-monitoring.com
