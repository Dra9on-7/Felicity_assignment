import { useState, useEffect, useCallback } from 'react';
import { organizerAPI } from '../services/api';
import QRScanner from '../components/QRScanner';

/**
 * Attendance Dashboard Page (Tier A Feature)
 * QR Scanner & live attendance tracking for organizers
 */
const AttendanceDashboard = ({ eventId }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState('');
  const [showScanner, setShowScanner] = useState(true);
  const [lastScannedId, setLastScannedId] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await organizerAPI.getAttendanceStats(eventId);
      setStats(res.data.data);
    } catch (err) {
      console.error('Error fetching attendance stats:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchStats();
    // Refresh stats every 10 seconds
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const handleQRScan = async (decodedText) => {
    // Prevent duplicate rapid scans
    if (decodedText === lastScannedId) return;
    setLastScannedId(decodedText);

    try {
      setScanError('');
      setScanResult(null);
      const res = await organizerAPI.markAttendance(eventId, decodedText);
      setScanResult({
        success: true,
        message: res.data.message,
        participant: res.data.data.participant,
      });
      fetchStats(); // Refresh stats
    } catch (err) {
      const data = err.response?.data;
      if (data?.data?.duplicate) {
        setScanResult({
          success: false,
          duplicate: true,
          message: data.message,
          participant: data.data.participant,
        });
      } else {
        setScanError(data?.message || 'Failed to mark attendance');
      }
    }

    // Reset last scanned after 3 seconds
    setTimeout(() => setLastScannedId(null), 3000);
  };

  const handleManualAttendance = async (registrationId) => {
    try {
      await organizerAPI.manualAttendance(eventId, registrationId);
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark attendance');
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await organizerAPI.exportAttendanceCSV(eventId);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${eventId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to export CSV');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading attendance data...</div>;
  }

  return (
    <div>
      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{ backgroundColor: '#eef2ff', padding: '1rem', borderRadius: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#4f46e5' }}>{stats?.total || 0}</div>
          <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Total Registered</div>
        </div>
        <div style={{ backgroundColor: '#dcfce7', padding: '1rem', borderRadius: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#16a34a' }}>{stats?.attended || 0}</div>
          <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Checked In</div>
        </div>
        <div style={{ backgroundColor: '#fef3c7', padding: '1rem', borderRadius: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#d97706' }}>{stats?.notAttended || 0}</div>
          <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Not Yet</div>
        </div>
        <div style={{ backgroundColor: '#f3e8ff', padding: '1rem', borderRadius: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#7c3aed' }}>{stats?.attendanceRate || 0}%</div>
          <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Attendance Rate</div>
        </div>
      </div>

      {/* QR Scanner Section */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        padding: '1.5rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>📷 QR Code Scanner</h3>
          <button
            onClick={() => setShowScanner(!showScanner)}
            style={{
              padding: '0.4rem 0.8rem',
              backgroundColor: showScanner ? '#ef4444' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            {showScanner ? 'Hide Scanner' : 'Show Scanner'}
          </button>
        </div>

        {showScanner && <QRScanner onScan={handleQRScan} />}

        {/* Scan Result */}
        {scanResult && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            borderRadius: '8px',
            backgroundColor: scanResult.success ? '#dcfce7' : scanResult.duplicate ? '#fef3c7' : '#fee2e2',
            border: `1px solid ${scanResult.success ? '#86efac' : scanResult.duplicate ? '#fde68a' : '#fca5a5'}`,
          }}>
            <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
              {scanResult.success ? '✅' : scanResult.duplicate ? '⚠️' : '❌'} {scanResult.message}
            </div>
            {scanResult.participant && (
              <div style={{ fontSize: '0.85rem', color: '#374151' }}>
                {scanResult.participant.firstName} {scanResult.participant.lastName} ({scanResult.participant.email})
              </div>
            )}
          </div>
        )}

        {scanError && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            borderRadius: '8px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            color: '#991b1b',
          }}>
            ❌ {scanError}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button
          onClick={handleExportCSV}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          📥 Export Attendance CSV
        </button>
        <button
          onClick={fetchStats}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Recent Check-ins */}
      {stats?.recentCheckIns?.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3>Recent Check-ins</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {stats.recentCheckIns.map(ci => (
              <div key={ci._id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.5rem 0.75rem',
                backgroundColor: '#f0fdf4',
                borderRadius: '6px',
                border: '1px solid #bbf7d0',
              }}>
                <span>
                  ✅ {ci.participant?.firstName} {ci.participant?.lastName} ({ci.participant?.email})
                </span>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  {ci.attendanceMethod === 'qr_scan' ? '📷' : '✋'} {new Date(ci.attendedAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Participant List with Manual Override */}
      <div>
        <h3>All Participants</h3>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.85rem',
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Email</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Type</th>
              <th style={{ padding: '0.5rem', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '0.5rem', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stats?.registrations?.map(reg => (
              <tr key={reg._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.5rem' }}>
                  {reg.participant?.firstName} {reg.participant?.lastName}
                </td>
                <td style={{ padding: '0.5rem' }}>{reg.participant?.email}</td>
                <td style={{ padding: '0.5rem' }}>{reg.participant?.participantType}</td>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    backgroundColor: reg.status === 'attended' ? '#dcfce7' : '#fef3c7',
                    color: reg.status === 'attended' ? '#16a34a' : '#d97706',
                  }}>
                    {reg.status === 'attended' ? '✅ Attended' : '⏳ Registered'}
                  </span>
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                  {reg.status !== 'attended' && (
                    <button
                      onClick={() => handleManualAttendance(reg._id)}
                      style={{
                        padding: '3px 10px',
                        backgroundColor: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                      }}
                    >
                      ✋ Manual Check-in
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceDashboard;
