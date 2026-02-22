import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { organizerAPI } from '../services/api';
import { EVENT_CATEGORIES } from '../utils/constants';
import '../styles/Dashboard.css';

const OrganizerProfile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [profileData, setProfileData] = useState({
    clubName: '',
    councilName: '',
    description: '',
    contactEmail: '',
    category: '',
    socialLinks: {
      website: '',
      instagram: '',
      twitter: '',
      linkedin: '',
      discord: ''
    }
  });

  const [webhookData, setWebhookData] = useState({
    discordWebhookUrl: '',
    notifyOnRegistration: true,
    notifyOnCancellation: true,
    notifyOnEventStart: true
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const categories = EVENT_CATEGORIES;

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await organizerAPI.getProfile();
      const data = response.data.data;
      
      setProfileData({
        clubName: data.clubName || '',
        councilName: data.councilName || '',
        description: data.description || '',
        contactEmail: data.contactEmail || data.email || '',
        category: data.category || '',
        socialLinks: {
          website: data.socialLinks?.website || '',
          instagram: data.socialLinks?.instagram || '',
          twitter: data.socialLinks?.twitter || '',
          linkedin: data.socialLinks?.linkedin || '',
          discord: data.socialLinks?.discord || ''
        }
      });

      setWebhookData({
        discordWebhookUrl: data.discordWebhookUrl || '',
        notifyOnRegistration: data.notifyOnRegistration !== false,
        notifyOnCancellation: data.notifyOnCancellation !== false,
        notifyOnEventStart: data.notifyOnEventStart !== false
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      setMessage({ type: 'error', text: 'Failed to load profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('social_')) {
      const socialKey = name.replace('social_', '');
      setProfileData(prev => ({
        ...prev,
        socialLinks: {
          ...prev.socialLinks,
          [socialKey]: value
        }
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleWebhookChange = (e) => {
    const { name, value, type, checked } = e.target;
    setWebhookData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await organizerAPI.updateProfile(profileData);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to update profile' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWebhook = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await organizerAPI.updateWebhookSettings(webhookData);
      setMessage({ type: 'success', text: 'Webhook settings saved!' });
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to save webhook settings' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookData.discordWebhookUrl) {
      setMessage({ type: 'error', text: 'Please enter a webhook URL first' });
      return;
    }

    try {
      setSaving(true);
      await organizerAPI.testWebhook(webhookData.discordWebhookUrl);
      setMessage({ type: 'success', text: 'Test message sent to Discord!' });
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to send test message. Check your webhook URL.' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
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
      setSaving(true);
      await organizerAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to change password' 
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="organizer-profile-container">
        <div className="loading">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="organizer-profile-container">
      <div className="page-header">
        <h1>Organization Profile</h1>
        <p>Manage your club/council profile and settings</p>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })}>✕</button>
        </div>
      )}

      <div className="profile-tabs">
        <button 
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile Info
        </button>
        <button 
          className={`tab-btn ${activeTab === 'webhook' ? 'active' : ''}`}
          onClick={() => setActiveTab('webhook')}
        >
          Discord Webhook
        </button>
        <button 
          className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          Security
        </button>
      </div>

      <div className="profile-content">
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="profile-form">
            <div className="form-section">
              <h3>Basic Information</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Club Name</label>
                  <input
                    type="text"
                    name="clubName"
                    value={profileData.clubName}
                    onChange={handleProfileChange}
                    placeholder="e.g., Programming Club"
                  />
                </div>

                <div className="form-group">
                  <label>Council Name</label>
                  <input
                    type="text"
                    name="councilName"
                    value={profileData.councilName}
                    onChange={handleProfileChange}
                    placeholder="e.g., Technical Council"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    name="category"
                    value={profileData.category}
                    onChange={handleProfileChange}
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Contact Email</label>
                  <input
                    type="email"
                    name="contactEmail"
                    value={profileData.contactEmail}
                    onChange={handleProfileChange}
                    placeholder="club@iiit.ac.in"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={profileData.description}
                  onChange={handleProfileChange}
                  placeholder="Tell participants about your club/council..."
                  rows={4}
                />
              </div>
            </div>

            <div className="form-section">
              <h3>Social Links</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Website</label>
                  <input
                    type="url"
                    name="social_website"
                    value={profileData.socialLinks.website}
                    onChange={handleProfileChange}
                    placeholder="https://yourclub.com"
                  />
                </div>

                <div className="form-group">
                  <label>Instagram</label>
                  <input
                    type="text"
                    name="social_instagram"
                    value={profileData.socialLinks.instagram}
                    onChange={handleProfileChange}
                    placeholder="@yourclub"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Twitter/X</label>
                  <input
                    type="text"
                    name="social_twitter"
                    value={profileData.socialLinks.twitter}
                    onChange={handleProfileChange}
                    placeholder="@yourclub"
                  />
                </div>

                <div className="form-group">
                  <label>LinkedIn</label>
                  <input
                    type="url"
                    name="social_linkedin"
                    value={profileData.socialLinks.linkedin}
                    onChange={handleProfileChange}
                    placeholder="https://linkedin.com/company/..."
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Discord Server</label>
                <input
                  type="url"
                  name="social_discord"
                  value={profileData.socialLinks.discord}
                  onChange={handleProfileChange}
                  placeholder="https://discord.gg/..."
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'webhook' && (
          <form onSubmit={handleSaveWebhook} className="profile-form">
            <div className="form-section">
              <h3>Discord Webhook Integration</h3>
              <p className="section-description">
                Connect your Discord server to receive notifications about event registrations and updates.
              </p>

              <div className="form-group">
                <label>Discord Webhook URL</label>
                <input
                  type="url"
                  name="discordWebhookUrl"
                  value={webhookData.discordWebhookUrl}
                  onChange={handleWebhookChange}
                  placeholder="https://discord.com/api/webhooks/..."
                />
                <small className="help-text">
                  Create a webhook in your Discord server: Server Settings → Integrations → Webhooks
                </small>
              </div>

              <div className="form-group">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={handleTestWebhook}
                  disabled={saving || !webhookData.discordWebhookUrl}
                >
                  🔔 Send Test Message
                </button>
              </div>
            </div>

            <div className="form-section">
              <h3>Notification Preferences</h3>
              
              <div className="checkbox-list">
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    name="notifyOnRegistration"
                    checked={webhookData.notifyOnRegistration}
                    onChange={handleWebhookChange}
                  />
                  <span>Notify when someone registers for an event</span>
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    name="notifyOnCancellation"
                    checked={webhookData.notifyOnCancellation}
                    onChange={handleWebhookChange}
                  />
                  <span>Notify when someone cancels their registration</span>
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    name="notifyOnEventStart"
                    checked={webhookData.notifyOnEventStart}
                    onChange={handleWebhookChange}
                  />
                  <span>Remind me before event starts</span>
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Webhook Settings'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'security' && (
          <form onSubmit={handleChangePassword} className="profile-form">
            <div className="form-section">
              <h3>Change Password</h3>
              
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter current password"
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter new password"
                />
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default OrganizerProfile;
