import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { participantAPI } from '../services/api';
import '../styles/Events.css';

const MyEvents = () => {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [subFilter, setSubFilter] = useState('all'); // 'all', 'normal', 'merchandise'
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
    return eventDate > now && reg.status !== 'cancelled' && reg.status !== 'rejected';
  });

  const completedEvents = registrations.filter(reg => {
    const eventEndDate = new Date(reg.event?.eventEndDate || reg.event?.eventStartDate);
    return (eventEndDate < now || reg.event?.status === 'completed') && 
           reg.status !== 'cancelled' && reg.status !== 'rejected';
  });

  const cancelledEvents = registrations.filter(reg => reg.status === 'cancelled');

  const rejectedEvents = registrations.filter(reg => 
    reg.paymentStatus === 'rejected' || reg.status === 'rejected'
  );

  const applySubFilter = (events) => {
    if (subFilter === 'all') return events;
    return events.filter(reg => {
      const type = reg.event?.eventType || 'normal';
      return type === subFilter;
    });
  };

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

  const getStatusBadge = (registration) => {
    const { status, paymentStatus } = registration;
    if (paymentStatus === 'rejected') return { class: 'badge-danger', text: 'Payment Rejected' };
    if (paymentStatus === 'pending_approval') return { class: 'badge-warning', text: 'Pending Approval' };
    if (paymentStatus === 'approved') return { class: 'badge-success', text: 'Approved' };
    const badges = {
      registered: { class: 'badge-success', text: 'Registered' },
      attended: { class: 'badge-info', text: 'Attended' },
      cancelled: { class: 'badge-warning', text: 'Cancelled' },
      pending: { class: 'badge-warning', text: 'Pending' },
    };
    return badges[status] || { class: '', text: status };
  };

  const renderEventCard = (registration, showCancel = false) => {
    const { event, status, ticket, ticketId } = registration;
    if (!event) return null;

    const badge = getStatusBadge(registration);
    const eventType = event.eventType || 'normal';

    return (
      <div key={registration._id} className="my-event-card">
        <div className="event-card-header">
          <Link to={`/events/${event._id}`} className="event-title-link">
            <h3>{event.eventName || event.name}</h3>
          </Link>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span className={`event-type-badge ${eventType}`}>
              {eventType === 'merchandise' ? '🛍️ Merchandise' : '🎫 Normal'}
            </span>
            <span className={`status-badge ${badge.class}`}>{badge.text}</span>
          </div>
        </div>

        {ticketId && (
          <div className="ticket-id-display" style={{ 
            background: '#f0f4ff', padding: '6px 12px', borderRadius: '6px', 
            fontSize: '0.85em', marginBottom: '8px', fontFamily: 'monospace' 
          }}>
            🎟️ Ticket ID: <strong>{ticketId}</strong>
          </div>
        )}

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

        {eventType === 'merchandise' && registration.merchandiseDetails && (
          <div className="merchandise-details" style={{ 
            background: '#fff7ed', padding: '8px 12px', borderRadius: '6px', marginBottom: '8px' 
          }}>
            {(Array.isArray(registration.merchandiseDetails) ? registration.merchandiseDetails : [registration.merchandiseDetails]).map((item, idx) => (
              <p key={idx}>
                <strong>{item.name || item.itemName}</strong>
                {item.variant && ` — ${item.variant}`}
                {item.quantity && ` × ${item.quantity}`}
                {item.price && ` — ₹${item.price * (item.quantity || 1)}`}
              </p>
            ))}
          </div>
        )}

        {(registration.qrCode || ticket?.qrCode) && (status === 'registered' || status === 'attended') && (
          <div className="ticket-section">
            <h4>Your Ticket</h4>
            <div className="qr-code-container">
              <img src={registration.qrCode || ticket?.qrCode} alt="QR Code Ticket" className="qr-code-image" />
            </div>
            <p className="ticket-info">Show this QR code at the venue for entry</p>
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

  const currentEvents = activeTab === 'upcoming' ? upcomingEvents 
    : activeTab === 'completed' ? completedEvents 
    : activeTab === 'cancelled' ? cancelledEvents 
    : rejectedEvents;

  const filteredEvents = applySubFilter(currentEvents);

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
          className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed ({completedEvents.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'cancelled' ? 'active' : ''}`}
          onClick={() => setActiveTab('cancelled')}
        >
          Cancelled ({cancelledEvents.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'rejected' ? 'active' : ''}`}
          onClick={() => setActiveTab('rejected')}
        >
          Rejected ({rejectedEvents.length})
        </button>
      </div>

      {/* Sub-filter by event type */}
      <div className="events-sub-filter" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['all', 'normal', 'merchandise'].map(f => (
          <button 
            key={f}
            className={`btn-sm ${subFilter === f ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubFilter(f)}
            style={{ padding: '4px 12px', borderRadius: '16px', fontSize: '0.85em' }}
          >
            {f === 'all' ? 'All Types' : f === 'normal' ? '🎫 Normal' : '🛍️ Merchandise'}
          </button>
        ))}
      </div>

      <div className="events-content">
        {filteredEvents.length > 0 ? (
          <div className="my-events-grid">
            {filteredEvents.map(reg => renderEventCard(reg, activeTab === 'upcoming'))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No {activeTab} events</h3>
            <p>
              {activeTab === 'upcoming' 
                ? "You haven't registered for any upcoming events yet." 
                : activeTab === 'completed'
                  ? 'Your completed event history will appear here.'
                  : activeTab === 'cancelled'
                    ? "You haven't cancelled any event registrations."
                    : 'No rejected registrations.'}
            </p>
            {activeTab === 'upcoming' && (
              <Link to="/events" className="btn-primary">Browse Events</Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyEvents;
