import { useState, useEffect } from 'react';
import API from '../../api/axios';
import EventCard from '../../components/EventCard';
import Loading from '../../components/Loading';

export default function BrowseEvents() {
    const [events, setEvents] = useState([]);
    const [trending, setTrending] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({ type: '', eligibility: '', startDate: '', endDate: '', followedOnly: false });
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const params = { page, limit: 12, search };
            if (filters.type) params.type = filters.type;
            if (filters.eligibility) params.eligibility = filters.eligibility;
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;
            if (filters.followedOnly) params.followedOnly = 'true';

            const res = await API.get('/participants/browse', { params });
            setEvents(res.data.events);
            setPagination(res.data.pagination || {});
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchTrending = async () => {
        try {
            const res = await API.get('/participants/browse', { params: { trending: 'true' } });
            setTrending(res.data.events || []);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchTrending(); }, []);
    useEffect(() => { fetchEvents(); }, [page, search, filters]);

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Browse Events</h1>
                <p>Discover and register for upcoming events</p>
            </div>

            {/* Trending */}
            {trending.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, marginBottom: '1rem' }}>🔥 Trending Now</h2>
                    <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                        {trending.map((e) => <EventCard key={e._id} event={e} linkPrefix="/browse" />)}
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="search-bar">
                <input
                    type="text"
                    placeholder="Search events, organizers, tags..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
                    <option value="">All Types</option>
                    <option value="normal">Normal</option>
                    <option value="merchandise">Merchandise</option>
                </select>
                <select value={filters.eligibility} onChange={(e) => setFilters({ ...filters, eligibility: e.target.value })}>
                    <option value="">All Eligibility</option>
                    <option value="all">Open to All</option>
                    <option value="iiit">IIIT Only</option>
                    <option value="non-iiit">Non-IIIT Only</option>
                </select>
                <input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
                <input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={filters.followedOnly} onChange={(e) => setFilters({ ...filters, followedOnly: e.target.checked })} />
                    Followed Clubs Only
                </label>
            </div>

            {/* Results */}
            {loading ? (
                <Loading />
            ) : events.length === 0 ? (
                <div className="empty-state">
                    <div className="emoji">🔍</div>
                    <p>No events found</p>
                </div>
            ) : (
                <>
                    <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                        {events.map((e) => <EventCard key={e._id} event={e} linkPrefix="/browse" />)}
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
                            <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
                            <span style={{ padding: '0.375rem 0.75rem', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                                Page {page} of {pagination.totalPages}
                            </span>
                            <button className="btn btn-secondary btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Next →</button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
