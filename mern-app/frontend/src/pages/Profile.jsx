import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { participantAPI } from '../services/api';
import { EVENT_CATEGORIES } from '../utils/constants';
import '../styles/Dashboard.css';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    collegeName: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [preferences, setPreferences] = useState({
    areasOfInterest: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('profile');
  const [followedClubs, setFollowedClubs] = useState([]);
  const [loadingClubs, setLoadingClubs] = useState(false);

  const interestOptions = EVENT_CATEGORIES.filter(cat => cat !== 'General' && cat !== 'Other');

  useEffect(() => {
    fetchProfileData();
    fetchFollowedClubs();
  }, []);

  const fetchFollowedClubs = async () => {
    try {
      setLoadingClubs(true);
      const res = await participantAPI.getFollowedClubs();
      setFollowedClubs(res.data.data || []);
    } catch (err) {
      console.error('Error fetching followed clubs:', err);
    } finally {
      setLoadingClubs(false);
    }
  };

  const handleUnfollow = async (organizerId) => {
    try {
      await participantAPI.unfollowClub(organizerId);
      setFollowedClubs(prev => prev.filter(c => c._id !== organizerId));
      setMessage({ type: 'success', text: 'Unfollowed successfully' });
    } catch (err) {
      console.error('Error unfollowing club:', err);
      setMessage({ type: 'error', text: 'Failed to unfollow club' });
    }
  };

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const [profileRes, preferencesRes] = await Promise.all([
        participantAPI.getProfile(),
        participantAPI.getPreferences(),
      ]);

      const profile = profileRes.data.data?.participant || profileRes.data.data;
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phoneNumber: profile.phoneNumber || '',
        collegeName: profile.collegeName || '',
      });

      const prefs = preferencesRes.data.data || {};
      setPreferences({
        areasOfInterest: prefs.areasOfInterest || [],
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      setMessage({ type: 'error', text: 'Failed to load profile data' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleInterestToggle = (interest) => {
    setPreferences(prev => ({
      ...prev,
      areasOfInterest: prev.areasOfInterest.includes(interest)
        ? prev.areasOfInterest.filter(i => i !== interest)
        : [...prev.areasOfInterest, interest],
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });

      await participantAPI.updateProfile(formData);
      
      // Update preferences
      await participantAPI.updatePreferences(preferences);

      // Update auth context
      if (updateUser) {
        updateUser({ ...user, ...formData });
      }

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      console.error('Error updating profile:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    try {
      setSavingPassword(true);
      setMessage({ type: '', text: '' });

      await participantAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      setMessage({ type: 'success', text: 'Password changed successfully!' });
    } catch (err) {
      console.error('Error changing password:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to change password' });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>My Profile</h1>
        <p>Manage your account settings and preferences</p>
      </div>

      {message.text && (
        <div className={`alert-banner ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="profile-tabs">
        <button 
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile Details
        </button>
        <button 
          className={`tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          Interests
        </button>
        <button 
          className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          Security
        </button>
        <button 
          className={`tab-btn ${activeTab === 'following' ? 'active' : ''}`}
          onClick={() => setActiveTab('following')}
        >
          Following ({followedClubs.length})
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className="dashboard-section">
          <form onSubmit={handleProfileSubmit} className="profile-form">
            <div className="form-section">
              <h3>Personal Information</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email (Non-editable)</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="disabled-input"
                />
                <small className="form-hint">Email cannot be changed</small>
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="Enter your phone number"
                />
              </div>

              <div className="form-group">
                <label>Participant Type (Non-editable)</label>
                <input
                  type="text"
                  value={user?.participantType || ''}
                  disabled
                  className="disabled-input"
                />
              </div>

              {user?.participantType === 'Non-IIIT' && (
                <div className="form-group">
                  <label>College/Organization Name</label>
                  <input
                    type="text"
                    name="collegeName"
                    value={formData.collegeName}
                    onChange={handleInputChange}
                    placeholder="Enter your college name"
                  />
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'preferences' && (
        <div className="dashboard-section">
          <form onSubmit={handleProfileSubmit} className="profile-form">
            <div className="form-section">
              <h3>Areas of Interest</h3>
              <p className="form-hint">Select your interests to get personalized event recommendations</p>
              
              <div className="interest-grid">
                {interestOptions.map(interest => (
                  <label key={interest} className="interest-item">
                    <input
                      type="checkbox"
                      checked={preferences.areasOfInterest.includes(interest)}
                      onChange={() => handleInterestToggle(interest)}
                    />
                    <span>{interest}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="dashboard-section">
          <form onSubmit={handlePasswordSubmit} className="profile-form">
            <div className="form-section">
              <h3>Change Password</h3>
              
              <div className="form-group">
                <label>Current Password *</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>New Password *</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  required
                  minLength={6}
                />
                <small className="form-hint">Minimum 6 characters</small>
              </div>

              <div className="form-group">
                <label>Confirm New Password *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={savingPassword}>
                {savingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'following' && (
        <div className="dashboard-section">
          <div className="form-section">
            <h3>Clubs & Organizers You Follow</h3>
            <p className="form-hint">You'll receive notifications about events from these clubs</p>
            
            {loadingClubs ? (
              <div className="loading">Loading followed clubs...</div>
            ) : followedClubs.length === 0 ? (
              <div className="empty-state">
                <p>You haven't followed any clubs yet.</p>
                <p className="form-hint">Browse events and follow clubs to stay updated!</p>
              </div>
            ) : (
              <div className="followed-clubs-list">
                {followedClubs.map(club => (
                  <div key={club._id} className="followed-club-card">
                    <div className="club-info">
                      <h4>{club.organizerName || club.clubName || club.name || 'Unknown Club'}</h4>
                      {club.organizerType && <span className="club-type-badge">{club.organizerType}</span>}
                      {club.email && <small className="club-email">{club.email}</small>}
                    </div>
                    <button 
                      className="btn-danger btn-sm"
                      onClick={() => handleUnfollow(club._id)}
                    >
                      Unfollow
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
