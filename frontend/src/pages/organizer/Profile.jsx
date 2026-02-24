import { useState, useEffect } from 'react';
import API from '../../api/axios';
import Loading from '../../components/Loading';

export default function Profile() {
    const [form, setForm] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
    const [reason, setReason] = useState('');
    const [resetHistory, setResetHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    useEffect(() => {
        API.get('/organizer/profile')
            .then((res) => setForm(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));

        API.get('/organizer/password-reset-requests')
            .then((res) => setResetHistory(res.data))
            .catch(console.error)
            .finally(() => setHistoryLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setMessage({ type: '', text: '' });
        try {
            const res = await API.put('/organizer/profile', {
                description: form.description,
                contactEmail: form.contactEmail,
                contactNumber: form.contactNumber,
                discordWebhookUrl: form.discordWebhookUrl,
            });
            setForm(res.data.organizer);
            setMessage({ type: 'success', text: 'Profile updated!' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed' });
        } finally {
            setSaving(false);
        }
    };

    const handleResetRequest = async () => {
        if (!reason.trim()) {
            setPasswordMsg({ type: 'error', text: 'Please provide a reason for the password reset.' });
            return;
        }
        try {
            const res = await API.post('/organizer/password-reset-request', { reason: reason.trim() });
            setPasswordMsg({ type: 'success', text: 'Password reset request sent to admin!' });
            setReason('');
            // Add the new request to history
            setResetHistory([res.data.request, ...resetHistory]);
        } catch (err) {
            setPasswordMsg({ type: 'error', text: err.response?.data?.message || 'Failed' });
        }
    };

    if (loading) return <Loading />;

    const categoryLabels = { club: '🎭 Club', council: '🏛️ Council', fest_team: '🎉 Fest Team' };

    const statusBadge = (status) => {
        const map = {
            pending: { cls: 'badge-warning', label: '⏳ Pending' },
            approved: { cls: 'badge-green', label: '✅ Approved' },
            rejected: { cls: 'badge-red', label: '❌ Rejected' },
        };
        const s = map[status] || { cls: '', label: status };
        return <span className={`badge ${s.cls}`}>{s.label}</span>;
    };

    return (
        <div className="page-container" style={{ maxWidth: 700 }}>
            <div className="page-header">
                <h1>Organizer Profile</h1>
                <p>Manage your club profile and integrations</p>
            </div>

            <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

                <div className="form-group">
                    <label>Name <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)' }}>(non-editable)</span></label>
                    <input className="form-input" value={form.name || ''} disabled style={{ opacity: 0.6 }} />
                </div>

                <div className="form-group">
                    <label>Category</label>
                    <input className="form-input" value={categoryLabels[form.category] || form.category || ''} disabled style={{ opacity: 0.6 }} />
                </div>

                <div className="form-group">
                    <label>Login Email <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)' }}>(non-editable)</span></label>
                    <input className="form-input" value={form.loginEmail || ''} disabled style={{ opacity: 0.6 }} />
                </div>

                <div className="form-group">
                    <label>Description</label>
                    <textarea className="form-input" rows={3} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="About your club..." />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                        <label>Contact Email</label>
                        <input className="form-input" value={form.contactEmail || ''} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Contact Number</label>
                        <input className="form-input" value={form.contactNumber || ''} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
                    </div>
                </div>

                <div className="form-group">
                    <label>Discord Webhook URL</label>
                    <input className="form-input" value={form.discordWebhookUrl || ''} onChange={(e) => setForm({ ...form, discordWebhookUrl: e.target.value })} placeholder="https://discord.com/api/webhooks/..." />
                    <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Events will be announced in your Discord channel when published</span>
                </div>

                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {/* Password Reset Request */}
            <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ marginBottom: '0.75rem' }}>🔒 Password Reset</h3>
                <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Organizer passwords can only be reset by the admin. Provide a reason and submit a request.
                </p>
                {passwordMsg.text && <div className={`alert alert-${passwordMsg.type}`}>{passwordMsg.text}</div>}

                <div className="form-group">
                    <label>Reason for Password Reset <span style={{ color: 'var(--accent)' }}>*</span></label>
                    <textarea
                        className="form-input"
                        rows={2}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g. Forgot password, compromised account, new team member needs access..."
                    />
                </div>
                <button className="btn btn-secondary" onClick={handleResetRequest} disabled={!reason.trim()}>
                    Request Password Reset
                </button>
            </div>

            {/* Password Reset History */}
            <div className="glass-card">
                <h3 style={{ marginBottom: '0.75rem' }}>📋 Password Reset History</h3>
                {historyLoading ? (
                    <Loading />
                ) : resetHistory.length === 0 ? (
                    <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>No password reset requests yet.</p>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    <th>Admin Comment</th>
                                </tr>
                            </thead>
                            <tbody>
                                {resetHistory.map((req) => (
                                    <tr key={req._id}>
                                        <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.reason || '—'}</td>
                                        <td>{statusBadge(req.status)}</td>
                                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.adminComment || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
