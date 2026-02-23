import { useState, useEffect } from 'react';
import API from '../../api/axios';
import Loading from '../../components/Loading';

export default function ManageOrganizers() {
    const [organizers, setOrganizers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({ name: '', category: 'club', description: '', contactEmail: '' });
    const [creating, setCreating] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [newCreds, setNewCreds] = useState(null);

    const fetchOrganizers = async () => {
        try {
            const res = await API.get('/admin/organizers');
            setOrganizers(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchOrganizers(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreating(true);
        setMessage({ type: '', text: '' });
        try {
            const res = await API.post('/admin/organizers', createForm);
            setNewCreds(res.data.credentials || res.data);
            setMessage({ type: 'success', text: 'Organizer created successfully!' });
            setCreateForm({ name: '', category: 'club', description: '', contactEmail: '' });
            fetchOrganizers();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed' });
        } finally {
            setCreating(false);
        }
    };

    const handleToggle = async (id) => {
        try {
            await API.put(`/admin/organizers/${id}/disable`);
            fetchOrganizers();
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Permanently delete this organizer? This cannot be undone.')) return;
        try {
            await API.delete(`/admin/organizers/${id}`);
            setOrganizers(organizers.filter((o) => o._id !== id));
        } catch (err) { console.error(err); }
    };

    if (loading) return <Loading />;

    const categoryLabels = { club: '🎭 Club', council: '🏛️ Council', fest_team: '🎉 Fest Team' };

    return (
        <div className="page-container">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Manage Organizers</h1>
                    <p>Create, disable, or delete organizer accounts</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
                    {showCreate ? '✕ Close' : '+ Create Organizer'}
                </button>
            </div>

            {/* Create Form */}
            {showCreate && (
                <div className="glass-card fade-in" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Create New Organizer</h3>
                    {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}
                    {newCreds && (
                        <div className="alert alert-success" style={{ whiteSpace: 'pre-wrap' }}>
                            <strong>Auto-Generated Credentials:</strong><br />
                            Email: {newCreds.loginEmail || newCreds.email}<br />
                            Password: {newCreds.password}<br />
                            <span style={{ fontSize: 'var(--font-xs)' }}>These have been emailed to the contact email.</span>
                        </div>
                    )}
                    <form onSubmit={handleCreate}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                            <div className="form-group">
                                <label>Organization Name *</label>
                                <input className="form-input" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} required placeholder="Coding Club" />
                            </div>
                            <div className="form-group">
                                <label>Category *</label>
                                <select className="form-input" value={createForm.category} onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}>
                                    <option value="club">Club</option>
                                    <option value="council">Council</option>
                                    <option value="fest_team">Fest Team</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Contact Email</label>
                            <input type="email" className="form-input" value={createForm.contactEmail} onChange={(e) => setCreateForm({ ...createForm, contactEmail: e.target.value })} placeholder="club@iiit.ac.in" />
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <textarea className="form-input" value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} rows={2} placeholder="Brief description of the organization" />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={creating}>
                            {creating ? 'Creating...' : '🚀 Create Organizer'}
                        </button>
                    </form>
                </div>
            )}

            {/* Organizers Table */}
            {organizers.length === 0 ? (
                <div className="empty-state">
                    <div className="emoji">🏢</div>
                    <p>No organizers yet</p>
                </div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Category</th>
                                <th>Login Email</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {organizers.map((org) => (
                                <tr key={org._id}>
                                    <td style={{ fontWeight: 600 }}>{org.name}</td>
                                    <td><span className="badge badge-purple">{categoryLabels[org.category] || org.category}</span></td>
                                    <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>{org.loginEmail}</td>
                                    <td>
                                        <span className={`badge ${org.isActive ? 'badge-green' : 'badge-red'}`}>
                                            {org.isActive ? 'Active' : 'Disabled'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                                            <button className={`btn btn-sm ${org.isActive ? 'btn-secondary' : 'btn-success'}`} onClick={() => handleToggle(org._id)}>
                                                {org.isActive ? 'Disable' : 'Enable'}
                                            </button>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(org._id)}>
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
