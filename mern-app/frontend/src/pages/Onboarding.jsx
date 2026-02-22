import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { participantAPI, eventAPI } from '../services/api';
import { INTEREST_OPTIONS } from '../utils/constants';
import '../styles/Dashboard.css';

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [selectedClubs, setSelectedClubs] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const interestOptions = INTEREST_OPTIONS;

  useEffect(() => {
    fetchClubs();
  }, []);

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

  const handleInterestToggle = (interestId) => {
    setSelectedInterests(prev =>
      prev.includes(interestId)
        ? prev.filter(i => i !== interestId)
        : [...prev, interestId]
    );
  };

  const handleClubToggle = (clubId) => {
    setSelectedClubs(prev =>
      prev.includes(clubId)
        ? prev.filter(c => c !== clubId)
        : [...prev, clubId]
    );
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  const handleNext = () => {
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleComplete = async () => {
    try {
      setSaving(true);

      // Save interests
      const interestNames = selectedInterests.map(id => 
        interestOptions.find(opt => opt.id === id)?.name || id
      );
      await participantAPI.updatePreferences({ areasOfInterest: interestNames });

      // Follow selected clubs
      for (const clubId of selectedClubs) {
        try {
          await participantAPI.followClub(clubId);
        } catch (err) {
          // Ignore if already following
          console.log(`Could not follow club ${clubId}:`, err.message);
        }
      }

      navigate('/dashboard');
    } catch (err) {
      console.error('Error saving preferences:', err);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="onboarding-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        <div className="onboarding-header">
          <h1>Welcome to Felicity! 🎉</h1>
          <p>Let's personalize your experience</p>
          <div className="step-indicator">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>1</div>
            <div className="step-line"></div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>2</div>
          </div>
        </div>

        {step === 1 && (
          <div className="onboarding-step">
            <h2>What are you interested in?</h2>
            <p className="step-description">
              Select your areas of interest to get personalized event recommendations
            </p>

            <div className="interest-selection-grid">
              {interestOptions.map(interest => (
                <button
                  key={interest.id}
                  className={`interest-card ${selectedInterests.includes(interest.id) ? 'selected' : ''}`}
                  onClick={() => handleInterestToggle(interest.id)}
                >
                  <span className="interest-icon">{interest.icon}</span>
                  <span className="interest-name">{interest.name}</span>
                </button>
              ))}
            </div>

            <div className="onboarding-actions">
              <button onClick={handleSkip} className="btn-secondary">
                Skip for now
              </button>
              <button onClick={handleNext} className="btn-primary">
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step">
            <h2>Follow Clubs & Councils</h2>
            <p className="step-description">
              Stay updated with events from clubs you're interested in
            </p>

            {clubs.length > 0 ? (
              <div className="clubs-selection-grid">
                {clubs.map(club => (
                  <button
                    key={club._id}
                    className={`club-card ${selectedClubs.includes(club._id) ? 'selected' : ''}`}
                    onClick={() => handleClubToggle(club._id)}
                  >
                    <div className="club-avatar">
                      {(club.clubName || club.councilName || club.name || 'C')[0]}
                    </div>
                    <div className="club-info">
                      <span className="club-name">
                        {club.clubName || club.councilName || club.name}
                      </span>
                      {club.category && (
                        <span className="club-category">{club.category}</span>
                      )}
                    </div>
                    {selectedClubs.includes(club._id) && (
                      <span className="selected-check">✓</span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-message">No clubs available yet</p>
            )}

            <div className="onboarding-actions">
              <button onClick={handleBack} className="btn-secondary">
                Back
              </button>
              <button onClick={handleSkip} className="btn-secondary">
                Skip
              </button>
              <button 
                onClick={handleComplete} 
                className="btn-primary"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Complete Setup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
