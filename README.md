# Better than Cisco - Security Alert Monitoring System

A professional-grade, real-time security alert monitoring system with JWT authentication, role-based access control, and modern React UI.

## 🚀 Quick Start

```bash
# Start all services
docker compose up -d

# Access the web interface
open http://localhost:5173

# Login with default credentials
Username: admin
Password: admin123
```

## ✨ Features

- **JWT Authentication** with role-based access (Admin/Analyst/User)
- **Real-time Dashboard** with live statistics and 24-hour trends
- **Advanced Alert Management** with search, filtering, bulk delete, export
- **Professional UI** with modern design, gradients, and animations
- **WebSocket Updates** via SignalR for instant alert notifications
- **Comprehensive API** with Swagger documentation

## 📊 Architecture

```
IDS/Logs → Vector → ClickHouse ← .NET API ← React Frontend
                          ↓              ↓
                    (Storage)    (JWT Auth + SignalR)
```

## 🔗 Access Points

- **Web UI**: http://localhost:5173
- **API Documentation**: http://localhost:8080/swagger
- **REST API**: http://localhost:8080/api
- **ClickHouse**: http://localhost:8123

## 📦 Services

| Service | Port | Purpose |
|---------|------|---------|
| React Web | 5173 | Frontend interface |
| .NET API | 8080 | Backend + authentication |
| ClickHouse | 9000, 8123 | Database |
| Vector | - | Log ingestion |

## 🎯 Main Pages

1. **Login** - JWT authentication
2. **Dashboard** - Statistics and 24h trend charts
3. **Alerts** - Search, filter, bulk operations, export
4. **Settings** - Profile, security, notifications

## 🔐 Default Credentials

**Username**: `admin`  
**Password**: `admin123`

⚠️ **Change immediately in production!**

## 📚 Documentation

- **QUICKSTART.md** - Quick reference guide
- **INSTALLATION.md** - Complete offline installation for Ubuntu
- **BUILD_COMPLETE.md** - Full feature documentation

## 🛠️ Common Commands

```bash
# View logs
docker logs alerts-api -f
docker logs alerts-web -f

# Restart services
docker compose restart web api

# Rebuild after changes
docker compose up -d --build

# Stop all services
docker compose down
```

## 🔧 Technology Stack

**Backend**: .NET Core 8.0, JWT Auth, BCrypt, SignalR, ClickHouse  
**Frontend**: React 18, Vite, React Router, Axios, Recharts  
**Database**: ClickHouse 24.8 (columnar OLAP)  
**Ingestion**: Vector 0.38.0

## 🎨 Key Features

- Multi-page React application with routing
- JWT authentication with 24-hour sessions
- Role-based permissions (Admin/Analyst/User)
- Real-time WebSocket updates
- Advanced search (text, dates, IPs, severity)
- Bulk delete operations with authorization
- Export to JSON/CSV formats
- Auto-refresh dashboard (30s interval)
- Responsive design (desktop/tablet/mobile)

## 📈 Current Status

- ✅ All services running
- ✅ 209+ alerts in database
- ✅ Authentication system operational
- ✅ Real-time updates working
- ✅ Documentation complete

## 🔒 Security

- JWT tokens with HS256 signing
- BCrypt password hashing
- Role-based authorization
- Protected API endpoints
- CORS configured for localhost

## 🎓 Production Deployment

See **INSTALLATION.md** for:
- System requirements
- Offline installation guide
- Security hardening
- Performance tuning
- Monitoring setup

---

**Built for enterprise security teams** 🛡️
