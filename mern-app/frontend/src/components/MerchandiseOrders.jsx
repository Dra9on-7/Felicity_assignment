import { useState, useEffect } from 'react';
import { organizerAPI } from '../services/api';

const API_HOST = `http://${window.location.hostname}:5000`;

/**
 * Merchandise Orders Component (Tier A Feature)
 * Displays merchandise payment orders for organizer approval/rejection
 */
const MerchandiseOrders = ({ eventId }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, [eventId]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await organizerAPI.getMerchandiseOrders(eventId);
      setOrders(res.data.data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (registrationId) => {
    if (!confirm('Approve this payment? A QR code will be generated for the participant.')) return;
    try {
      await organizerAPI.approvePayment(eventId, registrationId);
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async (registrationId) => {
    try {
      await organizerAPI.rejectPayment(eventId, registrationId, rejectReason);
      setRejectingId(null);
      setRejectReason('');
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject');
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.paymentStatus === filter;
  });

  const statusColors = {
    pending_approval: { bg: '#fef3c7', color: '#92400e', label: '⏳ Pending Approval' },
    approved: { bg: '#dcfce7', color: '#166534', label: '✅ Approved' },
    rejected: { bg: '#fee2e2', color: '#991b1b', label: '❌ Rejected' },
    not_required: { bg: '#f3f4f6', color: '#374151', label: '— N/A' },
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading merchandise orders...</div>;
  }

  return (
    <div>
      {/* Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{ backgroundColor: '#fef3c7', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#92400e' }}>
            {orders.filter(o => o.paymentStatus === 'pending_approval').length}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#92400e' }}>Pending</div>
        </div>
        <div style={{ backgroundColor: '#dcfce7', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#166534' }}>
            {orders.filter(o => o.paymentStatus === 'approved').length}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#166534' }}>Approved</div>
        </div>
        <div style={{ backgroundColor: '#fee2e2', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#991b1b' }}>
            {orders.filter(o => o.paymentStatus === 'rejected').length}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#991b1b' }}>Rejected</div>
        </div>
        <div style={{ backgroundColor: '#eef2ff', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#4f46e5' }}>
            ₹{orders.filter(o => o.paymentStatus === 'approved').reduce((sum, o) => sum + (o.paymentAmount || 0), 0)}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#4f46e5' }}>Revenue</div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {['all', 'pending_approval', 'approved', 'rejected'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '20px',
              border: filter === f ? '2px solid #667eea' : '1px solid #d1d5db',
              backgroundColor: filter === f ? '#eef2ff' : 'white',
              color: filter === f ? '#667eea' : '#374151',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: filter === f ? '600' : '400',
            }}
          >
            {f === 'all' ? 'All' : f === 'pending_approval' ? '⏳ Pending' : f === 'approved' ? '✅ Approved' : '❌ Rejected'}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          No orders found
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredOrders.map(order => {
            const status = statusColors[order.paymentStatus] || statusColors.not_required;
            const participant = order.participant;

            return (
              <div
                key={order._id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  padding: '1rem',
                  backgroundColor: 'white',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: '600' }}>
                      {participant?.firstName} {participant?.lastName}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                      {participant?.email} · {participant?.participantType}
                    </div>
                  </div>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    backgroundColor: status.bg,
                    color: status.color,
                  }}>
                    {status.label}
                  </span>
                </div>

                {/* Merchandise Details */}
                {order.merchandiseDetails && (
                  <div style={{
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    padding: '0.5rem 0.75rem',
                    marginBottom: '0.75rem',
                    fontSize: '0.85rem',
                  }}>
                    <strong>Item:</strong> {order.merchandiseDetails.itemName || order.merchandiseDetails.name || 'N/A'} · 
                    <strong> Qty:</strong> {order.merchandiseDetails.quantity || 1} · 
                    <strong> Amount:</strong> ₹{order.paymentAmount || order.merchandiseDetails.totalAmount || 0}
                  </div>
                )}

                {/* Payment Proof */}
                {order.paymentProofUrl && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem' }}>Payment Proof:</div>
                    {order.paymentProofUrl.endsWith('.pdf') ? (
                      <a
                        href={`${API_HOST}${order.paymentProofUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#667eea' }}
                      >
                        📄 View PDF
                      </a>
                    ) : (
                      <img
                        src={`${API_HOST}${order.paymentProofUrl}`}
                        alt="Payment proof"
                        style={{
                          maxWidth: '300px',
                          maxHeight: '200px',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          cursor: 'pointer',
                        }}
                        onClick={() => window.open(`${API_HOST}${order.paymentProofUrl}`, '_blank')}
                      />
                    )}
                  </div>
                )}

                {/* Rejection reason */}
                {order.paymentStatus === 'rejected' && order.paymentRejectionReason && (
                  <div style={{
                    padding: '0.5rem',
                    backgroundColor: '#fee2e2',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    color: '#991b1b',
                    marginBottom: '0.75rem',
                  }}>
                    <strong>Reason:</strong> {order.paymentRejectionReason}
                  </div>
                )}

                {/* Actions */}
                {order.paymentStatus === 'pending_approval' && (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleApprove(order._id)}
                      style={{
                        padding: '0.4rem 1rem',
                        backgroundColor: '#16a34a',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600',
                      }}
                    >
                      ✅ Approve
                    </button>

                    {rejectingId === order._id ? (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="Reason for rejection..."
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          style={{
                            padding: '0.4rem 0.75rem',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.85rem',
                            minWidth: '200px',
                          }}
                        />
                        <button
                          onClick={() => handleReject(order._id)}
                          style={{
                            padding: '0.4rem 0.8rem',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => { setRejectingId(null); setRejectReason(''); }}
                          style={{
                            padding: '0.4rem 0.8rem',
                            backgroundColor: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setRejectingId(order._id)}
                        style={{
                          padding: '0.4rem 1rem',
                          backgroundColor: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        ❌ Reject
                      </button>
                    )}
                  </div>
                )}

                {/* Order date */}
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                  Ordered: {new Date(order.createdAt).toLocaleString()}
                  {order.paymentReviewedAt && ` · Reviewed: ${new Date(order.paymentReviewedAt).toLocaleString()}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MerchandiseOrders;
