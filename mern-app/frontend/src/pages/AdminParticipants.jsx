import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import '../styles/Dashboard.css';

const AdminParticipants = () => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchParticipants();
  }, []);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllParticipants();
      setParticipants(response.data.participants);
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to fetch participants' 
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredParticipants = participants.filter(p => {
    const matchesSearch = 
      p.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.contactNumber?.includes(searchTerm);
    
    const matchesFilter = filterType === 'all' || p.participantType === filterType;
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading participants...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Participant Management</h1>
        <p>View and manage all registered participants</p>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} className="close-btn">×</button>
        </div>
      )}

      <div className="page-controls">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by name, email, or contact..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Filter by Type:</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">All Participants</option>
            <option value="IIIT">IIIT Students</option>
            <option value="Non-IIIT">Non-IIIT</option>
          </select>
        </div>

        <div className="stats-summary">
          <span className="stat-badge">{filteredParticipants.length} of {participants.length} participants</span>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Contact</th>
              <th>Type</th>
              <th>Organization</th>
              <th>Registered</th>
              <th>Interests</th>
            </tr>
          </thead>
          <tbody>
            {filteredParticipants.length > 0 ? (
              filteredParticipants.map(participant => (
                <tr key={participant._id}>
                  <td>
                    <div className="user-info">
                      <strong>{participant.firstName} {participant.lastName}</strong>
                    </div>
                  </td>
                  <td>{participant.email}</td>
                  <td>{participant.contactNumber || 'N/A'}</td>
                  <td>
                    <span className={`badge ${participant.participantType === 'IIIT' ? 'success' : 'warning'}`}>
                      {participant.participantType}
                    </span>
                  </td>
                  <td>{participant.OrgName || 'IIIT Hyderabad'}</td>
                  <td>
                    {new Date(participant.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td>
                    <span className="interest-count">
                      {participant.interests?.length || 0} interests
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="no-data">
                  {searchTerm || filterType !== 'all' 
                    ? 'No participants match your filters' 
                    : 'No participants registered yet'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <p>Total Participants: {participants.length}</p>
        <div className="footer-stats">
          <span>IIIT: {participants.filter(p => p.participantType === 'IIIT').length}</span>
          <span>Non-IIIT: {participants.filter(p => p.participantType === 'Non-IIIT').length}</span>
        </div>
      </div>
    </div>
  );
};

export default AdminParticipants;
