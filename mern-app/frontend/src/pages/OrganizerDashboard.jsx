import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { organizerAPI } from '../services/api';
import '../styles/Dashboard.css';

const OrganizerDashboard = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [ongoingEvents, setOngoingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [carouselTab, setCarouselTab] = useState('all');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, ongoingRes] = await Promise.all([
        organizerAPI.getDashboard(),
        organizerAPI.getOngoingEvents(),
      ]);
      
      setEvents(dashboardRes.data.events || []);
      setAnalytics(dashboardRes.data.analytics || {});
      setOngoingEvents(ongoingRes.data.events || []);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getEventName = (event) => event.name || event.eventName || 'Unnamed Event';
  const getStartDate = (event) => event.startDateTime || event.eventStartDate;

  // Carousel filtering
  const filteredEvents = carouselTab === 'all' ? events : events.filter(e => {
    if (carouselTab === 'draft') return e.status === 'draft';
    if (carouselTab === 'published') return e.status === 'published';
    if (carouselTab === 'ongoing') return e.status === 'ongoing';
    if (carouselTab === 'closed') return e.status === 'completed' || e.status === 'cancelled';
    return true;
  });

  const statusCounts = {
    all: events.length,
    draft: events.filter(e => e.status === 'draft').length,
    published: events.filter(e => e.status === 'published').length,
    ongoing: events.filter(e => e.status === 'ongoing').length,
    closed: events.filter(e => e.status === 'completed' || e.status === 'cancelled').length,
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
        <h1>
          {user?.clubName || user?.councilName || user?.organizerName || 'Organizer'} Dashboard
        </h1>
        <p className="organizer-type">
          {user?.organizerType === 'club' ? 'Club' : user?.category || 'Organizer'}
        </p>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>{analytics.totalEvents || 0}</h3>
          <p>Total Events</p>
        </div>
        <div className="stat-card">
          <h3>{analytics.publishedEvents || 0}</h3>
          <p>Published</p>
        </div>
        <div className="stat-card">
          <h3>{analytics.draftEvents || 0}</h3>
          <p>Drafts</p>
        </div>
        <div className="stat-card">
          <h3>{analytics.totalRegistrations || 0}</h3>
          <p>Total Registrations</p>
        </div>
        <div className="stat-card">
          <h3>₹{analytics.totalRevenue || 0}</h3>
          <p>Total Revenue</p>
        </div>
        <div className="stat-card">
          <h3>{analytics.merchandiseSales || 0}</h3>
          <p>Merchandise Sales</p>
        </div>
        <div className="stat-card">
          <h3>{analytics.attendedCount || 0}</h3>
          <p>Total Attendance</p>
        </div>
      </div>

      {ongoingEvents.length > 0 && (
        <div className="dashboard-section">
          <div className="section-header">
            <h2>🔴 Ongoing Events</h2>
          </div>
          
          <div className="events-table-container">
            <table className="events-table">
              <thead>
                <tr>
                  <th>Event Name</th>
                  <th>Type</th>
                  <th>Start Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ongoingEvents.map(event => (
                  <tr key={event._id}>
                    <td>{getEventName(event)}</td>
                    <td>
                      <span className={`event-type-badge ${event.eventType}`}>
                        {event.eventType}
                      </span>
                    </td>
                    <td>{formatDate(getStartDate(event))}</td>
                    <td>
                      <Link 
                        to={`/organizer/events/${event._id}`} 
                        className="action-link"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Events Carousel with Status Tabs */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>Your Events</h2>
          <Link to="/organizer/events/create" className="view-all-link">+ Create New</Link>
        </div>

        <div className="events-tabs" style={{ marginBottom: '16px' }}>
          {['all', 'draft', 'published', 'ongoing', 'closed'].map(tab => (
            <button
              key={tab}
              className={`tab-btn ${carouselTab === tab ? 'active' : ''}`}
              onClick={() => setCarouselTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)} ({statusCounts[tab]})
            </button>
          ))}
        </div>
        
        {filteredEvents.length > 0 ? (
          <div className="events-table-container">
            <table className="events-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map(event => (
                  <tr key={event._id}>
                    <td>{getEventName(event)}</td>
                    <td>
                      <span className={`event-type-badge ${event.eventType}`}>
                        {event.eventType}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${event.status}`}>
                        {event.status}
                      </span>
                    </td>
                    <td>{formatDate(getStartDate(event))}</td>
                    <td>
                      <Link 
                        to={`/organizer/events/${event._id}`} 
                        className="action-link"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-message">
            {carouselTab === 'all' ? 'No events yet. Create your first event!' : `No ${carouselTab} events.`}
          </p>
        )}
      </div>

      <div className="dashboard-section">
        <div className="section-header">
          <h2>Quick Actions</h2>
        </div>
        
        <div className="quick-actions">
          <Link to="/organizer/events/create" className="action-card primary">
            <span className="action-icon">➕</span>
            <span>Create Event</span>
          </Link>
          <Link to="/organizer/ongoing-events" className="action-card">
            <span className="action-icon">🔴</span>
            <span>Ongoing Events</span>
          </Link>
          <Link to="/organizer/profile" className="action-card">
            <span className="action-icon">⚙️</span>
            <span>Profile & Settings</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrganizerDashboard;
