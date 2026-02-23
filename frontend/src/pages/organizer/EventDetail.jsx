import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import Loading from '../../components/Loading';

export default function EventDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [message, setMessage] = useState({ type: '', text: '' });
    const [partSearch, setPartSearch] = useState('');

    useEffect(() => {
        Promise.all([
            API.get(`/organizer/events/${id}`),
            API.get(`/organizer/events/${id}/participants`),
        ]).then(([eventRes, partRes]) => {
            setEvent(eventRes.data.event || eventRes.data);
            setParticipants(partRes.data.participants || []);
        }).catch(console.error).finally(() => setLoading(false));
    }, [id]);

    const handlePublish = async () => {
        try {
            const res = await API.put(`/organizer/events/${id}/publish`);
            setEvent({ ...event, status: 'published' });
            setMessage({ type: 'success', text: 'Event published! Discord notification sent.' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed' });
        }
    };

    const handleStatusChange = async (newStatus) => {
        try {
            await API.put(`/organizer/events/${id}/close`, { status: newStatus });
            setEvent({ ...event, status: newStatus });
            setMessage({ type: 'success', text: `Status changed to ${newStatus}` });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed' });
        }
    };

    const handleSaveEdit = async () => {
        try {
            const res = await API.put(`/organizer/events/${id}`, editForm);
            setEvent(res.data.event);
            setEditing(false);
            setMessage({ type: 'success', text: 'Event updated!' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed' });
        }
    };

    const handleCSV = async () => {
        try {
            const res = await API.get(`/organizer/events/${id}/participants`, {
                params: { format: 'csv' },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `participants_${id}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <Loading />;
    if (!event) return <div className="page-container"><div className="empty-state"><p>Event not found</p></div></div>;

    const statusColors = { draft: 'badge-gray', published: 'badge-green', ongoing: 'badge-blue', completed: 'badge-purple', closed: 'badge-red' };

    const filteredParticipants = participants.filter((p) => {
        if (!partSearch) return true;
        const q = partSearch.toLowerCase();
        const firstName = p.participant?.firstName || '';
        const lastName = p.participant?.lastName || '';
        const email = p.participant?.email || '';
        return firstName.toLowerCase().includes(q) || lastName.toLowerCase().includes(q) || email.toLowerCase().includes(q);
    });

    return (
        <div className="page-container">
            <div className="fade-in">
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span className={`badge ${statusColors[event.status]}`}>{event.status}</span>
                            <span className={`badge ${event.type === 'merchandise' ? 'badge-yellow' : 'badge-purple'}`}>{event.type}</span>
                        </div>
                        <h1 style={{ fontSize: 'var(--font-3xl)', fontWeight: 800 }}>{event.name}</h1>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {event.status === 'draft' && <button className="btn btn-success" onClick={handlePublish}>🚀 Publish</button>}
                        {event.status === 'published' && <button className="btn btn-primary" onClick={() => handleStatusChange('ongoing')}>▶ Start (Ongoing)</button>}
                        {event.status === 'ongoing' && <button className="btn btn-primary" onClick={() => handleStatusChange('completed')}>✓ Complete</button>}
                        {(event.status === 'published' || event.status === 'ongoing') && <button className="btn btn-danger" onClick={() => handleStatusChange('closed')}>✕ Close</button>}
                        {event.status === 'draft' && <button className="btn btn-secondary" onClick={() => { setEditing(!editing); setEditForm({ name: event.name, description: event.description }); }}>✏️ Edit</button>}
                    </div>
                </div>

                {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

                {/* Edit Modal */}
                {editing && (
                    <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Edit Event</h3>
                        <div className="form-group">
                            <label>Name</label>
                            <input className="form-input" value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <textarea className="form-input" value={editForm.description || ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-primary" onClick={handleSaveEdit}>Save</button>
                            <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                        </div>
                    </div>
                )}

                {/* Stats & Info */}
                <div className="grid-4" style={{ marginBottom: '2rem' }}>
                    <div className="glass-card stat-card">
                        <div className="stat-value">{event.registrationCount || 0}</div>
                        <div className="stat-label">Registrations</div>
                    </div>
                    <div className="glass-card stat-card">
                        <div className="stat-value">₹{event.totalRevenue || 0}</div>
                        <div className="stat-label">Revenue</div>
                    </div>
                    <div className="glass-card stat-card">
                        <div className="stat-value">{event.registrationsLast24h || 0}</div>
                        <div className="stat-label">Last 24h</div>
                    </div>
                    <div className="glass-card stat-card">
                        <div className="stat-value">{event.attendanceCount || 0}</div>
                        <div className="stat-label">Attendance</div>
                    </div>
                </div>

                {/* Event Info */}
                <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '0.75rem' }}>Event Details</h3>
                    <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>{event.description || 'No description'}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', fontSize: 'var(--font-sm)' }}>
                        <div><span style={{ color: 'var(--text-muted)' }}>📅 Start:</span> {new Date(event.startDate).toLocaleDateString()}</div>
                        <div><span style={{ color: 'var(--text-muted)' }}>📅 End:</span> {new Date(event.endDate).toLocaleDateString()}</div>
                        <div><span style={{ color: 'var(--text-muted)' }}>⏰ Deadline:</span> {new Date(event.registrationDeadline).toLocaleDateString()}</div>
                        <div><span style={{ color: 'var(--text-muted)' }}>💰 Fee:</span> ₹{event.registrationFee}</div>
                        <div><span style={{ color: 'var(--text-muted)' }}>👥 Limit:</span> {event.registrationLimit || 'Unlimited'}</div>
                        <div><span style={{ color: 'var(--text-muted)' }}>🎯 Eligibility:</span> {event.eligibility}</div>
                    </div>
                </div>

                {/* Participants Table */}
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <h3>Participants ({filteredParticipants.length})</h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input className="form-input" placeholder="Search…" value={partSearch} onChange={(e) => setPartSearch(e.target.value)} style={{ width: 200 }} />
                            <button className="btn btn-secondary btn-sm" onClick={handleCSV}>📥 CSV</button>
                        </div>
                    </div>

                    {filteredParticipants.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>No participants yet</p>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Ticket ID</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredParticipants.map((p) => (
                                        <tr key={p._id}>
                                            <td>{p.participant?.firstName} {p.participant?.lastName}</td>
                                            <td>{p.participant?.email}</td>
                                            <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-xs)' }}>{p.ticketId}</td>
                                            <td><span className={`badge ${p.status === 'confirmed' ? 'badge-green' : 'badge-yellow'}`}>{p.status}</span></td>
                                            <td>{new Date(p.registeredAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
