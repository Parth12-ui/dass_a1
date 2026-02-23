import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api/axios';
import Loading from '../../components/Loading';

export default function Organizers() {
    const [organizers, setOrganizers] = useState([]);
    const [followedIds, setFollowedIds] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            API.get('/participants/organizers'),
            API.get('/participants/profile'),
        ]).then(([orgRes, profileRes]) => {
            setOrganizers(orgRes.data);
            setFollowedIds((profileRes.data.followedOrganizers || []).map(o => o._id || o));
        }).catch(console.error).finally(() => setLoading(false));
    }, []);

    const toggleFollow = async (orgId) => {
        try {
            const res = await API.post(`/participants/organizers/${orgId}/follow`);
            if (res.data.isFollowing) {
                setFollowedIds([...followedIds, orgId]);
            } else {
                setFollowedIds(followedIds.filter((id) => id !== orgId));
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <Loading />;

    const categoryLabels = { club: '🎭 Club', council: '🏛️ Council', fest_team: '🎉 Fest Team' };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Clubs & Organizers</h1>
                <p>Discover and follow your favorite clubs</p>
            </div>

            {organizers.length === 0 ? (
                <div className="empty-state">
                    <div className="emoji">🏢</div>
                    <p>No organizers found</p>
                </div>
            ) : (
                <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                    {organizers.map((org) => (
                        <div key={org._id} className="glass-card fade-in">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                <span className="badge badge-purple">{categoryLabels[org.category] || org.category}</span>
                                <button
                                    className={`btn btn-sm ${followedIds.includes(org._id) ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => toggleFollow(org._id)}
                                >
                                    {followedIds.includes(org._id) ? '✓ Following' : '+ Follow'}
                                </button>
                            </div>

                            <Link to={`/organizers/${org._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, marginBottom: '0.5rem' }}>{org.name}</h3>
                                <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                    {org.description || 'No description'}
                                </p>
                            </Link>

                            {org.contactEmail && (
                                <div style={{ marginTop: '0.75rem', fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                                    📧 {org.contactEmail}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
