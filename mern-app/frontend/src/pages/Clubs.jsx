import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { eventAPI, participantAPI } from '../services/api';
import '../styles/Events.css';

const Clubs = () => {
  const { user, isAuthenticated } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [followedClubs, setFollowedClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingLoading, setFollowingLoading] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    fetchClubs();
    if (isAuthenticated && user?.role === 'participant') {
      fetchFollowedClubs();
    }
  }, [isAuthenticated, user]);

  const fetchClubs = async () => {
    try {
      const response = await eventAPI.getOrganizers();
      setClubs(response.data.data || []);
    } catch (err) {
      console.error('Error fetching clubs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowedClubs = async () => {
    try {
      const response = await participantAPI.getFollowedClubs();
      const followedIds = (response.data.data || []).map(club => club._id);
      setFollowedClubs(followedIds);
    } catch (err) {
      console.error('Error fetching followed clubs:', err);
    }
  };

  const handleFollowToggle = async (clubId) => {
    if (!isAuthenticated) {
      alert('Please login to follow clubs');
      return;
    }

    try {
      setFollowingLoading(prev => ({ ...prev, [clubId]: true }));
      
      if (followedClubs.includes(clubId)) {
        await participantAPI.unfollowClub(clubId);
        setFollowedClubs(prev => prev.filter(id => id !== clubId));
      } else {
        await participantAPI.followClub(clubId);
        setFollowedClubs(prev => [...prev, clubId]);
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
      alert('Failed to update follow status');
    } finally {
      setFollowingLoading(prev => ({ ...prev, [clubId]: false }));
    }
  };

  const categories = [...new Set(clubs.map(club => club.category).filter(Boolean))];

  const filteredClubs = clubs.filter(club => {
    const name = club.clubName || club.councilName || club.name || '';
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (club.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || club.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="clubs-container">
        <div className="loading">Loading clubs...</div>
      </div>
    );
  }

  return (
    <div className="clubs-container">
      <div className="page-header">
        <h1>Clubs & Councils</h1>
        <p>Discover and follow clubs to stay updated with their events</p>
      </div>

      <div className="clubs-filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search clubs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="category-filter">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredClubs.length > 0 ? (
        <div className="clubs-grid">
          {filteredClubs.map(club => {
            const isFollowing = followedClubs.includes(club._id);
            const clubName = club.clubName || club.councilName || club.name || 'Unknown';

            return (
              <div key={club._id} className="club-card">
                <div className="club-avatar-large">
                  {clubName[0].toUpperCase()}
                </div>
                <div className="club-content">
                  <Link to={`/clubs/${club._id}`} className="club-name-link">
                    <h3>{clubName}</h3>
                  </Link>
                  {club.category && (
                    <span className="club-category-badge">{club.category}</span>
                  )}
                  {club.description && (
                    <p className="club-description">
                      {club.description.length > 120 
                        ? `${club.description.substring(0, 120)}...` 
                        : club.description}
                    </p>
                  )}
                  {club.contactEmail && (
                    <p className="club-contact">
                      <span>📧</span> {club.contactEmail}
                    </p>
                  )}
                </div>
                <div className="club-actions">
                  <Link to={`/clubs/${club._id}`} className="btn-secondary">
                    View Events
                  </Link>
                  {isAuthenticated && user?.role === 'participant' && (
                    <button
                      className={`btn-follow ${isFollowing ? 'following' : ''}`}
                      onClick={() => handleFollowToggle(club._id)}
                      disabled={followingLoading[club._id]}
                    >
                      {followingLoading[club._id] 
                        ? '...' 
                        : isFollowing 
                          ? '✓ Following' 
                          : 'Follow'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <h3>No clubs found</h3>
          <p>
            {searchQuery || categoryFilter 
              ? 'Try adjusting your search or filters' 
              : 'No clubs have been added yet'}
          </p>
        </div>
      )}
    </div>
  );
};

export default Clubs;
