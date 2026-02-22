import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import '../styles/Dashboard.css';

const AdminPasswordResets = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resetPasswords, setResetPasswords] = useState({});
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchResetRequests();
  }, []);

  const fetchResetRequests = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getPasswordResetRequests();
      setRequests(response.data.requests || response.data.data?.requests || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load password reset requests');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (organizerId, value) => {
    setResetPasswords(prev => ({ ...prev, [organizerId]: value }));
  };

  const handleResetPassword = async (organizerId) => {
    const newPassword = resetPasswords[organizerId];
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    try {
      setProcessingId(organizerId);
      await adminAPI.resetOrganizerPassword(organizerId, newPassword);
      alert('Password reset successfully!');
      setResetPasswords(prev => {
        const next = { ...prev };
        delete next[organizerId];
        return next;
      });
      fetchResetRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div className="loading">Loading password reset requests...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <h1>Password Reset Requests</h1>
        <p>Review and fulfill organizer password reset requests</p>
      </div>

      {requests.length === 0 ? (
        <div className="empty-state">
          <h3>No pending requests</h3>
          <p>There are no password reset requests at this time.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Organizer Name</th>
                <th>Email</th>
                <th>Requested At</th>
                <th>New Password</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => {
                const orgId = req._id || req.organizerId;
                return (
                  <tr key={orgId}>
                    <td>{req.organizerName || req.clubName || req.name || 'N/A'}</td>
                    <td>{req.contactEmail || req.email || 'N/A'}</td>
                    <td>
                      {req.passwordResetRequestedAt 
                        ? new Date(req.passwordResetRequestedAt).toLocaleString() 
                        : 'N/A'}
                    </td>
                    <td>
                      <input
                        type="password"
                        placeholder="Enter new password"
                        value={resetPasswords[orgId] || ''}
                        onChange={(e) => handlePasswordChange(orgId, e.target.value)}
                        className="inline-input"
                      />
                    </td>
                    <td>
                      <button
                        className="btn-sm btn-primary"
                        onClick={() => handleResetPassword(orgId)}
                        disabled={processingId === orgId}
                      >
                        {processingId === orgId ? 'Resetting...' : 'Reset Password'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminPasswordResets;
