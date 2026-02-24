import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export default function Forum({ eventId, isOrganizer = false }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [replyTo, setReplyTo] = useState(null);
    const [isAnnouncement, setIsAnnouncement] = useState(false);
    const socket = useSocket();
    const { user } = useAuth();
    const containerRef = useRef(null);

    useEffect(() => {
        api.get(`/forum/${eventId}/messages`)
            .then((r) => setMessages(r.data.messages))
            .catch(console.error);
    }, [eventId]);

    useEffect(() => {
        if (!socket) return;

        socket.emit('forum:join', eventId);

        socket.on('forum:message', (msg) => {
            setMessages((prev) => {
                // Deduplicate — skip if already added by optimistic update
                if (msg.parentMessage) {
                    const parent = prev.find((m) => m._id === msg.parentMessage);
                    if (parent?.replies?.some((r) => r._id === msg._id)) return prev;
                    return prev.map((m) =>
                        m._id === msg.parentMessage
                            ? { ...m, replies: [...(m.replies || []), msg] }
                            : m
                    );
                }
                if (prev.some((m) => m._id === msg._id)) return prev;
                return [msg, ...prev];
            });
        });

        socket.on('forum:delete', ({ messageId }) => {
            setMessages((prev) => prev.filter((m) => m._id !== messageId));
        });

        socket.on('forum:pin', ({ messageId, isPinned }) => {
            setMessages((prev) =>
                prev.map((m) => (m._id === messageId ? { ...m, isPinned } : m))
            );
        });

        socket.on('forum:reaction', ({ messageId, reactions }) => {
            setMessages((prev) =>
                prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
            );
        });

        return () => {
            socket.emit('forum:leave', eventId);
            socket.off('forum:message');
            socket.off('forum:delete');
            socket.off('forum:pin');
            socket.off('forum:reaction');
        };
    }, [socket, eventId]);

    const postMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        try {
            const res = await api.post(`/forum/${eventId}/messages`, {
                content: input,
                parentMessage: replyTo,
                isAnnouncement,
            });
            // Optimistic update — add message to state immediately
            const newMsg = res.data;
            setMessages((prev) => {
                if (newMsg.parentMessage) {
                    if (prev.find((m) => m._id === newMsg.parentMessage)?.replies?.some((r) => r._id === newMsg._id)) return prev;
                    return prev.map((m) =>
                        m._id === newMsg.parentMessage
                            ? { ...m, replies: [...(m.replies || []), newMsg] }
                            : m
                    );
                }
                if (prev.some((m) => m._id === newMsg._id)) return prev;
                return [newMsg, ...prev];
            });
            setInput('');
            setReplyTo(null);
            setIsAnnouncement(false);
        } catch (err) {
            console.error('Post message error:', err);
        }
    };

    const deleteMessage = async (msgId) => {
        if (!confirm('Delete this message?')) return;
        try {
            await api.delete(`/forum/messages/${msgId}`);
            // Optimistic update — remove message immediately
            setMessages((prev) => prev.filter((m) => m._id !== msgId).map((m) => ({
                ...m,
                replies: m.replies?.filter((r) => r._id !== msgId),
            })));
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    const pinMessage = async (msgId) => {
        try {
            const res = await api.put(`/forum/messages/${msgId}/pin`);
            // Optimistic update — toggle pin state immediately
            setMessages((prev) =>
                prev.map((m) => (m._id === msgId ? { ...m, isPinned: res.data.isPinned } : m))
            );
        } catch (err) {
            console.error('Pin error:', err);
        }
    };

    const reactToMessage = async (msgId, emoji) => {
        try {
            const res = await api.post(`/forum/messages/${msgId}/react`, { emoji });
            // Optimistic update — update reactions immediately
            setMessages((prev) =>
                prev.map((m) => (m._id === msgId ? { ...m, reactions: res.data.reactions } : m))
            );
        } catch (err) {
            console.error('React error:', err);
        }
    };

    const emojis = ['👍', '❤️', '😂', '🎉', '🤔'];

    const renderMessage = (msg, isReply = false) => (
        <div
            key={msg._id}
            style={{
                padding: '1rem',
                background: msg.isPinned
                    ? 'rgba(255,255,255,0.08)'
                    : msg.isAnnouncement
                        ? 'rgba(255,255,255,0.12)'
                        : 'rgba(255,255,255,0.03)',
                borderRadius: '8px',
                borderLeft: msg.isAnnouncement
                    ? '3px solid var(--accent)'
                    : msg.isPinned
                        ? '3px solid #999'
                        : '3px solid transparent',
                marginLeft: isReply ? '2rem' : 0,
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong style={{ color: msg.authorRole === 'organizer' ? 'var(--accent)' : 'inherit' }}>
                        {msg.authorName}
                    </strong>
                    {msg.authorRole === 'organizer' && <span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>Organizer</span>}
                    {msg.isPinned && <span style={{ fontSize: '0.8rem' }}>📌</span>}
                    {msg.isAnnouncement && <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>Announcement</span>}
                </div>
                <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>
                    {new Date(msg.createdAt).toLocaleString()}
                </span>
            </div>

            <p style={{ margin: '0.5rem 0', lineHeight: 1.6 }}>{msg.content}</p>

            {/* Reactions */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {msg.reactions && Object.entries(msg.reactions).map(([emoji, users]) =>
                    users.length > 0 ? (
                        <button
                            key={emoji}
                            onClick={() => reactToMessage(msg._id, emoji)}
                            style={{
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: 'rgba(255,255,255,0.1)',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                color: 'white',
                            }}
                        >
                            {emoji} {users.length}
                        </button>
                    ) : null
                )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {emojis.map((e) => (
                    <button
                        key={e}
                        onClick={() => reactToMessage(msg._id, e)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', opacity: 0.6, padding: '2px' }}
                        title={`React with ${e}`}
                    >
                        {e}
                    </button>
                ))}
                {!isReply && (
                    <button
                        onClick={() => setReplyTo(msg._id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--accent)' }}
                    >
                        ↩ Reply
                    </button>
                )}
                {isOrganizer && (
                    <>
                        <button onClick={() => pinMessage(msg._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#999' }}>
                            {msg.isPinned ? 'Unpin' : '📌 Pin'}
                        </button>
                        <button onClick={() => deleteMessage(msg._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#888' }}>
                            🗑 Delete
                        </button>
                    </>
                )}
            </div>
        </div>
    );

    return (
        <div className="glass-card" ref={containerRef}>
            <h3 style={{ marginTop: 0 }}>💬 Discussion Forum</h3>

            {/* Input */}
            <form onSubmit={postMessage} style={{ marginBottom: '1.5rem' }}>
                {replyTo && (
                    <div style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Replying to message...</span>
                        <button type="button" onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>✕ Cancel</button>
                    </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Write a message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        style={{ flex: 1, margin: 0 }}
                    />
                    <button type="submit" className="btn btn-primary">Post</button>
                </div>
                {isOrganizer && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={isAnnouncement} onChange={(e) => setIsAnnouncement(e.target.checked)} />
                        Post as announcement
                    </label>
                )}
            </form>

            {/* Messages */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {messages.length === 0 && (
                    <p style={{ textAlign: 'center', opacity: 0.5 }}>No messages yet. Start the discussion!</p>
                )}
                {messages.map((msg) => (
                    <div key={msg._id}>
                        {renderMessage(msg)}
                        {msg.replies?.map((reply) => renderMessage(reply, true))}
                    </div>
                ))}
            </div>
        </div>
    );
}
