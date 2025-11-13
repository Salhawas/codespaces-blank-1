import { useState } from 'react';
import { User, Lock, Bell, Database, Shield, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Settings.css';

function Settings() {
  const { user } = useAuth();
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    role: user?.role || ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailAlerts: true,
    criticalOnly: false,
    dailySummary: true,
    weeklyReport: false
  });

  const [systemSettings, setSystemSettings] = useState({
    retentionDays: 90,
    maxAlertsPerPage: 20,
    autoRefresh: true,
    refreshInterval: 30,
    enableRealtime: true,
    theme: 'light'
  });

  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: 60,
    requireStrongPassword: true,
    enableTwoFactor: false,
    loginNotifications: true
  });

  const handleSaveProfile = () => {
    // TODO: Implement API call
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleChangePassword = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    // TODO: Implement API call
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleSaveNotifications = () => {
    // TODO: Implement API call
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleSaveSystem = () => {
    // TODO: Implement API call
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your account and system preferences</p>
      </div>

      {showSuccess && (
        <div className="success-message">
          <Shield size={20} />
          Settings saved successfully!
        </div>
      )}

      <div className="settings-container">
        <div className="settings-sidebar">
          <button
            className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={20} />
            Profile
          </button>
          <button
            className={`tab-button ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <Lock size={20} />
            Security
          </button>
          <button
            className={`tab-button ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <Bell size={20} />
            Notifications
          </button>
          <button
            className={`tab-button ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            <Database size={20} />
            System
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'profile' && (
            <div className="settings-section">
              <h2>Profile Information</h2>
              <p className="section-description">
                Update your account profile information
              </p>

              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={profileData.username}
                  onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                  disabled
                />
                <span className="help-text">Username cannot be changed</span>
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Role</label>
                <input
                  type="text"
                  value={profileData.role}
                  disabled
                />
                <span className="help-text">Contact administrator to change role</span>
              </div>

              <button className="save-button" onClick={handleSaveProfile}>
                <Save size={18} />
                Save Changes
              </button>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="settings-section">
              <h2>Security Settings</h2>
              <p className="section-description">
                Update your password and security preferences
              </p>

              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  placeholder="Enter current password"
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  placeholder="Enter new password"
                />
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  placeholder="Confirm new password"
                />
              </div>

              <button className="save-button" onClick={handleChangePassword}>
                <Save size={18} />
                Change Password
              </button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="settings-section">
              <h2>Notification Preferences</h2>
              <p className="section-description">
                Configure how you receive alerts and notifications
              </p>

              <div className="toggle-group">
                <div className="toggle-item">
                  <div>
                    <h3>Email Alerts</h3>
                    <p>Receive email notifications for new security alerts</p>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={notificationSettings.emailAlerts}
                      onChange={(e) => setNotificationSettings({...notificationSettings, emailAlerts: e.target.checked})}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="toggle-item">
                  <div>
                    <h3>Critical Alerts Only</h3>
                    <p>Only receive notifications for critical security events</p>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={notificationSettings.criticalOnly}
                      onChange={(e) => setNotificationSettings({...notificationSettings, criticalOnly: e.target.checked})}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="toggle-item">
                  <div>
                    <h3>Daily Summary</h3>
                    <p>Receive a daily summary of security alerts</p>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={notificationSettings.dailySummary}
                      onChange={(e) => setNotificationSettings({...notificationSettings, dailySummary: e.target.checked})}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="toggle-item">
                  <div>
                    <h3>Weekly Report</h3>
                    <p>Receive a detailed weekly security report</p>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={notificationSettings.weeklyReport}
                      onChange={(e) => setNotificationSettings({...notificationSettings, weeklyReport: e.target.checked})}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <button className="save-button" onClick={handleSaveNotifications}>
                <Save size={18} />
                Save Preferences
              </button>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="settings-section">
              <h2>System Configuration</h2>
              <p className="section-description">
                Configure system-wide settings and preferences
              </p>

              <div className="form-group">
                <label>Data Retention Period (Days)</label>
                <input
                  type="number"
                  value={systemSettings.retentionDays}
                  onChange={(e) => setSystemSettings({...systemSettings, retentionDays: parseInt(e.target.value)})}
                  min="7"
                  max="365"
                />
                <span className="help-text">Alerts older than this will be automatically deleted</span>
              </div>

              <div className="form-group">
                <label>Alerts Per Page</label>
                <select
                  value={systemSettings.maxAlertsPerPage}
                  onChange={(e) => setSystemSettings({...systemSettings, maxAlertsPerPage: parseInt(e.target.value)})}
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>

              <div className="toggle-group">
                <div className="toggle-item">
                  <div>
                    <h3>Auto Refresh</h3>
                    <p>Automatically refresh dashboard data</p>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={systemSettings.autoRefresh}
                      onChange={(e) => setSystemSettings({...systemSettings, autoRefresh: e.target.checked})}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              {systemSettings.autoRefresh && (
                <div className="form-group">
                  <label>Refresh Interval (Seconds)</label>
                  <input
                    type="number"
                    value={systemSettings.refreshInterval}
                    onChange={(e) => setSystemSettings({...systemSettings, refreshInterval: parseInt(e.target.value)})}
                    min="5"
                    max="300"
                  />
                </div>
              )}

              <button className="save-button" onClick={handleSaveSystem}>
                <Save size={18} />
                Save Configuration
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;
