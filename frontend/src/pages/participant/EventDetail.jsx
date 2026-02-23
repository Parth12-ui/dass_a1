import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import API from '../../api/axios';
import Loading from '../../components/Loading';

export default function EventDetail() {
    const { id } = useParams();
    const [event, setEvent] = useState(null);
    const [isRegistered, setIsRegistered] = useState(false);
    const [registration, setRegistration] = useState(null);
    const [formResponses, setFormResponses] = useState({});
    const [merchSelections, setMerchSelections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        API.get(`/participants/events/${id}`)
            .then((res) => {
                setEvent(res.data.event);
                setIsRegistered(res.data.isRegistered);
                setRegistration(res.data.registration);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id]);

    const handleRegister = async () => {
        setSubmitting(true);
        setMessage({ type: '', text: '' });
        try {
            const res = await API.post(`/participants/events/${id}/register`, { formResponses });
            setIsRegistered(true);
            setRegistration(res.data.registration);
            setMessage({ type: 'success', text: 'Registration successful! Check your email for the ticket.' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Registration failed' });
        } finally {
            setSubmitting(false);
        }
    };

    const handlePurchase = async () => {
        if (merchSelections.length === 0) {
            setMessage({ type: 'error', text: 'Please select at least one item' });
            return;
        }
        setSubmitting(true);
        setMessage({ type: '', text: '' });
        try {
            const res = await API.post(`/participants/events/${id}/purchase`, { selections: merchSelections });
            setIsRegistered(true);
            setRegistration(res.data.registration);
            setMessage({ type: 'success', text: `Purchase successful! Total: ₹${res.data.totalCost}` });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Purchase failed' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <Loading />;
    if (!event) return <div className="page-container"><div className="empty-state"><p>Event not found</p></div></div>;

    const deadlinePassed = new Date() > new Date(event.registrationDeadline);
    const limitReached = event.registrationLimit > 0 && event.registrationCount >= event.registrationLimit;

    return (
        <div className="page-container">
            <div className="fade-in">
                {/* Header */}
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <span className={`badge ${event.type === 'merchandise' ? 'badge-yellow' : 'badge-purple'}`}>{event.type}</span>
                        <span className={`badge ${event.status === 'published' ? 'badge-green' : 'badge-blue'}`}>{event.status}</span>
                        {event.eligibility !== 'all' && <span className="badge badge-cyan">{event.eligibility} only</span>}
                    </div>
                    <h1 style={{ fontSize: 'var(--font-4xl)', fontWeight: 800 }}>{event.name}</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>by {event.organizer?.name || 'Unknown'}</p>
                </div>

                <div className="grid-2" style={{ gap: '2rem', gridTemplateColumns: '2fr 1fr' }}>
                    {/* Left: Details */}
                    <div>
                        <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ marginBottom: '0.75rem' }}>Description</h3>
                            <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{event.description || 'No description provided'}</p>
                        </div>

                        {event.tags?.length > 0 && (
                            <div className="tag-chips" style={{ marginBottom: '1.5rem' }}>
                                {event.tags.map((tag) => <span key={tag} className="tag-chip">{tag}</span>)}
                            </div>
                        )}

                        {/* Custom Form (Normal) */}
                        {event.type === 'normal' && event.customForm?.length > 0 && !isRegistered && (
                            <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ marginBottom: '1rem' }}>Registration Form</h3>
                                {event.customForm.map((field) => (
                                    <div key={field._id} className="form-group">
                                        <label>{field.label} {field.required && <span style={{ color: 'var(--danger)' }}>*</span>}</label>
                                        {field.fieldType === 'text' || field.fieldType === 'email' || field.fieldType === 'number' ? (
                                            <input type={field.fieldType} className="form-input" required={field.required}
                                                onChange={(e) => setFormResponses({ ...formResponses, [field.label]: e.target.value })} />
                                        ) : field.fieldType === 'textarea' ? (
                                            <textarea className="form-input" required={field.required}
                                                onChange={(e) => setFormResponses({ ...formResponses, [field.label]: e.target.value })} />
                                        ) : field.fieldType === 'dropdown' ? (
                                            <select className="form-input" required={field.required}
                                                onChange={(e) => setFormResponses({ ...formResponses, [field.label]: e.target.value })}>
                                                <option value="">Select...</option>
                                                {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        ) : field.fieldType === 'checkbox' ? (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                {field.options?.map((opt) => (
                                                    <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: 'var(--font-sm)' }}>
                                                        <input type="checkbox" onChange={(e) => {
                                                            const cur = formResponses[field.label] || [];
                                                            setFormResponses({
                                                                ...formResponses,
                                                                [field.label]: e.target.checked ? [...cur, opt] : cur.filter((v) => v !== opt),
                                                            });
                                                        }} /> {opt}
                                                    </label>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Merchandise Items */}
                        {event.type === 'merchandise' && event.merchandiseItems?.length > 0 && !isRegistered && (
                            <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ marginBottom: '1rem' }}>Select Items</h3>
                                {event.merchandiseItems.map((item) => (
                                    <div key={item._id} style={{ padding: '1rem 0', borderBottom: '1px solid var(--border-glass)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <strong>{item.name}</strong>
                                            <span style={{ color: 'var(--accent-secondary)' }}>₹{item.price}</span>
                                        </div>
                                        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', margin: '0.25rem 0' }}>
                                            Stock: {item.stockQuantity} | Limit: {item.purchaseLimitPerParticipant}/person
                                        </div>
                                        {item.stockQuantity > 0 ? (
                                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                                {item.sizes?.length > 0 && (
                                                    <select className="form-input" style={{ width: 'auto' }}
                                                        onChange={(e) => {
                                                            const idx = merchSelections.findIndex((s) => s.itemId === item._id);
                                                            const sel = { itemId: item._id, size: e.target.value, quantity: 1 };
                                                            if (idx > -1) { const ns = [...merchSelections]; ns[idx] = { ...ns[idx], ...sel }; setMerchSelections(ns); }
                                                            else setMerchSelections([...merchSelections, sel]);
                                                        }}>
                                                        <option value="">Size</option>
                                                        {item.sizes.map((s) => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                )}
                                                {item.colors?.length > 0 && (
                                                    <select className="form-input" style={{ width: 'auto' }}
                                                        onChange={(e) => {
                                                            const idx = merchSelections.findIndex((s) => s.itemId === item._id);
                                                            if (idx > -1) { const ns = [...merchSelections]; ns[idx].color = e.target.value; setMerchSelections(ns); }
                                                        }}>
                                                        <option value="">Color</option>
                                                        {item.colors.map((c) => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                )}
                                                <button className="btn btn-primary btn-sm"
                                                    onClick={() => {
                                                        const exists = merchSelections.find((s) => s.itemId === item._id);
                                                        if (!exists) setMerchSelections([...merchSelections, { itemId: item._id, quantity: 1 }]);
                                                    }}>
                                                    + Add
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="badge badge-red" style={{ marginTop: '0.5rem' }}>Out of Stock</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Ticket display */}
                        {isRegistered && registration && (
                            <div className="ticket" style={{ marginBottom: '1.5rem' }}>
                                <div className="ticket-header">
                                    <h3>🎫 Your Ticket</h3>
                                </div>
                                <div className="ticket-body">
                                    {registration.qrCode && <img src={registration.qrCode} alt="QR Code" className="qr-code" />}
                                    <div className="ticket-id">{registration.ticketId}</div>
                                    <div className="ticket-info">
                                        <div><span>Event</span><span>{event.name}</span></div>
                                        <div><span>Status</span><span>{registration.status}</span></div>
                                        <div><span>Date</span><span>{new Date(registration.registeredAt).toLocaleDateString()}</span></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Sidebar */}
                    <div>
                        <div className="glass-card">
                            <h3 style={{ marginBottom: '1rem' }}>Event Info</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: 'var(--font-sm)' }}>
                                <div><span style={{ color: 'var(--text-muted)' }}>📅 Start:</span> {new Date(event.startDate).toLocaleDateString()}</div>
                                <div><span style={{ color: 'var(--text-muted)' }}>📅 End:</span> {new Date(event.endDate).toLocaleDateString()}</div>
                                <div><span style={{ color: 'var(--text-muted)' }}>⏰ Deadline:</span> {new Date(event.registrationDeadline).toLocaleDateString()}</div>
                                <div><span style={{ color: 'var(--text-muted)' }}>💰 Fee:</span> {event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free'}</div>
                                <div><span style={{ color: 'var(--text-muted)' }}>👥 Registered:</span> {event.registrationCount}{event.registrationLimit > 0 ? ` / ${event.registrationLimit}` : ''}</div>
                                <div><span style={{ color: 'var(--text-muted)' }}>📧 Contact:</span> {event.organizer?.contactEmail || 'N/A'}</div>
                            </div>

                            {/* Messages */}
                            {message.text && (
                                <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginTop: '1rem' }}>
                                    {message.text}
                                </div>
                            )}

                            {/* Action buttons */}
                            <div style={{ marginTop: '1.5rem' }}>
                                {isRegistered ? (
                                    <div className="badge badge-green" style={{ width: '100%', justifyContent: 'center', padding: '0.5rem' }}>
                                        ✅ Already Registered
                                    </div>
                                ) : deadlinePassed ? (
                                    <div className="badge badge-red" style={{ width: '100%', justifyContent: 'center', padding: '0.5rem' }}>
                                        ⏰ Deadline Passed
                                    </div>
                                ) : limitReached ? (
                                    <div className="badge badge-red" style={{ width: '100%', justifyContent: 'center', padding: '0.5rem' }}>
                                        🚫 Registration Full
                                    </div>
                                ) : event.type === 'normal' ? (
                                    <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleRegister} disabled={submitting}>
                                        {submitting ? 'Registering...' : 'Register Now'}
                                    </button>
                                ) : (
                                    <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handlePurchase} disabled={submitting}>
                                        {submitting ? 'Processing...' : 'Purchase'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
