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
        { key: 'normal', label: 'Normal' },
        { key: 'merchandise', label: 'Merchandise' },
        { key: 'completed', label: 'Completed' },
        { key: 'cancelled', label: 'Cancelled' },
    ];

    const getRecords = () => {
        if (activeTab === 'upcoming') return data?.upcoming || [];
        return data?.history?.[activeTab] || [];
    };

    const records = getRecords();

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>My Events</h1>
                <p>Track your registrations and event history</p>
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
                    <p>No events in this category</p>
                    <Link to="/browse" className="btn btn-primary" style={{ marginTop: '1rem' }}>Browse Events</Link>
                </div>
            ) : (
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
