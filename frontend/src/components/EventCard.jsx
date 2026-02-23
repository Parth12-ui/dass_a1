import { Link } from 'react-router-dom';

const statusColors = {
    draft: 'badge-gray',
    published: 'badge-green',
    ongoing: 'badge-blue',
    completed: 'badge-purple',
    closed: 'badge-red',
};

const typeLabels = {
    normal: '📋 Event',
    merchandise: '🛍️ Merch',
};

export default function EventCard({ event, linkPrefix = '/browse' }) {
    const orgName = event.organizer?.name || 'Unknown Organizer';

    return (
        <Link
            to={`${linkPrefix}/${event._id}`}
            className="glass-card fade-in"
            style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <span className={`badge ${statusColors[event.status] || 'badge-gray'}`}>
                    {event.status}
                </span>
                <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                    {typeLabels[event.type] || event.type}
                </span>
            </div>

            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, marginBottom: '0.5rem' }}>
                {event.name}
            </h3>

            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {event.description || 'No description'}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                <span>👤 {orgName}</span>
                <span>📅 {new Date(event.startDate).toLocaleDateString()}</span>
            </div>

            {event.registrationFee > 0 && (
                <div style={{ marginTop: '0.5rem', fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--accent-secondary)' }}>
                    ₹{event.registrationFee}
                </div>
            )}

            {event.tags && event.tags.length > 0 && (
                <div className="tag-chips" style={{ marginTop: '0.75rem' }}>
                    {event.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="tag-chip">{tag}</span>
                    ))}
                </div>
            )}
        </Link>
    );
}
