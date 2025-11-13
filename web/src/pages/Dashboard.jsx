import { useState, useEffect } from 'react';
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  Clock,
  TrendingUp,
  Server
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { dashboardAPI } from '../services/api';
import './Dashboard.css';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const response = await dashboardAPI.getStats();
      setStats(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load stats:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Security Dashboard</h1>
          <p>Real-time security monitoring and threat analysis</p>
        </div>
        <button className="refresh-button" onClick={loadStats}>
          <Activity size={18} />
          Refresh
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-primary">
          <div className="stat-icon">
            <Shield size={28} />
          </div>
          <div className="stat-content">
            <h3>Total Alerts</h3>
            <p className="stat-number">{stats?.totalAlerts?.toLocaleString() || 0}</p>
            <span className="stat-label">All time</span>
          </div>
        </div>

        <div className="stat-card stat-warning">
          <div className="stat-icon">
            <Clock size={28} />
          </div>
          <div className="stat-content">
            <h3>Last 24 Hours</h3>
            <p className="stat-number">{stats?.alertsLast24h?.toLocaleString() || 0}</p>
            <span className="stat-label">Recent activity</span>
          </div>
        </div>

        <div className="stat-card stat-danger">
          <div className="stat-icon">
            <AlertTriangle size={28} />
          </div>
          <div className="stat-content">
            <h3>Last Hour</h3>
            <p className="stat-number">{stats?.alertsLastHour?.toLocaleString() || 0}</p>
            <span className="stat-label">Active threats</span>
          </div>
        </div>

        <div className="stat-card stat-info">
          <div className="stat-icon">
            <TrendingUp size={28} />
          </div>
          <div className="stat-content">
            <h3>Critical Alerts</h3>
            <p className="stat-number">{stats?.criticalAlerts?.toLocaleString() || 0}</p>
            <span className="stat-label">High priority</span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card chart-card">
          <div className="card-header">
            <h2>Alert Activity (24h)</h2>
            <span className="card-badge">Real-time</span>
          </div>
          <div className="card-content">
            {stats?.alertsOverTime && stats.alertsOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.alertsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#64748b"
                    tickFormatter={(time) => new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  />
                  <YAxis stroke="#64748b" />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#1e293b', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    labelFormatter={(time) => new Date(time).toLocaleString()}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">
                <Server size={48} />
                <p>No data available yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h2>System Status</h2>
            <span className="status-dot status-active"></span>
          </div>
          <div className="card-content">
            <div className="status-list">
              <div className="status-item">
                <span className="status-label">ClickHouse Database</span>
                <span className="status-badge status-online">Online</span>
              </div>
              <div className="status-item">
                <span className="status-label">Vector Pipeline</span>
                <span className="status-badge status-online">Online</span>
              </div>
              <div className="status-item">
                <span className="status-label">API Server</span>
                <span className="status-badge status-online">Online</span>
              </div>
              <div className="status-item">
                <span className="status-label">WebSocket Hub</span>
                <span className="status-badge status-online">Online</span>
              </div>
              <div className="status-item">
                <span className="status-label">Alert Ingestion</span>
                <span className="status-badge status-online">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="card-header">
          <h2>Quick Actions</h2>
        </div>
        <div className="card-content">
          <div className="quick-actions">
            <a href="/alerts" className="action-button">
              <Shield size={20} />
              View All Alerts
            </a>
            <a href="/alerts?search=true" className="action-button">
              <Activity size={20} />
              Advanced Search
            </a>
            <button className="action-button" onClick={loadStats}>
              <TrendingUp size={20} />
              Refresh Stats
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
