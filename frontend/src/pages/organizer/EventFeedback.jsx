import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';
import Loading from '../../components/Loading';

export default function EventFeedback() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        const params = filter ? `?minRating=${filter}` : '';
        api.get(`/feedback/${id}${params}`)
            .then((r) => setData(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id, filter]);

    if (loading) return <Loading />;
    if (!data) return null;

    const { stats, feedbacks } = data;

    return (
        <div className="page-container">
            <h1 className="page-title">Event Feedback</h1>

            {/* Aggregate Stats */}
            <div className="glass-card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                            {stats.avgRating}
                        </div>
                        <div style={{ fontSize: '1.5rem' }}>
                            {'★'.repeat(Math.round(stats.avgRating))}{'☆'.repeat(5 - Math.round(stats.avgRating))}
                        </div>
                        <div style={{ opacity: 0.6, marginTop: '0.25rem' }}>{stats.totalCount} reviews</div>
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        {[5, 4, 3, 2, 1].map((star) => {
                            const count = stats.breakdown[star] || 0;
                            const pct = stats.totalCount > 0 ? (count / stats.totalCount) * 100 : 0;
                            return (
                                <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', cursor: 'pointer' }}
                                    onClick={() => setFilter(filter === String(star) ? '' : String(star))}
                                >
                                    <span style={{ width: '2rem', textAlign: 'right', fontSize: '0.85rem' }}>{star}★</span>
                                    <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: `${pct}%`, height: '100%', background: star >= 4 ? '#ccc' : star === 3 ? '#999' : '#888', borderRadius: '4px', transition: 'width 0.3s' }} />
                                    </div>
                                    <span style={{ width: '2rem', fontSize: '0.85rem', opacity: 0.6 }}>{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Feedback List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {feedbacks.length === 0 ? (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
                        <p style={{ opacity: 0.6 }}>No feedback yet.</p>
                    </div>
                ) : (
                    feedbacks.map((fb, i) => (
                        <div key={i} className="glass-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span style={{ color: '#999' }}>
                                    {'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}
                                </span>
                                <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>
                                    {new Date(fb.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            {fb.comment && <p style={{ margin: 0, lineHeight: 1.6, opacity: 0.8 }}>{fb.comment}</p>}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
