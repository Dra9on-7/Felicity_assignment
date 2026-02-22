import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { eventAPI, participantAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import DiscussionForum from '../components/DiscussionForum';
import '../styles/Events.css';

const EventDetails = () => {
  const { eventId } = useParams();
  const { user, isAuthenticated, isParticipant } = useAuth();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Merchandise state
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [paymentFile, setPaymentFile] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const response = await eventAPI.getEventDetails(eventId);
      setEvent(response.data.data);
    } catch (err) {
      setError('Failed to load event details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/events/${eventId}` } });
      return;
    }

    if (!isParticipant) {
      setError('Only participants can register for events');
      return;
    }

    try {
      setRegistering(true);
      setError('');

      const registrationData = {};
      
      if (event.eventType === 'merchandise') {
        if (!selectedVariant) {
          setError('Please select a variant');
          return;
        }
        registrationData.merchandiseItemId = selectedVariant._id;
        registrationData.quantity = quantity;
      }

      await participantAPI.registerForEvent(eventId, registrationData);
      setSuccess('Successfully registered for the event!');
      fetchEventDetails(); // Refresh to update registration status
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register');
    } finally {
      setRegistering(false);
    }
  };

  const handleCancelRegistration = async () => {
    try {
      setRegistering(true);
      await participantAPI.cancelRegistration(eventId);
      setSuccess('Registration cancelled');
      fetchEventDetails();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel registration');
    } finally {
      setRegistering(false);
    }
  };

  const handleUploadPaymentProof = async () => {
    if (!paymentFile || !event?.registrationId) return;
    try {
      setUploadingProof(true);
      setError('');
      const formData = new FormData();
      formData.append('paymentProof', paymentFile);
      await participantAPI.uploadPaymentProof(event.registrationId, formData);
      setSuccess('Payment proof uploaded! Awaiting organizer approval.');
      setPaymentFile(null);
      fetchEventDetails();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload payment proof');
    } finally {
      setUploadingProof(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="event-details-container">
        <div className="loading">Loading event details...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="event-details-container">
        <div className="error-message">Event not found</div>
        <Link to="/events" className="back-link">Back to Events</Link>
      </div>
    );
  }

  return (
    <div className="event-details-container">
      <div className="event-details-header">
        <Link to="/events" className="back-link">← Back to Events</Link>
        
        <div className="event-badges">
          <span className={`event-type-badge ${event.eventType}`}>
            {event.eventType}
          </span>
          <span className="category-badge">{event.category}</span>
        </div>
      </div>

      <div className="event-details-content">
        <div className="event-main">
          {event.image && (
            <img src={event.image} alt={event.name} className="event-image" />
          )}
          
          <h1>{event.name}</h1>
          
          <div className="event-organizer">
            <Link to={`/clubs/${event.organizer._id}`}>
              {event.organizer.clubName || event.organizer.councilName || event.organizer.name}
            </Link>
          </div>

          <div className="event-description">
            <h3>About</h3>
            <p>{event.description}</p>
          </div>

          {event.tags?.length > 0 && (
            <div className="event-tags">
              {event.tags.map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          )}
        </div>

        <div className="event-sidebar">
          <div className="event-info-card">
            <h3>Event Details</h3>
            
            <div className="info-item">
              <span className="info-label">📅 Start</span>
              <span className="info-value">{formatDate(event.startDateTime)}</span>
            </div>
            
            <div className="info-item">
              <span className="info-label">📅 End</span>
              <span className="info-value">{formatDate(event.endDateTime)}</span>
            </div>
            
            {event.venue && (
              <div className="info-item">
                <span className="info-label">📍 Venue</span>
                <span className="info-value">{event.venue}</span>
              </div>
            )}
            
            <div className="info-item">
              <span className="info-label">👥 Registrations</span>
              <span className="info-value">
                {event.registrationCount}
                {event.maxParticipants && ` / ${event.maxParticipants}`}
              </span>
            </div>

            {event.spotsRemaining !== null && event.spotsRemaining <= 10 && (
              <div className="spots-warning">
                Only {event.spotsRemaining} spots left!
              </div>
            )}
          </div>

          {event.eventType === 'merchandise' && event.merchandiseItems?.length > 0 && (
            <div className="merchandise-card">
              <h3>Select Item</h3>
              
              <div className="variants-list">
                {event.merchandiseItems.map(item => (
                  <div 
                    key={item._id}
                    className={`variant-option ${selectedVariant?._id === item._id ? 'selected' : ''}`}
                    onClick={() => setSelectedVariant(item)}
                  >
                    <span className="variant-name">{item.name}</span>
                    {item.size && <span className="variant-size">Size: {item.size}</span>}
                    <span className="variant-price">₹{item.price}</span>
                    <span className="variant-stock">
                      {item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
                    </span>
                  </div>
                ))}
              </div>

              {selectedVariant && (
                <div className="quantity-selector">
                  <label>Quantity:</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedVariant.stock}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
              )}
            </div>
          )}

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="registration-actions">
            {event.isRegistered ? (
              <>
                <div className="registered-badge">✓ You're registered!</div>

                {/* Payment status for merchandise events */}
                {event.paymentStatus && event.paymentStatus !== 'not_required' && (
                  <div style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    marginBottom: '0.5rem',
                    backgroundColor: event.paymentStatus === 'approved' ? '#dcfce7' 
                      : event.paymentStatus === 'rejected' ? '#fee2e2' : '#fef3c7',
                    border: `1px solid ${event.paymentStatus === 'approved' ? '#86efac' 
                      : event.paymentStatus === 'rejected' ? '#fca5a5' : '#fde68a'}`,
                    fontSize: '0.85rem',
                  }}>
                    {event.paymentStatus === 'pending_approval' && '⏳ Payment pending approval'}
                    {event.paymentStatus === 'approved' && '✅ Payment approved — QR code issued'}
                    {event.paymentStatus === 'rejected' && (
                      <>❌ Payment rejected{event.paymentRejectionReason && `: ${event.paymentRejectionReason}`}</>
                    )}
                  </div>
                )}

                {/* Payment proof upload for pending/rejected merchandise */}
                {event.paymentStatus && (event.paymentStatus === 'pending_approval' || event.paymentStatus === 'rejected') && (
                  <div style={{
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    marginBottom: '0.5rem',
                  }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                      📸 Upload Payment Proof
                    </div>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setPaymentFile(e.target.files[0])}
                      style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}
                    />
                    {paymentFile && (
                      <button
                        onClick={handleUploadPaymentProof}
                        disabled={uploadingProof}
                        style={{
                          padding: '0.4rem 0.8rem',
                          backgroundColor: '#667eea',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                        }}
                      >
                        {uploadingProof ? 'Uploading...' : 'Upload Proof'}
                      </button>
                    )}
                  </div>
                )}

                {/* QR Code display */}
                {event.qrCode && (
                  <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                    <img src={event.qrCode} alt="Registration QR Code" style={{ maxWidth: '150px', borderRadius: '8px' }} />
                    <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Show this at the venue</p>
                  </div>
                )}

                <button 
                  onClick={handleCancelRegistration}
                  disabled={registering}
                  className="cancel-btn"
                >
                  {registering ? 'Cancelling...' : 'Cancel Registration'}
                </button>
              </>
            ) : (
              <button 
                onClick={handleRegister}
                disabled={registering || (event.spotsRemaining !== null && event.spotsRemaining <= 0)}
                className="register-btn"
              >
                {registering ? 'Registering...' : 'Register Now'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Discussion Forum */}
      {isAuthenticated && (event.status === 'published' || event.status === 'ongoing') && (
        <div style={{ marginTop: '2rem' }}>
          <DiscussionForum eventId={eventId} isOrganizer={false} />
        </div>
      )}
    </div>
  );
};

export default EventDetails;
