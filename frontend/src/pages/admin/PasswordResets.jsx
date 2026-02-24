import { useState, useEffect } from 'react';
import API from '../../api/axios';
import Loading from '../../components/Loading';

export default function PasswordResets() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [comments, setComments] = useState({});
    const [newPasswordModal, setNewPasswordModal] = useState(null);

    useEffect(() => {
        API.get('/admin/password-resets')
            .then((res) => setRequests(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleApprove = async (id) => {
        try {
            const res = await API.post(`/admin/password-resets/${id}/approve`, {
                comment: comments[id] || '',
            });
            setNewPasswordModal(res.data.newPassword);
            setRequests(requests.map((r) =>
                r._id === id ? { ...r, status: 'approved', adminComment: comments[id] || '', resolvedAt: new Date().toISOString() } : r
            ));
            setMessage({ type: 'success', text: 'Password reset approved!' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed' });
        }
    };

    const handleReject = async (id) => {
        try {
            await API.post(`/admin/password-resets/${id}/reject`, {
                comment: comments[id] || '',
            });
            setRequests(requests.map((r) =>
                r._id === id ? { ...r, status: 'rejected', adminComment: comments[id] || '', resolvedAt: new Date().toISOString() } : r
            ));
            setMessage({ type: 'success', text: 'Password reset request rejected.' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed' });
        }
    };

    if (loading) return <Loading />;

    const pending = requests.filter((r) => r.status === 'pending');
    const resolved = requests.filter((r) => r.status !== 'pending');

    const categoryLabels = { club: '🎭 Club', council: '🏛️ Council', fest_team: '🎉 Fest Team' };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Password Reset Requests</h1>
                <p>Review and manage organizer password reset requests</p>
            </div>

            {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

            {/* New Password Modal */}
            {newPasswordModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}
                    onClick={() => setNewPasswordModal(null)}
                >
                    <div className="glass-card" style={{ maxWidth: 420, width: '90%', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '1rem', color: 'var(--success)' }}>✅ Password Reset Approved</h3>
                        <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            The new password has been auto-generated. Please share it with the organizer securely.
                        </p>
                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.08)', borderRadius: '8px', marginBottom: '1rem' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent)', letterSpacing: '2px' }}>
                                {newPasswordModal}
                            </span>
                        </div>
                        <button className="btn btn-primary" onClick={() => {
                            navigator.clipboard.writeText(newPasswordModal);
                            setNewPasswordModal(null);
                        }}>
                            📋 Copy & Close
                        </button>
                    </div>
                </div>
            )}

            {/* Pending Requests */}
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
                        <div key={req._id} className="glass-card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                <div>
                                    <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 600 }}>{req.organizer?.name || 'Unknown'}</h3>
                                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                        <span>🏷️ {categoryLabels[req.organizer?.category] || req.organizer?.category || 'N/A'}</span>
                                        <span>📧 {req.organizer?.loginEmail}</span>
                                        <span>📅 {new Date(req.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <span className="badge badge-warning">⏳ Pending</span>
                            </div>

                            {req.reason && (
                                <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '3px solid var(--accent)' }}>
                                    <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Reason:</span>
                                    <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', margin: 0 }}>{req.reason}</p>
                                </div>
                            )}

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: 'var(--font-xs)' }}>Admin Comment (optional)</label>
                                <textarea
                                    className="form-input"
                                    rows={2}
                                    value={comments[req._id] || ''}
                                    onChange={(e) => setComments({ ...comments, [req._id]: e.target.value })}
                                    placeholder="Add a comment for approval/rejection..."
                                    style={{ fontSize: 'var(--font-sm)' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button className="btn btn-success btn-sm" onClick={() => handleApprove(req._id)}>✓ Approve</button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleReject(req._id)}>✕ Reject</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Resolved History */}
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
                                    <th>Category</th>
                                    <th>Requested</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    <th>Admin Comment</th>
                                    <th>Resolved</th>
                                </tr>
                            </thead>
                            <tbody>
                                {resolved.map((req) => (
                                    <tr key={req._id}>
                                        <td>{req.organizer?.name || 'Unknown'}</td>
                                        <td>{categoryLabels[req.organizer?.category] || req.organizer?.category || '—'}</td>
                                        <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                                        <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.reason || '—'}</td>
                                        <td>
                                            <span className={`badge ${req.status === 'approved' ? 'badge-green' : 'badge-red'}`}>
                                                {req.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                                            </span>
                                        </td>
                                        <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.adminComment || '—'}</td>
                                        <td>{req.resolvedAt ? new Date(req.resolvedAt).toLocaleDateString() : '—'}</td>
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
