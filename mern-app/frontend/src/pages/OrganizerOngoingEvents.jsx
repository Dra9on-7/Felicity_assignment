import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { organizerAPI } from '../services/api';
import '../styles/Dashboard.css';

const OrganizerOngoingEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOngoingEvents();
  }, []);

  const fetchOngoingEvents = async () => {
    try {
      setLoading(true);
      const response = await organizerAPI.getOngoingEvents();
      setEvents(response.data.events || response.data.data?.events || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load ongoing events');
    } finally {
      setLoading(false);
    }
  };

  const getEventName = (e) => e.eventName || e.name || 'Unnamed Event';
  const getStartDate = (e) => e.eventStartDate || e.startDateTime || e.startDate;
  const getEndDate = (e) => e.eventEndDate || e.endDateTime || e.endDate;

  const handleCancelEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to cancel this event?')) return;
    try {
      await organizerAPI.cancelEvent(eventId);
      fetchOngoingEvents();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel event');
    }
  };

  const handleExportCSV = async (eventId) => {
    try {
      const response = await organizerAPI.exportParticipantsCSV(eventId);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `participants_${eventId}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export CSV');
    }
  };

  if (loading) return <div className="loading">Loading ongoing events...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <h1>Ongoing Events</h1>
        <p>Events currently happening or accepting registrations</p>
      </div>

      {events.length === 0 ? (
        <div className="empty-state">
          <h3>No ongoing events</h3>
          <p>You don't have any events currently in progress.</p>
          <Link to="/organizer/events/create" className="btn-primary">
            Create New Event
          </Link>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event Name</th>
                <th>Type</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Registrations</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map(event => (
                <tr key={event._id}>
                  <td>
                    <Link to={`/organizer/events/${event._id}`} className="event-link">
                      {getEventName(event)}
                    </Link>
                  </td>
                  <td>
                    <span className={`badge badge-${event.eventType || 'normal'}`}>
                      {event.eventType || 'normal'}
                    </span>
                  </td>
                  <td>{getStartDate(event) ? new Date(getStartDate(event)).toLocaleDateString() : 'N/A'}</td>
                  <td>{getEndDate(event) ? new Date(getEndDate(event)).toLocaleDateString() : 'N/A'}</td>
                  <td>{event.registrationCount || 0}{event.registrationLimit ? ` / ${event.registrationLimit}` : ''}</td>
                  <td>
                    <span className={`badge badge-${event.status || event.eventStatus}`}>
                      {event.status || event.eventStatus || 'active'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <Link to={`/organizer/events/${event._id}`} className="btn-sm btn-primary">
                      View
                    </Link>
                    <button
                      className="btn-sm btn-secondary"
                      onClick={() => handleExportCSV(event._id)}
                    >
                      Export CSV
                    </button>
                    <button
                      className="btn-sm btn-danger"
                      onClick={() => handleCancelEvent(event._id)}
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OrganizerOngoingEvents;
