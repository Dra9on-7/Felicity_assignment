import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../services/api';
import '../styles/Dashboard.css';
import '../styles/Events.css';

const AdminEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllEvents();
      setEvents(response.data.events);
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to fetch events' 
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = 
      event.eventName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.organizerId?.organizerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.venue?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || event.eventStatus === filterStatus;
    const matchesType = filterType === 'all' || event.eventType === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'published': return 'success';
      case 'draft': return 'warning';
      case 'cancelled': return 'danger';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading events...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Event Management</h1>
        <p>View and monitor all events across the platform</p>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="close-btn">×</button>
        </div>
      )}

      <div className="page-controls">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by event name, organizer, or venue..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Status:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Type:</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="normal">Normal</option>
            <option value="merchandise">Merchandise</option>
          </select>
        </div>

        <div className="stats-summary">
          <span className="stat-badge">{filteredEvents.length} of {events.length} events</span>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Event Name</th>
              <th>Organizer</th>
              <th>Type</th>
              <th>Status</th>
              <th>Date & Time</th>
              <th>Venue</th>
              <th>Capacity</th>
              <th>Registrations</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length > 0 ? (
              filteredEvents.map(event => (
                <tr key={event._id}>
                  <td>
                    <div className="event-info">
                      <strong>{event.eventName}</strong>
                      {event.category && <small className="text-muted">{event.category}</small>}
                    </div>
                  </td>
                  <td>
                    <div className="organizer-info">
                      {event.organizerId?.organizerName || 'Unknown'}
                      {event.organizerId?.category && (
                        <small className="text-muted">{event.organizerId.category}</small>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${event.eventType === 'normal' ? 'info' : 'special'}`}>
                      {event.eventType}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(event.eventStatus)}`}>
                      {event.eventStatus}
                    </span>
                  </td>
                  <td>
                    <div className="date-info">
                      {new Date(event.eventDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                      <small>{event.startTime} - {event.endTime}</small>
                    </div>
                  </td>
                  <td>{event.venue}</td>
                  <td>
                    <span className="capacity-info">
                      {event.maxCapacity || 'Unlimited'}
                    </span>
                  </td>
                  <td>
                    <span className="registration-count">
                      {event.registrationCount || 0}
                    </span>
                  </td>
                  <td>
                    <Link 
                      to={`/events/${event._id}`} 
                      className="action-btn view"
                      title="View Details"
                    >
                      👁️
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="no-data">
                  {searchTerm || filterStatus !== 'all' || filterType !== 'all'
                    ? 'No events match your filters' 
                    : 'No events created yet'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <div className="footer-stats">
          <span>Total Events: {events.length}</span>
          <span>Published: {events.filter(e => e.eventStatus === 'published').length}</span>
          <span>Draft: {events.filter(e => e.eventStatus === 'draft').length}</span>
          <span>Cancelled: {events.filter(e => e.eventStatus === 'cancelled').length}</span>
        </div>
      </div>
    </div>
  );
};

export default AdminEvents;
