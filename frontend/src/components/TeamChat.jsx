import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export default function TeamChat({ teamId }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [typingUsers, setTypingUsers] = useState({});
    const socket = useSocket();
    const { user } = useAuth();
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    // Shared fetch function used on mount, reconnect, and polling
    const fetchMessages = useCallback(() => {
        api.get(`/chat/${teamId}/messages`)
            .then((r) => {
                setMessages((prev) => {
                    const fetched = r.data.messages || [];
                    if (prev.length === 0) return fetched;
                    // Merge: keep existing + add any new ones from server
                    const existingIds = new Set(prev.map((m) => m._id));
                    const newMsgs = fetched.filter((m) => !existingIds.has(m._id));
                    return newMsgs.length > 0 ? [...prev, ...newMsgs] : prev;
                });
            })
            .catch(console.error);
    }, [teamId]);

    // Initial fetch
    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    // Socket events + reconnect handler
    useEffect(() => {
        if (!socket) return;

        socket.emit('teamchat:join', teamId);

        const handleMessage = (msg) => {
            setMessages((prev) => {
                if (prev.some((m) => m._id === msg._id)) return prev;
                return [...prev, msg];
            });
        };

        // On reconnect, re-join room and re-fetch missed messages
        const handleReconnect = () => {
            socket.emit('teamchat:join', teamId);
            fetchMessages();
        };

        const handleTypingEvent = ({ userId, userName, isTyping }) => {
            setTypingUsers((prev) => {
                const next = { ...prev };
                if (isTyping) next[userId] = userName;
                else delete next[userId];
                return next;
            });
        };

        socket.on('teamchat:message', handleMessage);
        socket.on('connect', handleReconnect);
        socket.on('teamchat:typing', handleTypingEvent);
        socket.on('teamchat:online', () => { });

        return () => {
            socket.emit('teamchat:leave', teamId);
            socket.off('teamchat:message', handleMessage);
            socket.off('connect', handleReconnect);
            socket.off('teamchat:typing', handleTypingEvent);
            socket.off('teamchat:online');
        };
    }, [socket, teamId, fetchMessages]);

    // Polling fallback — refetch every 10s to catch any missed messages
    useEffect(() => {
        const interval = setInterval(fetchMessages, 10000);
        return () => clearInterval(interval);
    }, [fetchMessages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleTyping = () => {
        if (!socket) return;
        socket.emit('teamchat:typing', { teamId, isTyping: true, userName: user?.firstName || 'User' });
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('teamchat:typing', { teamId, isTyping: false, userName: '' });
        }, 2000);
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        try {
            const res = await api.post(`/chat/${teamId}/messages`, { content: input });
            setMessages((prev) => {
                if (prev.some((m) => m._id === res.data._id)) return prev;
                return [...prev, res.data];
            });
            setInput('');
            if (socket) socket.emit('teamchat:typing', { teamId, isTyping: false, userName: '' });
        } catch (err) {
            console.error('Send message error:', err);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await api.post(`/chat/${teamId}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setMessages((prev) => {
                if (prev.some((m) => m._id === res.data._id)) return prev;
                return [...prev, res.data];
            });
        } catch (err) {
            console.error('File upload error:', err);
        }
        e.target.value = '';
    };

    const typingList = Object.values(typingUsers).filter(Boolean);

    return (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '500px' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>💬 Team Chat</h3>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '1rem' }}>
                {messages.length === 0 && (
                    <p style={{ textAlign: 'center', opacity: 0.5, margin: 'auto' }}>No messages yet. Start the conversation!</p>
                )}
                {messages.map((msg, i) => {
                    const isMe = msg.sender === user?.id || msg.sender?._id === user?.id;
                    return (
                        <div key={msg._id || i} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                            <div style={{
                                padding: '0.6rem 1rem',
                                borderRadius: isMe ? '12px 12px 0 12px' : '12px 12px 12px 0',
                                background: isMe ? '#444' : 'rgba(255,255,255,0.08)',
                                color: 'white',
                            }}>
                                {!isMe && <div style={{ fontSize: '0.75rem', fontWeight: 'bold', opacity: 0.8, marginBottom: '2px' }}>{msg.senderName}</div>}
                                {msg.messageType === 'file' ? (
                                    <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#ccc', textDecoration: 'underline' }}>
                                        📎 {msg.fileName || 'File'}
                                    </a>
                                ) : (
                                    <span>{msg.content}</span>
                                )}
                            </div>
                            <div style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '2px', textAlign: isMe ? 'right' : 'left' }}>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Typing indicator */}
            {typingList.length > 0 && (
                <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.5rem', fontStyle: 'italic' }}>
                    {typingList.join(', ')} {typingList.length === 1 ? 'is' : 'are'} typing...
                </div>
            )}

            {/* Input */}
            <form onSubmit={sendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                    type="text"
                    className="form-input"
                    placeholder="Type a message..."
                    value={input}
                    onChange={(e) => { setInput(e.target.value); handleTyping(); }}
                    style={{ flex: 1, margin: 0 }}
                />
                <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    📎
                    <input type="file" hidden onChange={handleFileUpload} />
                </label>
                <button type="submit" className="btn btn-primary">Send</button>
            </form>
        </div>
    );
}
