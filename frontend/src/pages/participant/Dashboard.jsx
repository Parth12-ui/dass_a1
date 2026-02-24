import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api/axios';
import Loading from '../../components/Loading';

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [activeTab, setActiveTab] = useState('upcoming');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        API.get('/participants/dashboard')
            .then((res) => setData(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Loading />;

    const tabs = [
        { key: 'upcoming', label: 'Upcoming' },
        { key: 'teams', label: '👥 Teams' },
        { key: 'normal', label: 'Normal' },
        { key: 'merchandise', label: 'Merchandise' },
        { key: 'completed', label: 'Completed' },
        { key: 'cancelled', label: 'Cancelled' },
    ];

    const getRecords = () => {
        if (activeTab === 'upcoming') return data?.upcoming || [];
        if (activeTab === 'teams') return data?.teams || [];
        return data?.history?.[activeTab] || [];
    };

    const records = getRecords();

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>My Events</h1>
                <p>Track your registrations, teams, and event history</p>
            </div>

            <div className="tabs">
                {tabs.map((t) => (
                    <button key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
                        {t.label}
                    </button>
                ))}
            </div>

            {records.length === 0 ? (
                <div className="empty-state">
                    <div className="emoji">📭</div>
                    <p>No {activeTab === 'teams' ? 'teams' : 'events'} in this category</p>
                    <Link to="/browse" className="btn btn-primary" style={{ marginTop: '1rem' }}>Browse Events</Link>
                </div>
            ) : activeTab === 'teams' ? (
                /* Team cards */
                <div className="grid-3">
                    {records.map((team) => (
                        <Link key={team._id} to={`/teams/${team._id}`} className="glass-card card-hover" style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <h3 style={{ margin: 0, color: 'var(--accent)' }}>{team.name}</h3>
                                <span className={`badge ${team.status === 'complete' ? 'badge-green' : team.status === 'forming' ? 'badge-yellow' : 'badge-red'}`}>
                                    {team.status}
                                </span>
                            </div>
                            <p style={{ opacity: 0.7, marginBottom: '0.5rem', fontSize: 'var(--font-sm)' }}>
                                📅 {team.event?.name || 'Unknown Event'}
                            </p>
                            <p style={{ opacity: 0.6, fontSize: 'var(--font-xs)' }}>
                                👥 {team.members?.length || 0}/{team.maxSize} members
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', fontSize: 'var(--font-xs)', opacity: 0.5 }}>
                                <span>Leader: {team.leader?.firstName} {team.leader?.lastName}</span>
                                <span className={`badge ${team.event?.status === 'published' ? 'badge-green' : 'badge-blue'}`} style={{ fontSize: '0.65rem' }}>
                                    {team.event?.status}
                                </span>
                            </div>
                            <div style={{ marginTop: '0.75rem', padding: '0.4rem', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', textAlign: 'center', fontSize: 'var(--font-xs)' }}>
                                <span style={{ opacity: 0.6 }}>Invite:</span>{' '}
                                <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--accent)' }}>{team.inviteCode}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                /* Registration cards */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {records.map((reg) => (
                        <div key={reg._id} className="glass-card fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 600 }}>
                                    {reg.event?.name || 'Unknown Event'}
                                </h3>
                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                                    <span>{reg.event?.type === 'merchandise' ? '🛍️' : '📋'} {reg.event?.type}</span>
                                    <span>📅 {new Date(reg.registeredAt).toLocaleDateString()}</span>
                                    <span className={`badge ${reg.status === 'confirmed' ? 'badge-green' : reg.status === 'cancelled' ? 'badge-red' : 'badge-yellow'}`}>
                                        {reg.status}
                                    </span>
                                </div>
                            </div>
                            <Link to={`/browse/${reg.event?._id}`} className="btn btn-secondary btn-sm">
                                🎫 {reg.ticketId}
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
