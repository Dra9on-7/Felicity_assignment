import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { eventAPI, participantAPI } from '../services/api';
import EventCard from '../components/EventCard';
import '../styles/Events.css';

const ClubDetails = () => {
  const { clubId } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [club, setClub] = useState(null);
  const [events, setEvents] = useState({ upcoming: [], past: [] });
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchClubDetails();
    if (isAuthenticated && user?.role === 'participant') {
      checkFollowStatus();
    }
  }, [clubId, isAuthenticated, user]);

  const fetchClubDetails = async () => {
    try {
      setLoading(true);
      const response = await eventAPI.getOrganizerDetails(clubId);
      const data = response.data.data;
      
      setClub(data.organizer);
      
      // Separate events into upcoming and past
      const now = new Date();
      const upcoming = (data.events || []).filter(event => 
        new Date(event.eventStartDate) > now && event.status === 'published'
      );
      const past = (data.events || []).filter(event => 
        new Date(event.eventEndDate || event.eventStartDate) < now
      );
      
      setEvents({ upcoming, past });
    } catch (err) {
      console.error('Error fetching club details:', err);
      setError('Failed to load club details');
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    try {
      const response = await participantAPI.getFollowedClubs();
      const followedIds = (response.data.data || []).map(c => c._id);
      setIsFollowing(followedIds.includes(clubId));
    } catch (err) {
      console.error('Error checking follow status:', err);
    }
  };

  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
      alert('Please login to follow clubs');
      return;
    }

    try {
      setFollowingLoading(true);
      
      if (isFollowing) {
        await participantAPI.unfollowClub(clubId);
        setIsFollowing(false);
      } else {
        await participantAPI.followClub(clubId);
        setIsFollowing(true);
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
      alert('Failed to update follow status');
    } finally {
      setFollowingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="club-details-container">
        <div className="loading">Loading club details...</div>
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="club-details-container">
        <div className="error-message">{error || 'Club not found'}</div>
        <Link to="/clubs" className="btn-secondary">Back to Clubs</Link>
      </div>
    );
  }

  const clubName = club.clubName || club.councilName || club.name || 'Unknown';

  return (
    <div className="club-details-container">
      <div className="club-header">
        <div className="club-avatar-xlarge">
          {clubName[0].toUpperCase()}
        </div>
        <div className="club-header-info">
          <h1>{clubName}</h1>
          {club.category && (
            <span className="club-category-badge large">{club.category}</span>
          )}
          {club.description && (
            <p className="club-description">{club.description}</p>
          )}
          <div className="club-meta">
            {club.contactEmail && (
              <p><span>📧</span> {club.contactEmail}</p>
            )}
          </div>
        </div>
        <div className="club-header-actions">
          {isAuthenticated && user?.role === 'participant' && (
            <button
              className={`btn-follow large ${isFollowing ? 'following' : ''}`}
              onClick={handleFollowToggle}
              disabled={followingLoading}
            >
              {followingLoading 
                ? 'Loading...' 
                : isFollowing 
                  ? '✓ Following' 
                  : '+ Follow'}
            </button>
          )}
        </div>
      </div>

      <div className="club-stats">
        <div className="stat">
          <span className="stat-value">{events.upcoming.length}</span>
          <span className="stat-label">Upcoming Events</span>
        </div>
        <div className="stat">
          <span className="stat-value">{events.past.length}</span>
          <span className="stat-label">Past Events</span>
        </div>
      </div>

      <div className="club-events-section">
        <div className="events-tabs">
          <button 
            className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming Events ({events.upcoming.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
            onClick={() => setActiveTab('past')}
          >
            Past Events ({events.past.length})
          </button>
        </div>

        <div className="events-content">
          {activeTab === 'upcoming' && (
            events.upcoming.length > 0 ? (
              <div className="events-grid">
                {events.upcoming.map(event => (
                  <EventCard key={event._id} event={event} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <h3>No upcoming events</h3>
                <p>Check back later for new events from {clubName}</p>
              </div>
            )
          )}

          {activeTab === 'past' && (
            events.past.length > 0 ? (
              <div className="events-grid">
                {events.past.map(event => (
                  <EventCard key={event._id} event={event} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <h3>No past events</h3>
                <p>This club hasn't organized any events yet</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default ClubDetails;
