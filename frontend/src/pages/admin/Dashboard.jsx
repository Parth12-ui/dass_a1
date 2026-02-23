import { useState, useEffect } from 'react';
import API from '../../api/axios';
import Loading from '../../components/Loading';

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        API.get('/admin/dashboard')
            .then((res) => setStats(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Loading />;

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Admin Dashboard</h1>
                <p>Platform overview and statistics</p>
            </div>

            <div className="grid-4" style={{ marginBottom: '2rem' }}>
                <div className="glass-card stat-card fade-in">
                    <div className="stat-value">{stats?.totalParticipants || 0}</div>
                    <div className="stat-label">👥 Participants</div>
                </div>
                <div className="glass-card stat-card fade-in" style={{ animationDelay: '0.1s' }}>
                    <div className="stat-value">{stats?.totalOrganizers || 0}</div>
                    <div className="stat-label">🏢 Organizers</div>
                </div>
                <div className="glass-card stat-card fade-in" style={{ animationDelay: '0.2s' }}>
                    <div className="stat-value">{stats?.totalEvents || 0}</div>
                    <div className="stat-label">📋 Events</div>
                </div>
                <div className="glass-card stat-card fade-in" style={{ animationDelay: '0.3s' }}>
                    <div className="stat-value">{stats?.totalRegistrations || 0}</div>
                    <div className="stat-label">🎫 Registrations</div>
                </div>
            </div>

            {/* Event breakdown */}
            {stats?.eventsByStatus && (
                <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Events by Status</h3>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {Object.entries(stats.eventsByStatus).map(([status, count]) => {
                            const colors = { draft: 'badge-gray', published: 'badge-green', ongoing: 'badge-blue', completed: 'badge-purple', closed: 'badge-red' };
                            return (
                                <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span className={`badge ${colors[status] || 'badge-gray'}`}>{status}</span>
                                    <span style={{ fontWeight: 700 }}>{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Pending requests */}
            {stats?.pendingPasswordResets > 0 && (
                <div className="glass-card" style={{ background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ color: 'var(--warning)' }}>⚠️ Pending Password Resets</h3>
                            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                                {stats.pendingPasswordResets} request{stats.pendingPasswordResets > 1 ? 's' : ''} awaiting your review
                            </p>
                        </div>
                        <a href="/admin/password-resets" className="btn btn-secondary btn-sm">Review →</a>
                    </div>
                </div>
            )}
        </div>
    );
}
