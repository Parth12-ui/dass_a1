import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api/axios';
import Loading from '../../components/Loading';

export default function Dashboard() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        API.get('/organizer/dashboard')
            .then((res) => setEvents(res.data.events || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Loading />;

    const statusGroups = {
        draft: events.filter((e) => e.status === 'draft'),
        published: events.filter((e) => e.status === 'published'),
        ongoing: events.filter((e) => e.status === 'ongoing'),
        completed: events.filter((e) => e.status === 'completed'),
        closed: events.filter((e) => e.status === 'closed'),
    };

    const statusColors = { draft: 'badge-gray', published: 'badge-green', ongoing: 'badge-blue', completed: 'badge-purple', closed: 'badge-red' };

    // Aggregate analytics
    const totalReg = events.reduce((sum, e) => sum + (e.registrationCount || 0), 0);
    const totalRevenue = events.reduce((sum, e) => sum + (e.totalRevenue || 0), 0);

    return (
        <div className="page-container">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Organizer Dashboard</h1>
                    <p>Manage your events and track performance</p>
                </div>
                <Link to="/organizer/events/create" className="btn btn-primary">+ Create Event</Link>
            </div>

            {/* Stats */}
            <div className="grid-4" style={{ marginBottom: '2rem' }}>
                <div className="glass-card stat-card">
                    <div className="stat-value">{events.length}</div>
                    <div className="stat-label">Total Events</div>
                </div>
                <div className="glass-card stat-card">
                    <div className="stat-value">{statusGroups.published.length + statusGroups.ongoing.length}</div>
                    <div className="stat-label">Active Events</div>
                </div>
                <div className="glass-card stat-card">
                    <div className="stat-value">{totalReg}</div>
                    <div className="stat-label">Total Registrations</div>
                </div>
                <div className="glass-card stat-card">
                    <div className="stat-value">₹{totalRevenue}</div>
                    <div className="stat-label">Total Revenue</div>
                </div>
            </div>

            {/* Events by status */}
            {Object.entries(statusGroups).map(([status, group]) => (
                group.length > 0 && (
                    <div key={status} style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className={`badge ${statusColors[status]}`}>{status}</span>
                            <span>({group.length})</span>
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {group.map((event) => (
                                <Link key={event._id} to={`/organizer/events/${event._id}`} className="glass-card fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', textDecoration: 'none', color: 'inherit' }}>
                                    <div>
                                        <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 600 }}>{event.name}</h3>
                                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                                            <span>{event.type === 'merchandise' ? '🛍️' : '📋'} {event.type}</span>
                                            <span>👥 {event.registrationCount || 0} registrations</span>
                                            <span>📅 {new Date(event.startDate).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <span className="btn btn-secondary btn-sm">View →</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )
            ))}

            {events.length === 0 && (
                <div className="empty-state">
                    <div className="emoji">📋</div>
                    <p>No events yet</p>
                    <Link to="/organizer/events/create" className="btn btn-primary" style={{ marginTop: '1rem' }}>Create Your First Event</Link>
                </div>
            )}
        </div>
    );
}
