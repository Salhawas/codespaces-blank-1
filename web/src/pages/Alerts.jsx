import { useEffect, useState } from 'react';
import { Search, Filter, Download, Trash2, ChevronLeft, ChevronRight, Calendar, AlertCircle } from 'lucide-react';
import { alertsAPI } from '../services/api';
import * as signalR from '@microsoft/signalr';
import './Alerts.css';

const filterTemplate = {
  severity: '',
  startDate: '',
  endDate: '',
  sourceIp: '',
  destIp: ''
};

function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAlerts, setSelectedAlerts] = useState(new Set());
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const [filters, setFilters] = useState(() => ({ ...filterTemplate }));
  const [appliedFilters, setAppliedFilters] = useState(() => ({ ...filterTemplate }));
  const [viewMode, setViewMode] = useState('browse');
  const [searchConfig, setSearchConfig] = useState(null);
  const toAlertList = (value) => (Array.isArray(value) ? value : []);
  const [selectedAlert, setSelectedAlert] = useState(null);

  const fetchAlerts = async (pageToLoad = 1, filtersToUse = appliedFilters) => {
    setLoading(true);
    try {
      const params = {
        limit: pageSize,
        offset: (pageToLoad - 1) * pageSize
      };

      if (filtersToUse.severity) params.severity = filtersToUse.severity;
      if (filtersToUse.startDate) params.since = new Date(filtersToUse.startDate).toISOString();
      if (filtersToUse.endDate) params.until = new Date(filtersToUse.endDate).toISOString();
      if (filtersToUse.sourceIp) params.sourceIp = filtersToUse.sourceIp;
      if (filtersToUse.destIp) params.destIp = filtersToUse.destIp;

      const response = await alertsAPI.getAlerts(params);
      const { data, total: totalCount } = response.data ?? {};
      const normalized = toAlertList(data);
      setAlerts(normalized);
      setTotal(Number.isFinite(totalCount) ? totalCount : normalized.length);
      setSelectedAlerts(new Set());
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSearchResults = async (pageToLoad = 1, params = searchConfig) => {
    if (!params) {
      return;
    }

    setLoading(true);
    try {
      const payload = {
        query: params.query || '',
        page: pageToLoad,
        pageSize
      };

      if (params.startDate) payload.startDate = new Date(params.startDate).toISOString();
      if (params.endDate) payload.endDate = new Date(params.endDate).toISOString();
      if (params.severity) payload.severity = params.severity;
      if (params.sourceIp) payload.sourceIp = params.sourceIp;
      if (params.destIp) payload.destIp = params.destIp;

      const response = await alertsAPI.searchAlerts(payload);
      const body = response.data ?? {};
      const normalized = toAlertList(body.data);
      setAlerts(normalized);
      setTotal(Number.isFinite(body.total) ? body.total : normalized.length);
      setSelectedAlerts(new Set());
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts(1, appliedFilters);

    const connection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:8080/alertsHub', {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
        accessTokenFactory: () => localStorage.getItem('token')
      })
      .withAutomaticReconnect()
      .build();

    connection
      .start()
      .then(() => console.log('✅ Connected to real-time alerts'))
      .catch(err => console.error('SignalR connection error:', err));

    connection.on('NewAlert', (alert) => {
      console.log('🚨 New alert received:', alert);
      setAlerts(prevAlerts => {
        const current = Array.isArray(prevAlerts) ? prevAlerts : [];
        if (current.some(existing => existing.id === alert.id)) {
          return current;
        }
        return [alert, ...current].slice(0, pageSize);
      });
      setTotal(prevTotal => prevTotal + 1);
    });

    return () => {
      connection.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToPage = async (targetPage) => {
    if (targetPage < 1) {
      return;
    }

    setPage(targetPage);
    if (viewMode === 'search' && searchConfig) {
      await fetchSearchResults(targetPage, searchConfig);
    } else {
      await fetchAlerts(targetPage, appliedFilters);
    }
  };

  const handleSearch = async () => {
    const trimmedQuery = searchQuery.trim();
    const params = {
      query: trimmedQuery,
      severity: filters.severity,
      startDate: filters.startDate,
      endDate: filters.endDate,
      sourceIp: filters.sourceIp,
      destIp: filters.destIp
    };

    if (!trimmedQuery && !params.severity && !params.startDate && !params.endDate && !params.sourceIp && !params.destIp) {
      setSearchConfig(null);
      setViewMode('browse');
      setPage(1);
      await fetchAlerts(1, filters);
      return;
    }

    setSearchConfig(params);
    setViewMode('search');
    setPage(1);
    await fetchSearchResults(1, params);
  };

  const handleExport = async (format) => {
    try {
      const response = await alertsAPI.exportAlerts(format);
      const blob = new Blob([format === 'csv' ? response.data : JSON.stringify(response.data, null, 2)], {
        type: format === 'csv' ? 'text/csv' : 'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'alerts-export.' + format;
      anchor.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm('Delete ' + selectedAlerts.size + ' selected alerts?')) {
      return;
    }

    try {
      await alertsAPI.deleteAlerts({ ids: Array.from(selectedAlerts) });
      setSelectedAlerts(new Set());
      if (viewMode === 'search' && searchConfig) {
        await fetchSearchResults(page, searchConfig);
      } else {
        await fetchAlerts(page, appliedFilters);
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const toggleSelectAlert = (id) => {
    const updated = new Set(selectedAlerts);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedAlerts(updated);
  };

  const toggleSelectAll = () => {
    if (selectedAlerts.size === alerts.length) {
      setSelectedAlerts(new Set());
    } else {
      setSelectedAlerts(new Set(alerts.map(a => a.id)));
    }
  };

  const applyFilters = async () => {
    const nextFilters = { ...filters };
    setAppliedFilters(nextFilters);
    setSearchConfig(null);
    setViewMode('browse');
    setPage(1);
    await fetchAlerts(1, nextFilters);
  };

  const clearFilters = async () => {
    const reset = { ...filterTemplate };
    setFilters(reset);
    setAppliedFilters(reset);
    setSearchConfig(null);
    setViewMode('browse');
    setSearchQuery('');
    setPage(1);
    await fetchAlerts(1, reset);
  };

  const getSeverityClass = (level) => {
    const normalized = (level || '').toUpperCase();
    if (normalized === 'CRITICAL') return 'critical';
    if (normalized === 'HIGH') return 'high';
    if (normalized === 'MEDIUM') return 'medium';
    if (normalized === 'LOW') return 'low';
    return 'info';
  };

  const parsePayload = (payloadStr) => {
    try {
      const parsed = JSON.parse(payloadStr);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const nextDisabled = page >= totalPages;

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
          <input
            type="text"
            placeholder="Search alerts by message, IP address, or payload..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch}>Search</button>
        </div>
        <button
          className={'filter-toggle ' + (showFilters ? 'active' : '')}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={18} />
          Filters
        </button>
      </div>

      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <label>Severity</label>
            <select
              value={filters.severity}
              onChange={(event) => setFilters({ ...filters, severity: event.target.value })}
            >
              <option value="">All Levels</option>
              <option value="INFO">Info</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Start Date</label>
            <input
              type="datetime-local"
              value={filters.startDate}
              onChange={(event) => setFilters({ ...filters, startDate: event.target.value })}
            />
          </div>
          <div className="filter-group">
            <label>End Date</label>
            <input
              type="datetime-local"
              value={filters.endDate}
              onChange={(event) => setFilters({ ...filters, endDate: event.target.value })}
            />
          </div>
          <div className="filter-group">
            <label>Source IP</label>
            <input
              type="text"
              value={filters.sourceIp}
              onChange={(event) => setFilters({ ...filters, sourceIp: event.target.value })}
              placeholder="e.g. 10.0.0.5"
            />
          </div>
          <div className="filter-group">
            <label>Destination IP</label>
            <input
              type="text"
              value={filters.destIp}
              onChange={(event) => setFilters({ ...filters, destIp: event.target.value })}
              placeholder="e.g. 10.0.0.10"
            />
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
                <div className="col-id">ID</div>
                <div className="col-ip">Source IP</div>
                <div className="col-ip">Destination IP</div>
                <div className="col-proto">Protocol</div>
                <div className="col-description">Description</div>
                <div className="col-rule">Rule ID</div>
                <div className="col-action">Action</div>
              </div>
              {alerts.map((alert, idx) => {
                const payload = parsePayload(alert.payload);
                const severityClass = getSeverityClass(alert.level);
                const srcIp = payload?.src_ip ?? 'N/A';
                const destIp = payload?.dest_ip ?? 'N/A';
                const protocol = payload?.proto ?? payload?.protocol ?? 'N/A';
                const description = payload?.alert?.signature ?? alert.message ?? 'N/A';
                const ruleId = payload?.alert?.signature_id ?? 'N/A';
                const action = payload?.alert?.action ?? 'N/A';
                const displayIndex = alert.index ?? (page - 1) * pageSize + idx + 1;
                return (
                  <div
                    key={alert.id}
                    className={'alert-row ' + severityClass}
                    onClick={() => setSelectedAlert({ ...alert, payloadParsed: payload, displayIndex })}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="col-check" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedAlerts.has(alert.id)}
                        onChange={() => toggleSelectAlert(alert.id)}
                      />
                    </div>
                    <div className="col-time">
                      <Calendar size={14} />
                      {new Date(alert.ts).toLocaleString()}
                    </div>
                    <div className="col-severity">
                      <span className={'severity-badge ' + severityClass}>
                        {alert.level || 'INFO'}
                      </span>
                    </div>
                    <div className="col-id" title={alert.id}>{displayIndex}</div>
                    <div className="col-ip">{srcIp}</div>
                    <div className="col-ip">{destIp}</div>
                    <div className="col-proto">{protocol}</div>
                    <div className="col-description">{description}</div>
                    <div className="col-rule">{ruleId}</div>
                    <div className="col-action">{action}</div>
                  </div>
                );
              })}
            </div>
            <div className="pagination">
              <button onClick={() => goToPage(page - 1)} disabled={page === 1}>
                <ChevronLeft size={18} />
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button onClick={() => goToPage(page + 1)} disabled={nextDisabled}>
                Next
                <ChevronRight size={18} />
              </button>
            </div>
          </>
        )}
      </div>
      {selectedAlert && (
        <div className="modal-backdrop" onClick={() => setSelectedAlert(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
              <div>
                <p className="modal-kicker">Alert #{selectedAlert.displayIndex}</p>
                <h2>{selectedAlert.payloadParsed?.alert?.signature ?? selectedAlert.message ?? 'Alert details'}</h2>
                <p className="modal-sub">{new Date(selectedAlert.ts).toLocaleString()}</p>
              </div>
              <button className="modal-close" onClick={() => setSelectedAlert(null)}>×</button>
            </div>
            <div className="modal-grid">
              <div>
                <p className="label">Severity</p>
                <span className={'severity-badge ' + getSeverityClass(selectedAlert.level)}>
                  {selectedAlert.level || 'INFO'}
                </span>
              </div>
              <div>
                <p className="label">Action</p>
                <p className="value">{selectedAlert.payloadParsed?.alert?.action ?? 'N/A'}</p>
              </div>
              <div>
                <p className="label">Rule ID</p>
                <p className="value">{selectedAlert.payloadParsed?.alert?.signature_id ?? 'N/A'}</p>
              </div>
              <div>
                <p className="label">Category</p>
                <p className="value">{selectedAlert.payloadParsed?.alert?.category ?? 'N/A'}</p>
              </div>
              <div>
                <p className="label">Source</p>
                <p className="value">{selectedAlert.payloadParsed?.src_ip ?? 'N/A'}:{selectedAlert.payloadParsed?.src_port ?? '—'}</p>
              </div>
              <div>
                <p className="label">Destination</p>
                <p className="value">{selectedAlert.payloadParsed?.dest_ip ?? 'N/A'}:{selectedAlert.payloadParsed?.dest_port ?? '—'}</p>
              </div>
              <div>
                <p className="label">Protocol</p>
                <p className="value">{selectedAlert.payloadParsed?.proto ?? selectedAlert.payloadParsed?.protocol ?? 'N/A'}</p>
              </div>
              <div>
                <p className="label">Flow ID</p>
                <p className="value">{selectedAlert.payloadParsed?.flow_id ?? selectedAlert.id}</p>
              </div>
            </div>
            <div className="modal-json">
              <p className="label">Raw payload</p>
              <pre>{JSON.stringify(selectedAlert.payloadParsed ?? selectedAlert.payload, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Alerts;

