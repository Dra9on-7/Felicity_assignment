import { Link } from 'react-router-dom';
import '../styles/Components.css';

const EventCard = ({ event, registration }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getOrganizerName = () => {
    if (event.organizer) {
      return event.organizer.clubName || event.organizer.councilName || event.organizer.name;
    }
    return 'Unknown Organizer';
  };

  const isUpcoming = new Date(event.startDateTime) > new Date();
  const isOngoing = new Date(event.startDateTime) <= new Date() && 
                    new Date(event.endDateTime) >= new Date();

  return (
    <div className="event-card">
      <div className="event-card-header">
        {event.image ? (
          <img src={event.image} alt={event.name} className="event-card-image" />
        ) : (
          <div className="event-card-placeholder">
            <span>{event.name.charAt(0)}</span>
          </div>
        )}
        
        <div className="event-card-badges">
          {event.eventType === 'merchandise' && (
            <span className="badge merchandise">Merchandise</span>
          )}
          {isOngoing && <span className="badge ongoing">Ongoing</span>}
          {event.isRegistered && <span className="badge registered">Registered</span>}
        </div>
      </div>

      <div className="event-card-body">
        <span className="event-card-category">{event.category}</span>
        <h3 className="event-card-title">
          <Link to={`/events/${event._id}`}>{event.name}</Link>
        </h3>
        <p className="event-card-organizer">{getOrganizerName()}</p>
        
        <div className="event-card-meta">
          <span className="event-card-date">
            📅 {formatDate(event.startDateTime)}
          </span>
          {event.venue && (
            <span className="event-card-venue">
              📍 {event.venue}
            </span>
          )}
        </div>

        {event.description && (
          <p className="event-card-description">
            {event.description.substring(0, 100)}
            {event.description.length > 100 ? '...' : ''}
          </p>
        )}
      </div>

      <div className="event-card-footer">
        {registration ? (
          <div className="registration-info">
            <span className={`status ${registration.status}`}>
              {registration.status}
            </span>
            {registration.qrCode && (
              <Link to={`/my-events/${event._id}`} className="view-ticket">
                View Ticket
              </Link>
            )}
          </div>
        ) : (
          <Link to={`/events/${event._id}`} className="event-card-link">
            View Details →
          </Link>
        )}
      </div>
    </div>
  );
};

export default EventCard;
