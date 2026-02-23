import { useState, useEffect, useRef } from 'react';
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

    useEffect(() => {
        api.get(`/chat/${teamId}/messages`)
            .then((r) => setMessages(r.data.messages))
            .catch(console.error);
    }, [teamId]);

    useEffect(() => {
        if (!socket) return;

        socket.emit('teamchat:join', teamId);

        socket.on('teamchat:message', (msg) => {
            setMessages((prev) => [...prev, msg]);
        });

        socket.on('teamchat:typing', ({ userId, userName, isTyping }) => {
            setTypingUsers((prev) => {
                const next = { ...prev };
                if (isTyping) next[userId] = userName;
                else delete next[userId];
                return next;
            });
        });

        socket.on('teamchat:online', ({ userId, online }) => {
            // Could be used for online indicators
        });

        return () => {
            socket.emit('teamchat:leave', teamId);
            socket.off('teamchat:message');
            socket.off('teamchat:typing');
            socket.off('teamchat:online');
        };
    }, [socket, teamId]);

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
            await api.post(`/chat/${teamId}/messages`, { content: input });
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
            await api.post(`/chat/${teamId}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        } catch (err) {
            console.error('File upload error:', err);
        }
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
