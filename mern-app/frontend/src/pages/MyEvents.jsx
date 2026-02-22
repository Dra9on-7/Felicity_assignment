import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { participantAPI } from '../services/api';
import '../styles/Events.css';

const MyEvents = () => {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const response = await participantAPI.getRegisteredEvents();
      setRegistrations(response.data.data || []);
    } catch (err) {
      console.error('Error fetching registrations:', err);
      setError('Failed to load your events');
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  
  const upcomingEvents = registrations.filter(reg => {
    const eventDate = new Date(reg.event?.eventStartDate);
    return eventDate > now && reg.status !== 'cancelled';
  });

  const pastEvents = registrations.filter(reg => {
    const eventDate = new Date(reg.event?.eventEndDate || reg.event?.eventStartDate);
    return eventDate < now;
  });

  const cancelledEvents = registrations.filter(reg => reg.status === 'cancelled');

  const formatDate = (dateString) => {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCancelRegistration = async (eventId) => {
    if (!window.confirm('Are you sure you want to cancel this registration?')) {
      return;
    }

    try {
      await participantAPI.cancelRegistration(eventId);
      fetchRegistrations();
    } catch (err) {
      console.error('Error cancelling registration:', err);
      alert('Failed to cancel registration. Please try again.');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      registered: { class: 'badge-success', text: 'Registered' },
      attended: { class: 'badge-info', text: 'Attended' },
      cancelled: { class: 'badge-warning', text: 'Cancelled' },
    };
    return badges[status] || { class: '', text: status };
  };

  const renderEventCard = (registration, showCancel = false) => {
    const { event, status, ticket } = registration;
    if (!event) return null;

    const badge = getStatusBadge(status);

    return (
      <div key={registration._id} className="my-event-card">
        <div className="event-card-header">
          <Link to={`/events/${event._id}`} className="event-title-link">
            <h3>{event.eventName}</h3>
          </Link>
          <span className={`status-badge ${badge.class}`}>{badge.text}</span>
        </div>

        <div className="event-meta-info">
          <p>
            <span className="meta-icon">📅</span>
            {formatDate(event.eventStartDate)}
          </p>
          {event.venue && (
            <p>
              <span className="meta-icon">📍</span>
              {event.venue}
            </p>
          )}
          <p>
            <span className="meta-icon">🏛️</span>
            {event.organizerId?.clubName || event.organizerId?.councilName || 'Organizer'}
          </p>
        </div>

        {event.eventType === 'merchandise' && registration.registrationData?.variant && (
          <div className="merchandise-details">
            <p><strong>Variant:</strong> {registration.registrationData.variant}</p>
            {registration.registrationData.quantity && (
              <p><strong>Quantity:</strong> {registration.registrationData.quantity}</p>
            )}
          </div>
        )}

        {ticket?.qrCode && status === 'registered' && (
          <div className="ticket-section">
            <h4>Your Ticket</h4>
            <div className="qr-code-container">
              <img src={ticket.qrCode} alt="QR Code Ticket" className="qr-code-image" />
            </div>
            <p className="ticket-info">Show this QR code at the venue for entry</p>
            {ticket.issuedAt && (
              <p className="ticket-issued">Issued: {formatDate(ticket.issuedAt)}</p>
            )}
          </div>
        )}

        <div className="event-card-actions">
          <Link to={`/events/${event._id}`} className="btn-secondary">
            View Details
          </Link>
          {showCancel && status === 'registered' && (
            <button 
              onClick={() => handleCancelRegistration(event._id)}
              className="btn-danger"
            >
              Cancel Registration
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="my-events-container">
        <div className="loading">Loading your events...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-events-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="my-events-container">
      <div className="page-header">
        <h1>My Events</h1>
        <p>Manage your event registrations and tickets</p>
      </div>

      <div className="events-tabs">
        <button 
          className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming ({upcomingEvents.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
          onClick={() => setActiveTab('past')}
        >
          Past ({pastEvents.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'cancelled' ? 'active' : ''}`}
          onClick={() => setActiveTab('cancelled')}
        >
          Cancelled ({cancelledEvents.length})
        </button>
      </div>

      <div className="events-content">
        {activeTab === 'upcoming' && (
          upcomingEvents.length > 0 ? (
            <div className="my-events-grid">
              {upcomingEvents.map(reg => renderEventCard(reg, true))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No upcoming events</h3>
              <p>You haven't registered for any upcoming events yet.</p>
              <Link to="/events" className="btn-primary">Browse Events</Link>
            </div>
          )
        )}

        {activeTab === 'past' && (
          pastEvents.length > 0 ? (
            <div className="my-events-grid">
              {pastEvents.map(reg => renderEventCard(reg))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No past events</h3>
              <p>Your event history will appear here.</p>
            </div>
          )
        )}

        {activeTab === 'cancelled' && (
          cancelledEvents.length > 0 ? (
            <div className="my-events-grid">
              {cancelledEvents.map(reg => renderEventCard(reg))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No cancelled registrations</h3>
              <p>You haven't cancelled any event registrations.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default MyEvents;
