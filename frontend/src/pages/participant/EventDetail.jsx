import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../../api/axios';
import Loading from '../../components/Loading';
import Forum from '../../components/Forum';

export default function EventDetail() {
    const { id } = useParams();
    const [event, setEvent] = useState(null);
    const [isRegistered, setIsRegistered] = useState(false);
    const [isEligible, setIsEligible] = useState(true);
    const [registration, setRegistration] = useState(null);
    const [formResponses, setFormResponses] = useState({});
    const [merchSelections, setMerchSelections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [teamName, setTeamName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [showCreateTeam, setShowCreateTeam] = useState(false);
    const [showJoinTeam, setShowJoinTeam] = useState(false);

    // Feedback state
    const [feedbackRating, setFeedbackRating] = useState(0);
    const [feedbackHover, setFeedbackHover] = useState(0);
    const [feedbackComment, setFeedbackComment] = useState('');
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    const [feedbackLoading, setFeedbackLoading] = useState(false);

    // Payment proof state
    const [paymentFile, setPaymentFile] = useState(null);
    const [uploadingProof, setUploadingProof] = useState(false);

    // Ticket full view
    const [ticketData, setTicketData] = useState(null);
    const [showFullTicket, setShowFullTicket] = useState(false);

    useEffect(() => {
        API.get(`/participants/events/${id}`)
            .then((res) => {
                setEvent(res.data.event);
                setIsRegistered(res.data.isRegistered);
                setRegistration(res.data.registration);
                setIsEligible(res.data.isEligible !== false);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id]);

    // Check if feedback already submitted
    useEffect(() => {
        if (isRegistered && event?.status === 'completed') {
            API.get(`/feedback/${id}/check`)
                .then((res) => setFeedbackSubmitted(res.data.hasSubmitted))
                .catch(() => { });
        }
    }, [isRegistered, event?.status, id]);

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

    const handleCreateTeam = async () => {
        if (!teamName.trim()) {
            setMessage({ type: 'error', text: 'Please enter a team name' });
            return;
        }
        // Validate required custom form fields
        if (event.customForm?.length > 0) {
            for (const field of event.customForm) {
                if (field.required) {
                    const val = formResponses[field.label];
                    if (!val || (Array.isArray(val) && val.length === 0) || (typeof val === 'string' && !val.trim())) {
                        setMessage({ type: 'error', text: `Please fill in the required field: ${field.label}` });
                        return;
                    }
                }
            }
        }
        setSubmitting(true);
        setMessage({ type: '', text: '' });
        try {
            const res = await API.post('/teams/create', { eventId: id, name: teamName, formResponses });
            setMessage({ type: 'success', text: `Team created! Invite code: ${res.data.team.inviteCode}` });
            setShowCreateTeam(false);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to create team' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleJoinTeam = async () => {
        if (!inviteCode.trim()) {
            setMessage({ type: 'error', text: 'Please enter an invite code' });
            return;
        }
        // Validate required custom form fields
        if (event.customForm?.length > 0) {
            for (const field of event.customForm) {
                if (field.required) {
                    const val = formResponses[field.label];
                    if (!val || (Array.isArray(val) && val.length === 0) || (typeof val === 'string' && !val.trim())) {
                        setMessage({ type: 'error', text: `Please fill in the required field: ${field.label}` });
                        return;
                    }
                }
            }
        }
        setSubmitting(true);
        setMessage({ type: '', text: '' });
        try {
            await API.post('/teams/join', { inviteCode, formResponses });
            setMessage({ type: 'success', text: 'Successfully joined the team!' });
            setShowJoinTeam(false);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to join team' });
        } finally {
            setSubmitting(false);
        }
    };

    // Feedback submission
    const handleFeedbackSubmit = async () => {
        if (feedbackRating === 0) {
            setMessage({ type: 'error', text: 'Please select a rating' });
            return;
        }
        setFeedbackLoading(true);
        try {
            await API.post(`/feedback/${id}`, { rating: feedbackRating, comment: feedbackComment });
            setFeedbackSubmitted(true);
            setMessage({ type: 'success', text: 'Thank you for your feedback!' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to submit feedback' });
        } finally {
            setFeedbackLoading(false);
        }
    };

    // Payment proof upload
    const handlePaymentProofUpload = async () => {
        if (!paymentFile) return;
        setUploadingProof(true);
        try {
            const formData = new FormData();
            formData.append('paymentProof', paymentFile);
            await API.post(`/participants/events/${id}/payment-proof`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setMessage({ type: 'success', text: 'Payment proof uploaded successfully!' });
            setPaymentFile(null);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Upload failed' });
        } finally {
            setUploadingProof(false);
        }
    };

    // Fetch full ticket
    const handleViewTicket = async () => {
        if (ticketData) {
            setShowFullTicket(!showFullTicket);
            return;
        }
        try {
            const res = await API.get(`/participants/tickets/${registration._id}`);
            setTicketData(res.data);
            setShowFullTicket(true);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load ticket' });
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
                        {event.isTeamEvent && <span className="badge badge-cyan">👥 Team</span>}
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

                        {/* Custom Form (for NON-team events with custom fields, shown when not registered) */}
                        {event.customForm?.length > 0 && !isRegistered && !event.isTeamEvent && (
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
                                    <div key={item._id} style={{ padding: '1rem 0', borderBottom: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <strong>{item.name}</strong>
                                            <span style={{ color: 'var(--text-secondary)' }}>₹{item.price}</span>
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
                                    <button className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem', width: '100%' }} onClick={handleViewTicket}>
                                        {showFullTicket ? 'Hide Full Ticket' : '🔍 View Full Ticket'}
                                    </button>
                                    {showFullTicket && ticketData && (
                                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', fontSize: 'var(--font-xs)' }}>
                                            {ticketData.qrCode && <img src={ticketData.qrCode} alt="Full QR" style={{ width: '200px', margin: '0 auto 0.5rem', display: 'block' }} />}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                <div><strong>Ticket ID:</strong> {ticketData.ticketId}</div>
                                                <div><strong>Event:</strong> {ticketData.eventName}</div>
                                                <div><strong>Participant:</strong> {ticketData.participantName}</div>
                                                <div><strong>Status:</strong> {ticketData.status}</div>
                                                <div><strong>Registered:</strong> {new Date(ticketData.registeredAt).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Payment Proof Upload (for merchandise with fee) */}
                        {isRegistered && event.type === 'merchandise' && event.registrationFee > 0 && (
                            <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ marginBottom: '0.75rem' }}>💳 Upload Payment Proof</h3>
                                <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                    Upload a screenshot of your payment to get your order approved.
                                </p>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <input type="file" accept="image/*" onChange={(e) => setPaymentFile(e.target.files[0])}
                                        style={{ flex: 1, fontSize: 'var(--font-sm)' }} />
                                    <button className="btn btn-primary btn-sm" onClick={handlePaymentProofUpload}
                                        disabled={!paymentFile || uploadingProof}>
                                        {uploadingProof ? 'Uploading...' : '📤 Upload'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Feedback Section (when event is completed) */}
                        {isRegistered && event.status === 'completed' && (
                            <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ marginBottom: '0.75rem' }}>⭐ Event Feedback</h3>
                                {feedbackSubmitted ? (
                                    <div className="badge badge-green" style={{ padding: '0.5rem', justifyContent: 'center', width: '100%' }}>
                                        ✅ Thank you for your feedback!
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.75rem', justifyContent: 'center' }}>
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button key={star}
                                                    onClick={() => setFeedbackRating(star)}
                                                    onMouseEnter={() => setFeedbackHover(star)}
                                                    onMouseLeave={() => setFeedbackHover(0)}
                                                    style={{
                                                        background: 'none', border: 'none', cursor: 'pointer',
                                                        fontSize: '2rem', color: star <= (feedbackHover || feedbackRating) ? '#FFD700' : '#555',
                                                        transition: 'color 0.15s, transform 0.15s',
                                                        transform: star <= (feedbackHover || feedbackRating) ? 'scale(1.1)' : 'scale(1)',
                                                    }}>
                                                    ★
                                                </button>
                                            ))}
                                        </div>
                                        {feedbackRating > 0 && (
                                            <p style={{ textAlign: 'center', fontSize: 'var(--font-sm)', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                                {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][feedbackRating]}
                                            </p>
                                        )}
                                        <div className="form-group">
                                            <textarea className="form-input" placeholder="Share your thoughts (optional)..."
                                                value={feedbackComment} onChange={(e) => setFeedbackComment(e.target.value)}
                                                rows={3} />
                                        </div>
                                        <button className="btn btn-primary" style={{ width: '100%' }}
                                            onClick={handleFeedbackSubmit} disabled={feedbackLoading || feedbackRating === 0}>
                                            {feedbackLoading ? 'Submitting...' : 'Submit Feedback'}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Forum Section (when registered) */}
                        {isRegistered && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <Forum eventId={id} />
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
                                {event.isTeamEvent && <div><span style={{ color: 'var(--text-muted)' }}>👥 Team Size:</span> {event.teamSize?.min || 2}–{event.teamSize?.max || 4}</div>}
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
                                ) : !isEligible ? (
                                    <div className="badge badge-red" style={{ width: '100%', justifyContent: 'center', padding: '0.5rem', textAlign: 'center' }}>
                                        🚫 Not eligible — this event is for {event.eligibility} participants only
                                    </div>
                                ) : event.isTeamEvent ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', textAlign: 'center' }}>
                                            👥 Team event — {event.teamSize?.min || 2}–{event.teamSize?.max || 4} members
                                        </div>
                                        {!showCreateTeam && !showJoinTeam && (
                                            <>
                                                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowCreateTeam(true)}>
                                                    ➕ Create Team
                                                </button>
                                                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setShowJoinTeam(true)}>
                                                    🔗 Join Team
                                                </button>
                                                <Link to="/teams" className="btn btn-secondary btn-sm" style={{ width: '100%', textAlign: 'center' }}>
                                                    📋 My Teams
                                                </Link>
                                            </>
                                        )}
                                        {showCreateTeam && (
                                            <div>
                                                <div className="form-group">
                                                    <label>Team Name</label>
                                                    <input className="form-input" placeholder="Enter team name" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
                                                </div>
                                                {/* Required custom form fields inline */}
                                                {event.customForm?.length > 0 && (
                                                    <div style={{ marginBottom: '0.75rem' }}>
                                                        <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Registration Fields</p>
                                                        {event.customForm.map((field) => (
                                                            <div key={field._id} className="form-group" style={{ marginBottom: '0.5rem' }}>
                                                                <label style={{ fontSize: 'var(--font-sm)' }}>{field.label} {field.required && <span style={{ color: 'var(--danger)' }}>*</span>}</label>
                                                                {field.fieldType === 'text' || field.fieldType === 'email' || field.fieldType === 'number' ? (
                                                                    <input type={field.fieldType} className="form-input" required={field.required}
                                                                        value={formResponses[field.label] || ''}
                                                                        onChange={(e) => setFormResponses({ ...formResponses, [field.label]: e.target.value })} />
                                                                ) : field.fieldType === 'textarea' ? (
                                                                    <textarea className="form-input" required={field.required}
                                                                        value={formResponses[field.label] || ''}
                                                                        onChange={(e) => setFormResponses({ ...formResponses, [field.label]: e.target.value })} />
                                                                ) : field.fieldType === 'dropdown' ? (
                                                                    <select className="form-input" required={field.required}
                                                                        value={formResponses[field.label] || ''}
                                                                        onChange={(e) => setFormResponses({ ...formResponses, [field.label]: e.target.value })}>
                                                                        <option value="">Select...</option>
                                                                        {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                                                    </select>
                                                                ) : field.fieldType === 'checkbox' ? (
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                                        {field.options?.map((opt) => (
                                                                            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: 'var(--font-xs)' }}>
                                                                                <input type="checkbox"
                                                                                    checked={(formResponses[field.label] || []).includes(opt)}
                                                                                    onChange={(e) => {
                                                                                        const cur = formResponses[field.label] || [];
                                                                                        setFormResponses({
                                                                                            ...formResponses,
                                                                                            [field.label]: e.target.checked ? [...cur, opt] : cur.filter((v) => v !== opt),
                                                                                        });
                                                                                    }} /> {opt}
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                ) : field.fieldType === 'radio' ? (
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                                        {field.options?.map((opt) => (
                                                                            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: 'var(--font-xs)' }}>
                                                                                <input type="radio" name={`team-form-create-${field._id}`}
                                                                                    checked={formResponses[field.label] === opt}
                                                                                    onChange={() => setFormResponses({ ...formResponses, [field.label]: opt })} /> {opt}
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button className="btn btn-primary btn-sm" onClick={handleCreateTeam} disabled={submitting}>
                                                        {submitting ? 'Creating...' : 'Create'}
                                                    </button>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => setShowCreateTeam(false)}>Cancel</button>
                                                </div>
                                            </div>
                                        )}
                                        {showJoinTeam && (
                                            <div>
                                                <div className="form-group">
                                                    <label>Invite Code</label>
                                                    <input className="form-input" placeholder="e.g. A1B2C3D4" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
                                                </div>
                                                {/* Required custom form fields inline */}
                                                {event.customForm?.length > 0 && (
                                                    <div style={{ marginBottom: '0.75rem' }}>
                                                        <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Registration Fields</p>
                                                        {event.customForm.map((field) => (
                                                            <div key={field._id} className="form-group" style={{ marginBottom: '0.5rem' }}>
                                                                <label style={{ fontSize: 'var(--font-sm)' }}>{field.label} {field.required && <span style={{ color: 'var(--danger)' }}>*</span>}</label>
                                                                {field.fieldType === 'text' || field.fieldType === 'email' || field.fieldType === 'number' ? (
                                                                    <input type={field.fieldType} className="form-input" required={field.required}
                                                                        value={formResponses[field.label] || ''}
                                                                        onChange={(e) => setFormResponses({ ...formResponses, [field.label]: e.target.value })} />
                                                                ) : field.fieldType === 'textarea' ? (
                                                                    <textarea className="form-input" required={field.required}
                                                                        value={formResponses[field.label] || ''}
                                                                        onChange={(e) => setFormResponses({ ...formResponses, [field.label]: e.target.value })} />
                                                                ) : field.fieldType === 'dropdown' ? (
                                                                    <select className="form-input" required={field.required}
                                                                        value={formResponses[field.label] || ''}
                                                                        onChange={(e) => setFormResponses({ ...formResponses, [field.label]: e.target.value })}>
                                                                        <option value="">Select...</option>
                                                                        {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                                                    </select>
                                                                ) : field.fieldType === 'checkbox' ? (
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                                        {field.options?.map((opt) => (
                                                                            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: 'var(--font-xs)' }}>
                                                                                <input type="checkbox"
                                                                                    checked={(formResponses[field.label] || []).includes(opt)}
                                                                                    onChange={(e) => {
                                                                                        const cur = formResponses[field.label] || [];
                                                                                        setFormResponses({
                                                                                            ...formResponses,
                                                                                            [field.label]: e.target.checked ? [...cur, opt] : cur.filter((v) => v !== opt),
                                                                                        });
                                                                                    }} /> {opt}
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                ) : field.fieldType === 'radio' ? (
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                                        {field.options?.map((opt) => (
                                                                            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: 'var(--font-xs)' }}>
                                                                                <input type="radio" name={`team-form-join-${field._id}`}
                                                                                    checked={formResponses[field.label] === opt}
                                                                                    onChange={() => setFormResponses({ ...formResponses, [field.label]: opt })} /> {opt}
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button className="btn btn-primary btn-sm" onClick={handleJoinTeam} disabled={submitting}>
                                                        {submitting ? 'Joining...' : 'Join'}
                                                    </button>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => setShowJoinTeam(false)}>Cancel</button>
                                                </div>
                                            </div>
                                        )}
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
