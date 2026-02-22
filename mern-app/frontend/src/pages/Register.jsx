import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import '../styles/Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    collegeName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captcha, setCaptcha] = useState({ captchaId: '', question: '' });
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const fetchCaptcha = async () => {
    try {
      const res = await authAPI.getCaptcha();
      setCaptcha(res.data.data);
      setCaptchaAnswer('');
    } catch (err) {
      console.error('Failed to fetch captcha:', err);
    }
  };

  useEffect(() => {
    fetchCaptcha();
  }, []);

  // Check if email is IIIT email (includes students, faculty, research, staff)
  const isIIITEmail = (email) => {
    return email.endsWith('@iiit.ac.in') || 
           email.endsWith('@students.iiit.ac.in') || 
           email.endsWith('@faculty.iiit.ac.in') || 
           email.endsWith('@research.iiit.ac.in');
  };

  const participantType = isIIITEmail(formData.email) ? 'IIIT' : 'Non-IIIT';

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (!captchaAnswer) {
      setError('Please answer the CAPTCHA');
      setLoading(false);
      return;
    }

    const userData = {
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phoneNumber: formData.phoneNumber,
      collegeName: participantType === 'Non-IIIT' ? formData.collegeName : 'IIIT Hyderabad',
      participantType,
      role: 'participant',
      captchaId: captcha.captchaId,
      captchaAnswer,
    };

    const result = await register(userData);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
      // Refresh captcha on failure
      fetchCaptcha();
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card register-card">
        <div className="auth-header">
          <h1>Join Felicity</h1>
          <p>Create your participant account</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="First name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Last name"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
            <small className="form-hint">
              {participantType === 'IIIT' 
                ? '✓ IIIT email detected' 
                : 'Use @iiit.ac.in or @students.iiit.ac.in for IIIT student registration'}
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="phoneNumber">Phone Number</label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="Enter your phone number"
              required
            />
          </div>

          {participantType === 'Non-IIIT' && (
            <div className="form-group">
              <label htmlFor="collegeName">College Name</label>
              <input
                type="text"
                id="collegeName"
                name="collegeName"
                value={formData.collegeName}
                onChange={handleChange}
                placeholder="Enter your college name"
                required
              />
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                minLength={6}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                required
              />
            </div>
          </div>

          <div className="participant-type-badge">
            Registering as: <strong>{participantType} Participant</strong>
          </div>

          <div className="form-group captcha-group">
            <label>CAPTCHA: <strong>{captcha.question}</strong></label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                placeholder="Your answer"
                required
                style={{ flex: 1 }}
              />
              <button type="button" onClick={fetchCaptcha} className="captcha-refresh-btn" title="New CAPTCHA">
                ↻
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="auth-btn"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
