import { useState, useEffect } from 'react';
import api from '../../api/axios';
import Loading from '../../components/Loading';
import { useParams } from 'react-router-dom';

export default function MerchOrders() {
    const { id } = useParams();
    const [orders, setOrders] = useState([]);
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState({});
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        Promise.all([
            api.get(`/organizer/events/${id}`),
            api.get(`/organizer/events/${id}/merch-orders`),
        ])
            .then(([eventRes, ordersRes]) => {
                setEvent(eventRes.data.event);
                setOrders(ordersRes.data.orders);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id]);

    const handleApprove = async (orderId) => {
        setProcessing((p) => ({ ...p, [orderId]: 'approving' }));
        try {
            const res = await api.post(`/organizer/events/${id}/merch-orders/${orderId}/approve`);
            setOrders((prev) => prev.map((o) => (o._id === orderId ? res.data.registration : o)));
        } catch (err) {
            alert(err.response?.data?.message || 'Approval failed');
        }
        setProcessing((p) => ({ ...p, [orderId]: null }));
    };

    const handleReject = async (orderId) => {
        if (!confirm('Reject this order?')) return;
        setProcessing((p) => ({ ...p, [orderId]: 'rejecting' }));
        try {
            const res = await api.post(`/organizer/events/${id}/merch-orders/${orderId}/reject`);
            setOrders((prev) => prev.map((o) => (o._id === orderId ? res.data.registration : o)));
        } catch (err) {
            alert(err.response?.data?.message || 'Rejection failed');
        }
        setProcessing((p) => ({ ...p, [orderId]: null }));
    };

    if (loading) return <Loading />;

    const filteredOrders = filter === 'all'
        ? orders
        : orders.filter((o) => o.paymentStatus === filter);

    const stats = {
        total: orders.length,
        pending: orders.filter((o) => o.paymentStatus === 'pending_approval').length,
        approved: orders.filter((o) => o.paymentStatus === 'approved').length,
        rejected: orders.filter((o) => o.paymentStatus === 'rejected').length,
    };

    return (
        <div className="page-container">
            <h1 className="page-title">Merch Orders — {event?.name}</h1>

            {/* Stats */}
            <div className="grid-4" style={{ marginBottom: '2rem' }}>
                <div className="stat-card" onClick={() => setFilter('all')} style={{ cursor: 'pointer', border: filter === 'all' ? '1px solid var(--accent)' : 'none' }}>
                    <span className="stat-value">{stats.total}</span>
                    <span className="stat-label">Total Orders</span>
                </div>
                <div className="stat-card" onClick={() => setFilter('pending_approval')} style={{ cursor: 'pointer', border: filter === 'pending_approval' ? '1px solid #999' : 'none' }}>
                    <span className="stat-value" style={{ color: '#999' }}>{stats.pending}</span>
                    <span className="stat-label">Pending</span>
                </div>
                <div className="stat-card" onClick={() => setFilter('approved')} style={{ cursor: 'pointer', border: filter === 'approved' ? '1px solid #aaa' : 'none' }}>
                    <span className="stat-value" style={{ color: '#ccc' }}>{stats.approved}</span>
                    <span className="stat-label">Approved</span>
                </div>
                <div className="stat-card" onClick={() => setFilter('rejected')} style={{ cursor: 'pointer', border: filter === 'rejected' ? '1px solid #666' : 'none' }}>
                    <span className="stat-value" style={{ color: '#888' }}>{stats.rejected}</span>
                    <span className="stat-label">Rejected</span>
                </div>
            </div>

            {/* Orders */}
            {filteredOrders.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <p style={{ opacity: 0.6 }}>No orders found.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filteredOrders.map((order) => (
                        <div key={order._id} className="glass-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                <div>
                                    <h4 style={{ margin: 0 }}>
                                        {order.participant?.firstName} {order.participant?.lastName}
                                    </h4>
                                    <p style={{ opacity: 0.6, fontSize: '0.85rem', margin: '0.25rem 0' }}>
                                        {order.participant?.email}
                                    </p>
                                </div>
                                <span className={`badge ${order.paymentStatus === 'approved' ? 'badge-success' :
                                    order.paymentStatus === 'rejected' ? 'badge-danger' :
                                        'badge-warning'
                                    }`}>
                                    {order.paymentStatus}
                                </span>
                            </div>

                            {/* Items */}
                            <div style={{ margin: '1rem 0', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                {order.merchandiseSelections?.map((sel, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                                        <span>{sel.itemName} {sel.size && `(${sel.size})`} {sel.color && `— ${sel.color}`}</span>
                                        <span>x{sel.quantity}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Payment Proof */}
                            {order.paymentProofUrl && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '0.5rem' }}>Payment Proof:</p>
                                    <img
                                        src={order.paymentProofUrl}
                                        alt="Payment proof"
                                        style={{ maxWidth: '300px', maxHeight: '200px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
                                    />
                                </div>
                            )}

                            {/* Ticket info if approved */}
                            {order.ticketId && (
                                <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', marginBottom: '1rem' }}>
                                    <span style={{ fontSize: '0.85rem' }}>🎫 Ticket: <strong>{order.ticketId}</strong></span>
                                </div>
                            )}

                            {/* Actions */}
                            {order.paymentStatus === 'pending_approval' && (
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button
                                        className="btn btn-success"
                                        onClick={() => handleApprove(order._id)}
                                        disabled={!!processing[order._id]}
                                    >
                                        {processing[order._id] === 'approving' ? 'Approving...' : '✅ Approve'}
                                    </button>
                                    <button
                                        className="btn btn-danger"
                                        onClick={() => handleReject(order._id)}
                                        disabled={!!processing[order._id]}
                                    >
                                        {processing[order._id] === 'rejecting' ? 'Rejecting...' : '❌ Reject'}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
