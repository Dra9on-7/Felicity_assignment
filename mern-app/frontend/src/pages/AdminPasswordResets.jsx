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

  const handleGeneratePassword = async (organizerId) => {
    try {
      const response = await adminAPI.generatePassword();
      const generatedPassword = response.data.password;
      setResetPasswords(prev => ({ ...prev, [organizerId]: generatedPassword }));
    } catch (err) {
      alert('Failed to generate password');
    }
  };

  const handleResetPassword = async (organizerId) => {
    const newPassword = resetPasswords[organizerId];
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters. Use "Generate" to auto-create one.');
      return;
    }

    try {
      setProcessingId(organizerId);
      const response = await adminAPI.resetOrganizerPassword(organizerId, newPassword);
      const msg = response.data.generatedPassword 
        ? `Password reset successfully! Generated password: ${response.data.generatedPassword}` 
        : 'Password reset successfully!';
      alert(msg);
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

  const handleAutoResetPassword = async (organizerId) => {
    if (!window.confirm('Auto-generate a new password and reset?')) return;
    try {
      setProcessingId(organizerId);
      // Pass empty to trigger auto-generation on backend
      const response = await adminAPI.resetOrganizerPassword(organizerId, '');
      const generatedPwd = response.data.generatedPassword;
      alert(`Password reset successfully!\n\nNew password: ${generatedPwd}\n\nPlease share this with the organizer.`);
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
                <th>Actions</th>
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
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="Enter or generate"
                          value={resetPasswords[orgId] || ''}
                          onChange={(e) => handlePasswordChange(orgId, e.target.value)}
                          className="inline-input"
                          style={{ flex: 1, fontFamily: resetPasswords[orgId] ? 'monospace' : 'inherit' }}
                        />
                        <button
                          className="btn-sm btn-secondary"
                          onClick={() => handleGeneratePassword(orgId)}
                          title="Auto-generate a secure password"
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          🔄 Generate
                        </button>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="btn-sm btn-primary"
                          onClick={() => handleResetPassword(orgId)}
                          disabled={processingId === orgId}
                        >
                          {processingId === orgId ? 'Resetting...' : 'Reset'}
                        </button>
                        <button
                          className="btn-sm btn-secondary"
                          onClick={() => handleAutoResetPassword(orgId)}
                          disabled={processingId === orgId}
                          title="Auto-generate and reset in one step"
                        >
                          ⚡ Auto
                        </button>
                      </div>
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
