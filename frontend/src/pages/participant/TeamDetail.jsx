import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Loading from '../../components/Loading';
import TeamChat from '../../components/TeamChat';

export default function TeamDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [team, setTeam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showChat, setShowChat] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get(`/teams/${id}`)
            .then((r) => setTeam(r.data))
            .catch((err) => setError(err.response?.data?.message || 'Failed to load team'))
            .finally(() => setLoading(false));
    }, [id]);

    const handleLeave = async () => {
        if (!confirm('Are you sure you want to leave this team?')) return;
        setLeaving(true);
        try {
            await api.post(`/teams/${id}/leave`);
            navigate('/teams');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to leave team');
        }
        setLeaving(false);
    };

    if (loading) return <Loading />;
    if (error && !team) return <div className="page-container"><div className="alert alert-error">{error}</div></div>;
    if (!team) return null;

    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 className="page-title" style={{ marginBottom: 0 }}>{team.name}</h1>
                    <p style={{ opacity: 0.7, marginTop: '0.5rem' }}>{team.event?.name}</p>
                </div>
                <span className={`badge ${team.status === 'complete' ? 'badge-success' : team.status === 'forming' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                    {team.status}
                </span>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="grid-2">
                {/* Members */}
                <div className="glass-card">
                    <h3>👥 Team Members ({team.members?.length || 0}/{team.maxSize})</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                        {team.members?.map((member) => (
                            <div key={member._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                <div>
                                    <strong>{member.firstName} {member.lastName}</strong>
                                    <p style={{ opacity: 0.6, fontSize: '0.85rem', margin: 0 }}>{member.email}</p>
                                </div>
                                {member._id === team.leader?._id && (
                                    <span className="badge badge-accent">Leader</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Invite & Actions */}
                <div className="glass-card">
                    <h3>🔗 Invite Code</h3>
                    <div style={{ margin: '1.5rem 0', padding: '1.5rem', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', textAlign: 'center' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)', letterSpacing: '4px' }}>
                            {team.inviteCode}
                        </span>
                    </div>
                    <p style={{ opacity: 0.6, fontSize: '0.85rem', textAlign: 'center' }}>
                        Share this code with teammates to join your team
                    </p>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setShowChat(!showChat)}>
                            {showChat ? '📋 Hide Chat' : '💬 Team Chat'}
                        </button>
                        {team.status === 'forming' && (
                            <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleLeave} disabled={leaving}>
                                {leaving ? 'Leaving...' : '🚪 Leave Team'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Team Chat */}
            {showChat && (
                <div style={{ marginTop: '2rem' }}>
                    <TeamChat teamId={team._id} />
                </div>
            )}
        </div>
    );
}
