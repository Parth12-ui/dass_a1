import { useState, useEffect } from 'react';
import API from '../../api/axios';
import Loading from '../../components/Loading';

export default function PasswordResets() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        API.get('/admin/password-resets')
            .then((res) => setRequests(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleApprove = async (id) => {
        try {
            const res = await API.post(`/admin/password-resets/${id}/approve`);
            setMessage({ type: 'success', text: `Approved! New password sent via email.` });
            setRequests(requests.map((r) => r._id === id ? { ...r, status: 'approved' } : r));
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed' });
        }
    };

    const handleReject = async (id) => {
        try {
            await API.post(`/admin/password-resets/${id}/reject`);
            setRequests(requests.map((r) => r._id === id ? { ...r, status: 'rejected' } : r));
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed' });
        }
    };

    if (loading) return <Loading />;

    const pending = requests.filter((r) => r.status === 'pending');
    const resolved = requests.filter((r) => r.status !== 'pending');

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Password Reset Requests</h1>
                <p>Review and manage organizer password reset requests</p>
            </div>

            {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

            {/* Pending */}
            <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, marginBottom: '1rem' }}>
                Pending ({pending.length})
            </h2>

            {pending.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem' }}>
                    <p>✅ No pending requests</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                    {pending.map((req) => (
                        <div key={req._id} className="glass-card fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 600 }}>{req.organizer?.name || 'Unknown'}</h3>
                                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    <span>📧 {req.organizer?.loginEmail}</span>
                                    <span style={{ marginLeft: '1rem' }}>📅 {new Date(req.createdAt).toLocaleDateString()}</span>
                                </div>
                                {req.reason && (
                                    <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                        Reason: {req.reason}
                                    </p>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-success btn-sm" onClick={() => handleApprove(req._id)}>✓ Approve</button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleReject(req._id)}>✕ Reject</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Resolved */}
            {resolved.length > 0 && (
                <>
                    <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, marginBottom: '1rem' }}>
                        Resolved ({resolved.length})
                    </h2>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Organizer</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {resolved.map((req) => (
                                    <tr key={req._id}>
                                        <td>{req.organizer?.name || 'Unknown'}</td>
                                        <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <span className={`badge ${req.status === 'approved' ? 'badge-green' : 'badge-red'}`}>
                                                {req.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
