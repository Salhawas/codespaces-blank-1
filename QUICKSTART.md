# � Quick Start Guide

## Start the System

```bash
# Start all services
docker compose up -d

# Check status (all should show "Up")
docker compose ps
```

## Access the System

| Service | URL | Credentials |
|---------|-----|-------------|
| **Web UI** | http://localhost:5173 | admin / admin123 |
| **API Swagger** | http://localhost:8080/swagger | - |
| **ClickHouse** | http://localhost:8123 | - |

## Main Features

### 1. Dashboard (`/dashboard`)
- View real-time alert statistics
- See 24-hour trend chart
- Monitor system health
- Auto-refreshes every 30 seconds

### 2. Alerts (`/alerts`)
- Search alerts by text, IP, dates, severity
- Select multiple alerts (checkboxes)
- Bulk delete (Admin/Analyst only)
- Export to JSON or CSV
- 20 alerts per page (configurable)

### 3. Settings (`/settings`)
- Update profile and email
- Change password
- Configure notifications
- Set data retention period

## Common Commands

### View Logs
```bash
# API logs
docker logs alerts-api -f

# Web logs
docker logs alerts-web -f

# Vector ingestion
docker logs vector-ingest -f

# ClickHouse
docker logs ch-server -f
```

### Manage Services
```bash
# Restart a service
docker compose restart api
docker compose restart web

# Rebuild after code changes
docker compose up -d --build web
docker compose up -d --build api

# Stop all services
docker compose down

# Stop and remove all data
docker compose down -v
```

### Database Queries
```bash
# Count total alerts
docker exec ch-server clickhouse-client -q "SELECT count() FROM observability.alerts"

# View recent alerts
docker exec ch-server clickhouse-client -q "SELECT ts, level, message FROM observability.alerts ORDER BY ts DESC LIMIT 10"

# Count by severity
docker exec ch-server clickhouse-client -q "SELECT level, count() FROM observability.alerts GROUP BY level"
```

## Troubleshooting

### Issue: Cannot login
```bash
# Check API is running
docker logs alerts-api --tail=20

# Verify default user exists
docker exec ch-server clickhouse-client -q "SELECT username, role FROM observability.users"

# Clear browser localStorage and try again
localStorage.clear()
```

### Issue: Alerts not showing
```bash
# Check alert count in database
docker exec ch-server clickhouse-client -q "SELECT count() FROM observability.alerts"

# Check Vector is ingesting
docker logs vector-ingest --tail=20

# Restart API to reload data
docker compose restart api
```

### Issue: 401 Unauthorized errors
```bash
# Token expired - login again
# JWT tokens expire after 24 hours

# Check API authentication logs
docker logs alerts-api | grep "401"
```

### Issue: Web build errors
```bash
# Rebuild without cache
docker compose build --no-cache web
docker compose up -d web

# Check logs for errors
docker logs alerts-web --tail=50
```

## API Endpoints

### Authentication
```bash
# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Register new user (Admin only)
curl -X POST http://localhost:8080/api/auth/register \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"analyst","email":"analyst@example.com","password":"password123","role":"Analyst"}'
```

### Alerts
```bash
# Get alerts (paginated)
curl http://localhost:8080/api/alerts?limit=20&offset=0 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search alerts
curl -X POST http://localhost:8080/api/alerts/search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"scan","severity":"CRITICAL","page":1,"pageSize":20}'

# Export alerts
curl http://localhost:8080/api/alerts/export?format=json \
  -H "Authorization: Bearer YOUR_TOKEN" > alerts.json
```

### Dashboard
```bash
# Get statistics
curl http://localhost:8080/api/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access: create users, delete alerts, all features |
| **Analyst** | Can delete alerts, full read access |
| **User** | Read-only: view alerts, dashboard, export |

## Configuration

### Change Admin Password
1. Login as admin
2. Go to Settings → Security
3. Enter current password: `admin123`
4. Enter new password (min 6 characters)
5. Click "Change Password"

### Adjust Auto-Refresh Interval
1. Go to Settings → System
2. Toggle "Auto Refresh"
3. Set refresh interval (5-300 seconds)
4. Click "Save Configuration"

### Configure Data Retention
1. Go to Settings → System
2. Set "Data Retention Period" (7-365 days)
3. Click "Save Configuration"
4. Old alerts will be automatically purged

## Performance Tips

### For Development (Current Setup)
- All services in Docker
- Good for testing and demos
- ~500ms update latency

### For Production (Recommended)
```bash
# Keep database in Docker
docker compose up -d clickhouse vector

# Run API natively (faster)
cd api
dotnet run --configuration Release

# Run Web natively (faster HMR)
cd web
npm run dev
```

## Testing Real-Time Updates

```bash
# Add a test alert
echo '{"id":"test1","timestamp":"2025-11-12T12:00:00Z","level":"CRITICAL","message":"Test alert from command line"}' >> alerts-only.json

# Watch it appear in the dashboard within 1-2 seconds!
```

## Next Steps

1. ✅ Login with default credentials
2. ✅ Explore the dashboard
3. ✅ Search and filter alerts
4. ✅ Try bulk operations
5. ✅ Export data to JSON/CSV
6. ✅ Change admin password
7. ✅ Configure preferences in Settings
8. 📚 Read INSTALLATION.md for production deployment

## Getting Help

- **Full Docs**: See README.md
- **Installation Guide**: See INSTALLATION.md  
- **System Architecture**: See SYSTEM_STATUS.md
- **Feature List**: See BUILD_COMPLETE.md

---

**Happy monitoring!** 🛡️
- Lucide React icons
- Recharts visualization

## 📦 Services

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| Web UI | `alerts-web` | 5173 | React frontend |
| API | `alerts-api` | 8080 | .NET backend |
| Database | `ch-server` | 9000, 8123 | ClickHouse |
| Ingestion | `vector-ingest` | - | Log pipeline |

## 🛠️ Common Commands

```bash
# View API logs
docker logs alerts-api -f

# View Web logs
docker logs alerts-web -f

# Restart a service
docker compose restart api

# Rebuild after code changes
docker compose up -d --build web

# Stop all services
docker compose down

# Stop and remove data
docker compose down -v
```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/login` - Login with JWT
- `POST /api/auth/register` - Register new user (Admin only)

### Dashboard
- `GET /api/stats` - Get statistics and time-series data

### Alerts
- `GET /api/alerts?limit=20&offset=0` - Get alerts (paginated)
- `POST /api/alerts/search` - Advanced search with filters
- `POST /api/alerts/delete` - Bulk delete (Admin/Analyst only)
- `GET /api/alerts/export?format=json` - Export alerts

### Real-time
- `WS /alertsHub` - SignalR WebSocket for live updates

## 🔐 Security Features

- JWT tokens with 24-hour expiration
- BCrypt password hashing
- Role-based authorization
- Protected API endpoints
- Auto-logout on session expiration

## 🎨 UI Features

- **Modern Design**: Gradient backgrounds, glassmorphism, shadows
- **Responsive**: Works on desktop, tablet, and mobile
- **Animations**: Slide-in, fade-in, hover effects
- **Dark Sidebar**: Professional navigation with collapsible menu
- **Loading States**: Spinners and progress indicators
- **Error Handling**: User-friendly messages

## 📖 Documentation

- **INSTALLATION.md**: Complete offline Ubuntu installation guide
- **SYSTEM_STATUS.md**: System architecture and technical details

## 🔍 Troubleshooting

### API returns 401
```bash
# Clear localStorage and login again
localStorage.clear()
```

### Alerts not updating
```bash
# Check Vector is running
docker logs vector-ingest

# Check API background service
docker logs alerts-api | grep "New alerts"
```

### Frontend build errors
```bash
# Rebuild without cache
docker compose build --no-cache web
docker compose up -d web
```

## 📊 Performance

- **ClickHouse**: Columnar database for fast analytics
- **SignalR**: WebSocket for low-latency real-time updates
- **Background Service**: Polls for new alerts every 1 second
- **Auto-refresh**: Configurable dashboard refresh (default 30s)

## 🚨 Current Alert Count

Query database directly:
```bash
docker exec ch-server clickhouse-client -q "SELECT count() FROM observability.alerts"
```

## 👥 User Roles

- **Admin**: Full access (create users, delete alerts, all features)
- **Analyst**: Can delete alerts, full read access
- **User**: Read-only access to alerts and dashboard

## 📝 Default Data

- **Admin User**: `admin` / `admin123` (created automatically on startup)
- **Sample Alerts**: Ingested from Vector pipeline

## 🔄 Data Flow

### Alert Data Flow

1. IDS/Security tools write logs
2. Vector reads and parses JSON
3. Vector sends to ClickHouse via HTTP
4. API polls ClickHouse every 1 second
5. New alerts broadcast via SignalR to all connected clients
6. React UI updates in real-time

## 🎯 Next Steps

1. Login with default credentials
2. Explore the dashboard
3. View alerts with filtering
4. Try advanced search
5. Change admin password in settings
6. Configure notification preferences
7. Adjust data retention period

## 💡 Tips

- Use keyboard shortcut **Enter** to search
- Click severity badges to filter by level
- Use date pickers for time-range queries
- Export alerts before bulk delete
- Enable auto-refresh for monitoring

---

**Built for enterprise security teams** 🛡️
