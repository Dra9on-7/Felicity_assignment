import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { organizerAPI } from '../services/api';
import AttendanceDashboard from '../components/AttendanceDashboard';
import MerchandiseOrders from '../components/MerchandiseOrders';
import DiscussionForum from '../components/DiscussionForum';
import '../styles/Dashboard.css';

const OrganizerEventDetails = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [regFilters, setRegFilters] = useState({ status: 'all', participantType: 'all', search: '' });

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const [eventRes, registrationsRes, analyticsRes] = await Promise.all([
        organizerAPI.getEventDetails(eventId),
        organizerAPI.getEventRegistrations(eventId),
        organizerAPI.getEventAnalytics(eventId)
      ]);

      setEvent(eventRes.data.data);
      setRegistrations(registrationsRes.data.data || []);
      setAnalytics(analyticsRes.data.data || {});
    } catch (err) {
      console.error('Error fetching event details:', err);
      setError('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      setActionLoading(true);
      await organizerAPI.updateEvent(eventId, { status: 'published' });
      setEvent(prev => ({ ...prev, status: 'published' }));
    } catch (err) {
      alert('Failed to publish event');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnpublish = async () => {
    if (!confirm('Are you sure you want to unpublish this event?')) return;
    try {
      setActionLoading(true);
      await organizerAPI.updateEvent(eventId, { status: 'draft' });
      setEvent(prev => ({ ...prev, status: 'draft' }));
    } catch (err) {
      alert('Failed to unpublish event');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelEvent = async () => {
    if (!confirm('Are you sure you want to cancel this event? This action cannot be undone.')) return;
    try {
      setActionLoading(true);
      await organizerAPI.cancelEvent(eventId);
      setEvent(prev => ({ ...prev, status: 'cancelled' }));
    } catch (err) {
      alert('Failed to cancel event');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndEventEarly = async () => {
    if (!confirm('Are you sure you want to end this event early? All participants will be notified.')) return;
    try {
      setActionLoading(true);
      await organizerAPI.endEventEarly(eventId);
      setEvent(prev => ({ ...prev, status: 'completed' }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to end event early');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (registrations.length === 0) {
      alert('No registrations to export');
      return;
    }

    // Create CSV content
    const headers = ['Name', 'Email', 'Phone', 'Registration Date', 'Status'];
    const rows = registrations.map(reg => [
      reg.participant?.name || 'N/A',
      reg.participant?.email || 'N/A',
      reg.participant?.phoneNumber || 'N/A',
      new Date(reg.registeredAt).toLocaleString(),
      reg.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.eventName.replace(/\s+/g, '_')}_registrations.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleUpdateRegistrationStatus = async (registrationId, status) => {
    try {
      await organizerAPI.updateRegistrationStatus(eventId, registrationId, status);
      setRegistrations(prev => 
        prev.map(reg => 
          reg._id === registrationId ? { ...reg, status } : reg
        )
      );
    } catch (err) {
      alert('Failed to update registration status');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="event-details-organizer">
        <div className="loading">Loading event details...</div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="event-details-organizer">
        <div className="error-message">{error || 'Event not found'}</div>
        <Link to="/organizer/dashboard" className="btn-secondary">Back to Dashboard</Link>
      </div>
    );
  }

  const statusColors = {
    draft: '#ffc107',
    published: '#28a745',
    ongoing: '#17a2b8',
    cancelled: '#dc3545',
    completed: '#6c757d'
  };

  // Filter registrations
  const filteredRegistrations = registrations.filter(reg => {
    if (regFilters.status !== 'all' && reg.status !== regFilters.status) return false;
    if (regFilters.participantType !== 'all' && reg.participant?.participantType !== regFilters.participantType) return false;
    if (regFilters.search) {
      const q = regFilters.search.toLowerCase();
      const name = (reg.participant?.name || '').toLowerCase();
      const email = (reg.participant?.email || '').toLowerCase();
      if (!name.includes(q) && !email.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="event-details-organizer">
      <div className="event-header-bar">
        <div className="header-left">
          <Link to="/organizer/dashboard" className="back-link">← Back to Dashboard</Link>
          <h1>{event.eventName}</h1>
          <span className="status-badge" style={{ backgroundColor: statusColors[event.status] || '#6c757d' }}>
            {event.status?.toUpperCase()}
          </span>
        </div>
        <div className="header-actions">
          {event.status === 'draft' && (
            <button 
              className="btn-primary" 
              onClick={handlePublish}
              disabled={actionLoading}
            >
              Publish Event
            </button>
          )}
          {event.status === 'published' && (
            <button 
              className="btn-secondary" 
              onClick={handleUnpublish}
              disabled={actionLoading}
            >
              Unpublish
            </button>
          )}
          {event.status === 'published' && (
            <button 
              className="btn-warning" 
              onClick={handleEndEventEarly}
              disabled={actionLoading}
              style={{ backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}
            >
              End Event Early
            </button>
          )}
          {event.status === 'ongoing' && (
            <button 
              className="btn-warning" 
              onClick={handleEndEventEarly}
              disabled={actionLoading}
              style={{ backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}
            >
              End Event Now
            </button>
          )}
          <Link to={`/organizer/events/${eventId}/edit`} className="btn-secondary">
            Edit Event
          </Link>
          {event.status !== 'cancelled' && (
            <button 
              className="btn-danger" 
              onClick={handleCancelEvent}
              disabled={actionLoading}
            >
              Cancel Event
            </button>
          )}
        </div>
      </div>

      <div className="event-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'registrations' ? 'active' : ''}`}
          onClick={() => setActiveTab('registrations')}
        >
          Registrations ({registrations.length})
        </button>
        {event.eventType === 'merchandise' && (
          <button 
            className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            🛍️ Orders
          </button>
        )}
        <button 
          className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          📷 Attendance
        </button>
        <button 
          className={`tab-btn ${activeTab === 'forum' ? 'active' : ''}`}
          onClick={() => setActiveTab('forum')}
        >
          💬 Forum
        </button>
        <button 
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
      </div>

      <div className="event-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="event-info-grid">
              <div className="info-card">
                <h3>Event Details</h3>
                <div className="info-row">
                  <span className="label">Type:</span>
                  <span className="value">{event.eventType}</span>
                </div>
                <div className="info-row">
                  <span className="label">Category:</span>
                  <span className="value">{event.category || 'N/A'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Venue:</span>
                  <span className="value">{event.isOnline ? 'Online' : event.venue}</span>
                </div>
                <div className="info-row">
                  <span className="label">Fee:</span>
                  <span className="value">
                    {event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free'}
                  </span>
                </div>
              </div>

              <div className="info-card">
                <h3>Schedule</h3>
                <div className="info-row">
                  <span className="label">Event Start:</span>
                  <span className="value">{formatDate(event.eventStartDate)}</span>
                </div>
                <div className="info-row">
                  <span className="label">Event End:</span>
                  <span className="value">{formatDate(event.eventEndDate)}</span>
                </div>
                <div className="info-row">
                  <span className="label">Registration Opens:</span>
                  <span className="value">{formatDate(event.registrationStartDate)}</span>
                </div>
                <div className="info-row">
                  <span className="label">Registration Closes:</span>
                  <span className="value">{formatDate(event.registrationEndDate)}</span>
                </div>
              </div>

              <div className="info-card">
                <h3>Participation</h3>
                <div className="info-row">
                  <span className="label">Registrations:</span>
                  <span className="value">{registrations.length}</span>
                </div>
                <div className="info-row">
                  <span className="label">Max Participants:</span>
                  <span className="value">{event.maxParticipants || 'Unlimited'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Team Event:</span>
                  <span className="value">{event.teamEvent ? 'Yes' : 'No'}</span>
                </div>
                {event.teamEvent && (
                  <div className="info-row">
                    <span className="label">Team Size:</span>
                    <span className="value">{event.minTeamSize} - {event.maxTeamSize}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="description-section">
              <h3>Description</h3>
              <p>{event.description}</p>
            </div>

            {event.rules && (
              <div className="description-section">
                <h3>Rules & Regulations</h3>
                <p>{event.rules}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'registrations' && (
          <div className="registrations-tab">
            <div className="registrations-header">
              <h3>All Registrations</h3>
              <button className="btn-secondary" onClick={handleExportCSV}>
                📥 Export CSV
              </button>
            </div>

            <div className="registrations-filters" style={{ display: 'flex', gap: '12px', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={regFilters.search}
                onChange={(e) => setRegFilters(prev => ({ ...prev, search: e.target.value }))}
                style={{ padding: '0.4rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem', minWidth: '200px' }}
              />
              <select
                value={regFilters.status}
                onChange={(e) => setRegFilters(prev => ({ ...prev, status: e.target.value }))}
                style={{ padding: '0.4rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
              >
                <option value="all">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
                <option value="attended">Attended</option>
              </select>
              <select
                value={regFilters.participantType}
                onChange={(e) => setRegFilters(prev => ({ ...prev, participantType: e.target.value }))}
                style={{ padding: '0.4rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
              >
                <option value="all">All Types</option>
                <option value="IIIT">IIIT</option>
                <option value="Non-IIIT">Non-IIIT</option>
              </select>
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                Showing {filteredRegistrations.length} of {registrations.length}
              </span>
            </div>

            {filteredRegistrations.length > 0 ? (
              <table className="registrations-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Type</th>
                    <th>Registered On</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistrations.map((reg, index) => (
                    <tr key={reg._id}>
                      <td>{index + 1}</td>
                      <td>{reg.participant?.name || 'N/A'}</td>
                      <td>{reg.participant?.email || 'N/A'}</td>
                      <td>{reg.participant?.phoneNumber || 'N/A'}</td>
                      <td>
                        <span className={`type-badge ${reg.participant?.participantType === 'IIIT' ? 'iiit' : 'non-iiit'}`}>
                          {reg.participant?.participantType || 'N/A'}
                        </span>
                      </td>
                      <td>{formatDate(reg.registeredAt)}</td>
                      <td>
                        <span className={`status-badge small ${reg.status}`}>
                          {reg.status}
                        </span>
                      </td>
                      <td>
                        <select
                          value={reg.status}
                          onChange={(e) => handleUpdateRegistrationStatus(reg._id, e.target.value)}
                          className="status-select"
                        >
                          <option value="confirmed">Confirmed</option>
                          <option value="pending">Pending</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="attended">Attended</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <h3>No registrations yet</h3>
                <p>Share your event to get participants</p>
              </div>
            )}
          </div>
        )}

        {/* Merchandise Orders Tab (Tier A) */}
        {activeTab === 'orders' && event.eventType === 'merchandise' && (
          <div className="orders-tab">
            <MerchandiseOrders eventId={eventId} />
          </div>
        )}

        {/* Attendance Tab (Tier A) */}
        {activeTab === 'attendance' && (
          <div className="attendance-tab">
            <AttendanceDashboard eventId={eventId} />
          </div>
        )}

        {/* Discussion Forum Tab (Tier B) */}
        {activeTab === 'forum' && (
          <div className="forum-tab">
            <DiscussionForum eventId={eventId} isOrganizer={true} />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="analytics-tab">
            <div className="analytics-grid">
              <div className="analytics-card">
                <span className="analytics-value">{analytics.totalRegistrations || 0}</span>
                <span className="analytics-label">Total Registrations</span>
              </div>
              <div className="analytics-card">
                <span className="analytics-value">{analytics.confirmedRegistrations || 0}</span>
                <span className="analytics-label">Confirmed</span>
              </div>
              <div className="analytics-card">
                <span className="analytics-value">{analytics.pendingRegistrations || 0}</span>
                <span className="analytics-label">Pending</span>
              </div>
              <div className="analytics-card">
                <span className="analytics-value">{analytics.cancelledRegistrations || 0}</span>
                <span className="analytics-label">Cancelled</span>
              </div>
              <div className="analytics-card">
                <span className="analytics-value">{analytics.pageViews || 0}</span>
                <span className="analytics-label">Page Views</span>
              </div>
              <div className="analytics-card">
                <span className="analytics-value">
                  {event.registrationFee > 0 
                    ? `₹${(analytics.confirmedRegistrations || 0) * event.registrationFee}` 
                    : '₹0'}
                </span>
                <span className="analytics-label">Revenue</span>
              </div>
            </div>

            {analytics.registrationsByDay && (
              <div className="chart-section">
                <h3>Registrations Over Time</h3>
                <div className="simple-chart">
                  {Object.entries(analytics.registrationsByDay || {}).map(([date, count]) => (
                    <div key={date} className="chart-bar">
                      <div 
                        className="bar-fill" 
                        style={{ 
                          height: `${Math.min(count * 20, 100)}%` 
                        }}
                      />
                      <span className="bar-label">{new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      <span className="bar-value">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizerEventDetails;
