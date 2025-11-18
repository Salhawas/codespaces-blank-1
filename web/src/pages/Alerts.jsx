import { useState, useEffect } from 'react';
import { Search, Filter, Download, Trash2, ChevronLeft, ChevronRight, Calendar, AlertCircle } from 'lucide-react';
import { alertsAPI } from '../services/api';
import * as signalR from '@microsoft/signalr';
import './Alerts.css';

function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAlerts, setSelectedAlerts] = useState(new Set());
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const [filters, setFilters] = useState({
    severity: '',
    startDate: '',
    endDate: '',
    sourceIp: '',
    destIp: ''
  });

  useEffect(() => {
    loadAlerts();
    
    // Setup SignalR connection for real-time updates
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:8080/alertsHub', {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
        accessTokenFactory: () => localStorage.getItem('token')
      })
      .withAutomaticReconnect()
      .build();

    connection.start()
      .then(() => console.log('✅ Connected to real-time alerts'))
      .catch(err => console.error('SignalR connection error:', err));

    connection.on('NewAlert', (alert) => {
      console.log('🚨 New alert received:', alert);
      setAlerts(prevAlerts => {
        // Check if alert already exists to prevent duplicates
        if (prevAlerts.some(a => a.id === alert.id)) {
          return prevAlerts;
        }
        // Add new alert at the top, limit to pageSize
        return [alert, ...prevAlerts].slice(0, pageSize);
      });
      setTotal(prevTotal => prevTotal + 1);
    });

    return () => {
      connection.stop();
    };
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [page]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const response = await alertsAPI.getAlerts({ limit: pageSize, offset: (page - 1) * pageSize });
      setAlerts(response.data);
      setTotal(response.data.length);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    setLoading(true);
    setPage(1);
    try {
      const searchParams = { query: searchQuery, ...filters, page: 1, pageSize };
      const response = await alertsAPI.searchAlerts(searchParams);
      setAlerts(response.data.data);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Search failed:', error);
    }
    setLoading(false);
  };

  const handleExport = async (format) => {
    try {
      const response = await alertsAPI.exportAlerts(format);
      const blob = new Blob([format === 'csv' ? response.data : JSON.stringify(response.data, null, 2)], {
        type: format === 'csv' ? 'text/csv' : 'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'alerts-export.' + format;
      a.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm('Delete ' + selectedAlerts.size + ' selected alerts?')) return;
    try {
      await alertsAPI.deleteAlerts({ ids: Array.from(selectedAlerts) });
      setSelectedAlerts(new Set());
      loadAlerts();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const toggleSelectAlert = (id) => {
    const newSelected = new Set(selectedAlerts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedAlerts(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedAlerts.size === alerts.length) {
      setSelectedAlerts(new Set());
    } else {
      setSelectedAlerts(new Set(alerts.map(a => a.id)));
    }
  };

  const applyFilters = async () => {
    setLoading(true);
    setPage(1);
    try {
      let filteredAlerts = alerts;
      
      // Apply severity filter
      if (filters.severity) {
        filteredAlerts = filteredAlerts.filter(a => 
          a.level?.toUpperCase() === filters.severity.toUpperCase()
        );
      }
      
      // Apply date filters
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        filteredAlerts = filteredAlerts.filter(a => new Date(a.ts) >= startDate);
      }
      
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        filteredAlerts = filteredAlerts.filter(a => new Date(a.ts) <= endDate);
      }
      
      setAlerts(filteredAlerts);
      setTotal(filteredAlerts.length);
    } catch (error) {
      console.error('Filter failed:', error);
    }
    setLoading(false);
  };

  const clearFilters = () => {
    setFilters({
      severity: '',
      startDate: '',
      endDate: '',
      sourceIp: '',
      destIp: ''
    });
    loadAlerts();
  };

  const getSeverityClass = (message) => {
    const lower = message.toLowerCase();
    if (lower.includes('critical')) return 'critical';
    if (lower.includes('scan') || lower.includes('attack')) return 'high';
    if (lower.includes('suspicious')) return 'medium';
    return 'info';
  };

  const parsePayload = (payloadStr) => {
    try {
      return JSON.parse(payloadStr);
    } catch {
      return null;
    }
  };

  if (loading && alerts.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading alerts...</p>
      </div>
    );
  }

  return (
    <div className="alerts-page">
      <div className="alerts-header">
        <div>
          <h1>Security Alerts</h1>
          <p>Monitor and manage security threats in real-time</p>
        </div>
        <div className="header-actions">
          <button className="action-btn" onClick={() => handleExport('json')}>
            <Download size={18} />
            Export JSON
          </button>
          <button className="action-btn" onClick={() => handleExport('csv')}>
            <Download size={18} />
            Export CSV
          </button>
          {selectedAlerts.size > 0 && (
            <button className="action-btn danger" onClick={handleDeleteSelected}>
              <Trash2 size={18} />
              Delete ({selectedAlerts.size})
            </button>
          )}
        </div>
      </div>

      <div className="search-section">
        <div className="search-bar">
          <Search size={20} />
          <input type="text" placeholder="Search alerts by message, IP address, or payload..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSearch()} />
          <button onClick={handleSearch}>Search</button>
        </div>
        <button className={'filter-toggle ' + (showFilters ? 'active' : '')} onClick={() => setShowFilters(!showFilters)}>
          <Filter size={18} />
          Filters
        </button>
      </div>

      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <label>Severity</label>
            <select value={filters.severity} onChange={(e) => setFilters({...filters, severity: e.target.value})}>
              <option value="">All Levels</option>
              <option value="INFO">Info</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Start Date</label>
            <input type="datetime-local" value={filters.startDate} onChange={(e) => setFilters({...filters, startDate: e.target.value})} />
          </div>
          <div className="filter-group">
            <label>End Date</label>
            <input type="datetime-local" value={filters.endDate} onChange={(e) => setFilters({...filters, endDate: e.target.value})} />
          </div>
          <div className="filter-actions">
            <button className="action-btn" onClick={applyFilters}>Apply Filters</button>
            <button className="action-btn" onClick={clearFilters}>Clear</button>
          </div>
        </div>
      )}

      <div className="alerts-container">
        {alerts.length === 0 ? (
          <div className="no-alerts">
            <AlertCircle size={48} />
            <p>No alerts found</p>
          </div>
        ) : (
          <>
            <div className="alerts-table">
              <div className="table-header">
                <div className="col-check">
                  <input 
                    type="checkbox" 
                    checked={alerts.length > 0 && selectedAlerts.size === alerts.length}
                    onChange={toggleSelectAll}
                    title="Select All"
                  />
                </div>
                <div className="col-time">Timestamp</div>
                <div className="col-severity">Severity</div>
                <div className="col-message">Message</div>
                <div className="col-details">Details</div>
              </div>
              {alerts.map((alert) => {
                const payload = parsePayload(alert.payload);
                const severityClass = getSeverityClass(alert.message);
                return (
                  <div key={alert.id} className={'alert-row ' + severityClass}>
                    <div className="col-check">
                      <input type="checkbox" checked={selectedAlerts.has(alert.id)} onChange={() => toggleSelectAlert(alert.id)} />
                    </div>
                    <div className="col-time">
                      <Calendar size={14} />
                      {new Date(alert.ts).toLocaleString()}
                    </div>
                    <div className="col-severity">
                      <span className={'severity-badge ' + severityClass}>
                        {alert.level}
                      </span>
                    </div>
                    <div className="col-message">{alert.message}</div>
                    <div className="col-details">
                      {payload && (
                        <div className="alert-details-inline">
                          <span>{payload.src_ip || 'N/A'}</span>
                          <span>→</span>
                          <span>{payload.dest_ip || 'N/A'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="pagination">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft size={18} />
                Previous
              </button>
              <span>Page {page}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={alerts.length < pageSize}>
                Next
                <ChevronRight size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Alerts;
