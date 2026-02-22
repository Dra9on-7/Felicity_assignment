import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { participantAPI, eventAPI } from '../services/api';
import EventCard from '../components/EventCard';
import '../styles/Dashboard.css';

const ParticipantDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [trendingEvents, setTrendingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, trendingRes] = await Promise.all([
        participantAPI.getDashboard(),
        eventAPI.getTrendingEvents(),
      ]);
      
      setDashboardData(dashboardRes.data.data);
      setTrendingEvents(trendingRes.data.data || []);
    } catch (err) {
      setError('Failed to load dashboard data');
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
        <h1>Welcome, {user?.firstName || 'Participant'}!</h1>
        <p className="participant-type">
          {user?.participantType} Participant
        </p>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>{dashboardData?.registeredEventsCount || 0}</h3>
          <p>Registered Events</p>
        </div>
        <div className="stat-card">
          <h3>{dashboardData?.upcomingEventsCount || 0}</h3>
          <p>Upcoming Events</p>
        </div>
        <div className="stat-card">
          <h3>{dashboardData?.followedClubsCount || 0}</h3>
          <p>Following</p>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="section-header">
          <h2>Trending Events 🔥</h2>
          <Link to="/events" className="view-all-link">View All Events</Link>
        </div>
        
        {trendingEvents.length > 0 ? (
          <div className="events-grid">
            {trendingEvents.slice(0, 4).map(event => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
        ) : (
          <p className="empty-message">No trending events right now</p>
        )}
      </div>

      {dashboardData?.upcomingRegistrations?.length > 0 && (
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Your Upcoming Events</h2>
            <Link to="/my-events" className="view-all-link">View All</Link>
          </div>
          
          <div className="events-grid">
            {dashboardData.upcomingRegistrations.slice(0, 3).map(reg => (
              <EventCard key={reg._id} event={reg.event} registration={reg} />
            ))}
          </div>
        </div>
      )}

      <div className="dashboard-section">
        <div className="section-header">
          <h2>Quick Actions</h2>
        </div>
        
        <div className="quick-actions">
          <Link to="/events" className="action-card">
            <span className="action-icon">🎪</span>
            <span>Browse Events</span>
          </Link>
          <Link to="/clubs" className="action-card">
            <span className="action-icon">🏛️</span>
            <span>Explore Clubs</span>
          </Link>
          <Link to="/profile" className="action-card">
            <span className="action-icon">👤</span>
            <span>My Profile</span>
          </Link>
          <Link to="/preferences" className="action-card">
            <span className="action-icon">⚙️</span>
            <span>Preferences</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ParticipantDashboard;
