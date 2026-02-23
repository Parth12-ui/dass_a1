import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Loading from '../../components/Loading';

export default function TeamDashboard() {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/teams/my')
            .then((r) => setTeams(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Loading />;

    return (
        <div className="page-container">
            <h1 className="page-title">My Teams</h1>

            {teams.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <p style={{ fontSize: '1.2rem', opacity: 0.7 }}>You haven't joined any teams yet.</p>
                    <p style={{ opacity: 0.5, marginTop: '0.5rem' }}>Browse team events and create or join a team!</p>
                </div>
            ) : (
                <div className="grid-3">
                    {teams.map((team) => (
                        <div
                            key={team._id}
                            className="glass-card card-hover"
                            onClick={() => navigate(`/teams/${team._id}`)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0, color: 'var(--accent-primary)' }}>{team.name}</h3>
                                <span className={`badge ${team.status === 'complete' ? 'badge-success' : team.status === 'forming' ? 'badge-warning' : 'badge-danger'}`}>
                                    {team.status}
                                </span>
                            </div>
                            <p style={{ opacity: 0.7, marginBottom: '0.5rem' }}>
                                📅 {team.event?.name || 'Unknown Event'}
                            </p>
                            <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>
                                👥 {team.members?.length || 0}/{team.maxSize} members
                            </p>
                            <p style={{ opacity: 0.5, fontSize: '0.85rem', marginTop: '0.5rem' }}>
                                Leader: {team.leader?.firstName} {team.leader?.lastName}
                            </p>
                            <div style={{ marginTop: '1rem', padding: '0.5rem', background: 'rgba(139,92,246,0.1)', borderRadius: '8px', textAlign: 'center' }}>
                                <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>Invite Code:</span>
                                <span style={{ fontFamily: 'monospace', fontWeight: 'bold', marginLeft: '0.5rem', color: 'var(--accent-primary)' }}>
                                    {team.inviteCode}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
