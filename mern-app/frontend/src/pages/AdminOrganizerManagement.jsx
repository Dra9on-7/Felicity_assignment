import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { EVENT_CATEGORIES } from '../utils/constants';
import '../styles/Dashboard.css';

const AdminOrganizerManagement = () => {
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [newOrganizer, setNewOrganizer] = useState({
    email: '',
    password: '',
    organizerName: '',
    clubName: '',
    councilName: '',
    category: '',
    contactEmail: '',
    description: ''
  });

  const categories = EVENT_CATEGORIES;

  useEffect(() => {
    fetchOrganizers();
  }, []);

  const fetchOrganizers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getOrganizers();
      setOrganizers(response.data.data || []);
    } catch (err) {
      console.error('Error fetching organizers:', err);
      setError('Failed to load organizers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganizer = async (e) => {
    e.preventDefault();
    
    if (!newOrganizer.email || !newOrganizer.password) {
      setMessage({ type: 'error', text: 'Email and password are required' });
      return;
    }

    if (!newOrganizer.organizerName && !newOrganizer.clubName) {
      setMessage({ type: 'error', text: 'Organizer name or club name is required' });
      return;
    }

    try {
      await adminAPI.createOrganizer(newOrganizer);
      setMessage({ type: 'success', text: 'Organizer created successfully!' });
      setShowCreateModal(false);
      setNewOrganizer({
        email: '',
        password: '',
        organizerName: '',
        clubName: '',
        councilName: '',
        category: '',
        contactEmail: '',
        description: ''
      });
      fetchOrganizers();
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to create organizer' 
      });
    }
  };

  const handleToggleStatus = async (organizerId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    
    if (!confirm(`Are you sure you want to ${newStatus === 'active' ? 'enable' : 'disable'} this organizer?`)) {
      return;
    }

    try {
      await adminAPI.updateOrganizerStatus(organizerId, newStatus);
      setOrganizers(prev => 
        prev.map(org => 
          org._id === organizerId ? { ...org, status: newStatus } : org
        )
      );
      setMessage({ type: 'success', text: `Organizer ${newStatus === 'active' ? 'enabled' : 'disabled'}` });
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to update organizer status' 
      });
    }
  };

  const handleDeleteOrganizer = async (organizerId, organizerName) => {
    if (!confirm(`Are you sure you want to delete "${organizerName}"? This action cannot be undone and will affect all their events.`)) {
      return;
    }

    try {
      await adminAPI.deleteOrganizer(organizerId);
      setOrganizers(prev => prev.filter(org => org._id !== organizerId));
      setMessage({ type: 'success', text: 'Organizer deleted successfully' });
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to delete organizer' 
      });
    }
  };

  const handleResetPassword = async (organizerId, organizerEmail) => {
    const newPassword = prompt(`Enter new password for ${organizerEmail}:`);
    
    if (!newPassword) return;

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    try {
      await adminAPI.resetOrganizerPassword(organizerId, newPassword);
      setMessage({ type: 'success', text: 'Password reset successfully' });
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to reset password' 
      });
    }
  };

  const filteredOrganizers = organizers.filter(org => {
    const name = org.organizerName || org.clubName || org.councilName || org.email || '';
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
      (org.status || (org.isActive ? 'active' : 'disabled')) === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="admin-organizers-container">
        <div className="loading">Loading organizers...</div>
      </div>
    );
  }

  return (
    <div className="admin-organizers-container">
      <div className="page-header">
        <div className="header-content">
          <h1>Organizer Management</h1>
          <p>Create, manage, and monitor organizer accounts</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + Create Organizer
        </button>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })}>✕</button>
        </div>
      )}

      <div className="filters-bar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search organizers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="status-filter">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-value">{organizers.length}</span>
          <span className="stat-label">Total Organizers</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{organizers.filter(o => (o.status || (o.isActive !== false ? 'active' : 'disabled')) === 'active').length}</span>
          <span className="stat-label">Active</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{organizers.filter(o => (o.status || (o.isActive !== false ? 'active' : 'disabled')) === 'disabled').length}</span>
          <span className="stat-label">Disabled</span>
        </div>
      </div>

      {filteredOrganizers.length > 0 ? (
        <div className="organizers-table-container">
          <table className="organizers-table">
            <thead>
              <tr>
                <th>Organization</th>
                <th>Email</th>
                <th>Category</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrganizers.map(org => (
                <tr key={org._id} className={org.status === 'disabled' ? 'disabled-row' : ''}>
                  <td>
                    <div className="org-info">
                      <div className="org-avatar">
                        {(org.organizerName || org.clubName || org.councilName || org.email)[0].toUpperCase()}
                      </div>
                      <div className="org-names">
                        <span className="org-name">{org.organizerName || org.clubName || org.councilName || 'No Name'}</span>
                        {org.councilName && (
                          <span className="org-council">{org.councilName}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{org.email}</td>
                  <td>{org.category || '-'}</td>
                  <td>
                    <span className={`status-badge ${org.status || 'active'}`}>
                      {(org.status || 'active').toUpperCase()}
                    </span>
                  </td>
                  <td>{new Date(org.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className={`btn-small ${org.status === 'active' ? 'btn-warning' : 'btn-success'}`}
                        onClick={() => handleToggleStatus(org._id, org.status || 'active')}
                        title={org.status === 'active' ? 'Disable' : 'Enable'}
                      >
                        {org.status === 'active' ? '⏸' : '▶'}
                      </button>
                      <button
                        className="btn-small btn-secondary"
                        onClick={() => handleResetPassword(org._id, org.email)}
                        title="Reset Password"
                      >
                        🔑
                      </button>
                      <button
                        className="btn-small btn-danger"
                        onClick={() => handleDeleteOrganizer(org._id, org.clubName || org.email)}
                        title="Delete"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <h3>No organizers found</h3>
          <p>
            {searchQuery || filterStatus !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Create your first organizer to get started'}
          </p>
        </div>
      )}

      {/* Create Organizer Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Organizer</h2>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateOrganizer}>
              <div className="form-group">
                <label>Organizer / Club Name *</label>
                <input
                  type="text"
                  value={newOrganizer.organizerName}
                  onChange={(e) => setNewOrganizer(prev => ({ ...prev, organizerName: e.target.value }))}
                  placeholder="e.g., Programming Club"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Login Email *</label>
                  <input
                    type="email"
                    value={newOrganizer.email}
                    onChange={(e) => setNewOrganizer(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="organizer@iiit.ac.in"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    value={newOrganizer.password}
                    onChange={(e) => setNewOrganizer(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    value={newOrganizer.category}
                    onChange={(e) => setNewOrganizer(prev => ({ ...prev, category: e.target.value }))}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Contact Email</label>
                  <input
                    type="email"
                    value={newOrganizer.contactEmail}
                    onChange={(e) => setNewOrganizer(prev => ({ ...prev, contactEmail: e.target.value }))}
                    placeholder="Public contact email (optional)"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newOrganizer.description}
                  onChange={(e) => setNewOrganizer(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the club/organizer"
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Organizer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrganizerManagement;
