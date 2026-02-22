import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../services/api';
import '../styles/Dashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getDashboardStats();
      // API returns { stats: { ... } } at top level
      setStats(response.data.stats || response.data.data || {});
    } catch (err) {
      setError('Failed to load dashboard stats');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <p>Manage the Felicity Event Management System</p>
      </div>

      <div className="dashboard-stats admin-stats">
        <div className="stat-card">
          <h3>{stats?.totalParticipants || 0}</h3>
          <p>Total Participants</p>
        </div>
        <div className="stat-card">
          <h3>{stats?.totalOrganizers || 0}</h3>
          <p>Organizers</p>
        </div>
        <div className="stat-card">
          <h3>{stats?.totalEvents || 0}</h3>
          <p>Total Events</p>
        </div>
        <div className="stat-card">
          <h3>{stats?.totalRegistrations || 0}</h3>
          <p>Total Registrations</p>
        </div>
      </div>

      <div className="dashboard-row">
        <div className="dashboard-section half">
          <div className="section-header">
            <h2>Events by Status</h2>
          </div>
          <div className="stats-breakdown">
            <div className="breakdown-item">
              <span className="breakdown-label">Published</span>
              <span className="breakdown-value success">{stats?.publishedEvents || 0}</span>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">Draft</span>
              <span className="breakdown-value warning">{stats?.draftEvents || 0}</span>
            </div>
          </div>
        </div>

        <div className="dashboard-section half">
          <div className="section-header">
            <h2>System Status</h2>
          </div>
          <div className="stats-breakdown">
            <div className="breakdown-item">
              <span className="breakdown-label">Active Organizers</span>
              <span className="breakdown-value success">{stats?.totalOrganizers || 0}</span>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">Pending Resets</span>
              <span className="breakdown-value warning">{stats?.pendingPasswordResets || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {stats?.pendingPasswordResets > 0 && (
        <div className="alert-banner warning">
          <span>⚠️ {stats.pendingPasswordResets} password reset request(s) pending</span>
          <Link to="/admin/password-resets" className="alert-link">
            Review →
          </Link>
        </div>
      )}

      <div className="dashboard-section">
        <div className="section-header">
          <h2>Management</h2>
        </div>
        
        <div className="quick-actions admin-actions">
          <Link to="/admin/organizers" className="action-card primary">
            <span className="action-icon">🏛️</span>
            <span>Manage Clubs/Organizers</span>
            <small>{stats?.totalOrganizers || 0} total</small>
          </Link>
          <Link to="/admin/password-resets" className="action-card">
            <span className="action-icon">🔐</span>
            <span>Password Resets</span>
            <small>{stats?.pendingPasswordResets || 0} pending</small>
          </Link>
          <Link to="/admin/participants" className="action-card">
            <span className="action-icon">👥</span>
            <span>View Participants</span>
            <small>{stats?.totalParticipants || 0} total</small>
          </Link>
          <Link to="/admin/events" className="action-card">
            <span className="action-icon">📋</span>
            <span>All Events</span>
            <small>{stats?.totalEvents || 0} total</small>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
