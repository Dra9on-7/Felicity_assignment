import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/Components.css';

const Navbar = () => {
  const { user, isAuthenticated, isParticipant, isOrganizer, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  const getDashboardLink = () => {
    if (isAdmin) return '/admin/dashboard';
    if (isOrganizer) return '/organizer/dashboard';
    return '/dashboard';
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand" onClick={closeMenu}>
          <span className="brand-icon">🎪</span>
          <span className="brand-text">Felicity</span>
        </Link>

        <button className="navbar-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? '✕' : '☰'}
        </button>

        <div className={`navbar-links ${menuOpen ? 'active' : ''}`}>
          {isAuthenticated ? (
            <>
              {/* Participant Nav: Dashboard, Browse Events, Clubs/Organizers, Profile, Logout */}
              {isParticipant && (
                <>
                  <Link to={getDashboardLink()} className="nav-link" onClick={closeMenu}>Dashboard</Link>
                  <Link to="/events" className="nav-link" onClick={closeMenu}>Browse Events</Link>
                  <Link to="/clubs" className="nav-link" onClick={closeMenu}>Clubs/Organizers</Link>
                  <Link to="/my-events" className="nav-link" onClick={closeMenu}>My Events</Link>
                  <Link to="/profile" className="nav-link" onClick={closeMenu}>Profile</Link>
                </>
              )}

              {/* Organizer Nav: Dashboard, Create Event, Profile, Ongoing Events, Logout */}
              {isOrganizer && (
                <>
                  <Link to={getDashboardLink()} className="nav-link" onClick={closeMenu}>Dashboard</Link>
                  <Link to="/organizer/events/create" className="nav-link" onClick={closeMenu}>Create Event</Link>
                  <Link to="/organizer/profile" className="nav-link" onClick={closeMenu}>Profile</Link>
                  <Link to="/organizer/ongoing-events" className="nav-link" onClick={closeMenu}>Ongoing Events</Link>
                </>
              )}

              {/* Admin Nav: Dashboard, Manage Clubs/Organizers, Password Reset Requests, Logout */}
              {isAdmin && (
                <>
                  <Link to={getDashboardLink()} className="nav-link" onClick={closeMenu}>Dashboard</Link>
                  <Link to="/admin/organizers" className="nav-link" onClick={closeMenu}>Manage Clubs/Organizers</Link>
                  <Link to="/admin/password-resets" className="nav-link" onClick={closeMenu}>Password Reset Requests</Link>
                </>
              )}

              <div className="navbar-user">
                <span className="user-name">
                  {user?.firstName || user?.clubName || user?.organizerName || user?.adminName || 'User'}
                </span>
                <span className={`user-role ${user?.role}`}>
                  {user?.role}
                </span>
              </div>

              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/events" className="nav-link" onClick={closeMenu}>Events</Link>
              <Link to="/clubs" className="nav-link" onClick={closeMenu}>Clubs</Link>
              <div className="navbar-auth">
                <Link to="/login" className="nav-link" onClick={closeMenu}>Login</Link>
                <Link to="/register" className="register-btn-nav" onClick={closeMenu}>Register</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
