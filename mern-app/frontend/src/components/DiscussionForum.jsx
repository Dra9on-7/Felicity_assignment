import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { forumAPI, API_HOST } from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * Discussion Forum Component (Tier B Feature)
 * Real-time chat for event discussions with threading, reactions, and moderation
 */
const DiscussionForum = ({ eventId, isOrganizer = false }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Connect to Socket.IO
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !eventId) return;

    const socket = io(API_HOST, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('joinForum', eventId);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('newMessage', (message) => {
      setMessages(prev => [...prev, message]);
      setTimeout(scrollToBottom, 100);
    });

    socket.on('reactionUpdated', ({ messageId, reactions }) => {
      setMessages(prev => prev.map(msg =>
        msg._id === messageId ? { ...msg, reactions } : msg
      ));
    });

    socketRef.current = socket;

    return () => {
      socket.emit('leaveForum', eventId);
      socket.disconnect();
    };
  }, [eventId, scrollToBottom]);

  // Load existing messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const res = await forumAPI.getMessages(eventId);
        setMessages(res.data.data.messages || []);
        setTimeout(scrollToBottom, 200);
      } catch (err) {
        console.error('Error loading messages:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [eventId, scrollToBottom]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socketRef.current) return;

    socketRef.current.emit('sendMessage', {
      eventId,
      content: newMessage.trim(),
      parentMessageId: replyTo?._id || null,
      isAnnouncement: isOrganizer && isAnnouncement,
    });

    setNewMessage('');
    setReplyTo(null);
    setIsAnnouncement(false);
  };

  const handleReaction = (messageId, emoji) => {
    if (!socketRef.current) return;
    socketRef.current.emit('toggleReaction', { eventId, messageId, emoji });
  };

  const handlePin = async (messageId) => {
    try {
      await forumAPI.togglePin(eventId, messageId);
      setMessages(prev => prev.map(msg =>
        msg._id === messageId ? { ...msg, isPinned: !msg.isPinned } : msg
      ));
    } catch (err) {
      console.error('Error toggling pin:', err);
    }
  };

  const handleDelete = async (messageId) => {
    if (!confirm('Delete this message?')) return;
    try {
      await forumAPI.deleteMessage(eventId, messageId);
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const getAuthorName = (author) => {
    if (!author) return 'Unknown';
    if (author.role === 'organizer') {
      return author.clubName || author.councilName || author.organizerName || 'Organizer';
    }
    return `${author.firstName || ''} ${author.lastName || ''}`.trim() || author.email;
  };

  const getReactionCounts = (reactions = []) => {
    const counts = {};
    reactions.forEach(r => {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    });
    return counts;
  };

  const hasUserReacted = (reactions = [], emoji) => {
    return reactions.some(r => r.user === user?._id && r.emoji === emoji);
  };

  const emojis = ['👍', '❤️', '🎉', '😂', '🤔', '👏'];

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Loading discussion...</div>;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '500px',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      overflow: 'hidden',
      backgroundColor: '#fafafa',
    }}>
      {/* Header */}
      <div style={{
        padding: '0.75rem 1rem',
        backgroundColor: '#667eea',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontWeight: '600' }}>💬 Discussion Forum</span>
        <span style={{
          fontSize: '0.75rem',
          backgroundColor: connected ? '#22c55e' : '#ef4444',
          padding: '2px 8px',
          borderRadius: '10px',
        }}>
          {connected ? '● Live' : '● Offline'}
        </span>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>
            No messages yet. Start the conversation! 💬
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.author?._id === user?._id;
            const isOrgMsg = msg.author?.role === 'organizer';
            const reactionCounts = getReactionCounts(msg.reactions);

            return (
              <div
                key={msg._id}
                style={{
                  padding: '0.75rem',
                  borderRadius: '10px',
                  backgroundColor: msg.isPinned ? '#fef3c7' : msg.isAnnouncement ? '#ede9fe' : 'white',
                  border: msg.isPinned ? '1px solid #fbbf24' : msg.isAnnouncement ? '1px solid #a78bfa' : '1px solid #e5e7eb',
                  maxWidth: '85%',
                  alignSelf: isMine ? 'flex-end' : 'flex-start',
                  position: 'relative',
                }}
              >
                {/* Pinned / Announcement badge */}
                {(msg.isPinned || msg.isAnnouncement) && (
                  <div style={{ fontSize: '0.7rem', color: msg.isAnnouncement ? '#7c3aed' : '#d97706', marginBottom: '0.25rem', fontWeight: '600' }}>
                    {msg.isPinned && '📌 Pinned'} {msg.isAnnouncement && '📢 Announcement'}
                  </div>
                )}

                {/* Author & time */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{
                    fontWeight: '600',
                    fontSize: '0.8rem',
                    color: isOrgMsg ? '#667eea' : '#374151',
                  }}>
                    {getAuthorName(msg.author)}
                    {isOrgMsg && ' 🏢'}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                    {formatDate(msg.createdAt)} {formatTime(msg.createdAt)}
                  </span>
                </div>

                {/* Reply reference */}
                {msg.parentMessage && (
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    borderLeft: '2px solid #d1d5db',
                    paddingLeft: '0.5rem',
                    marginBottom: '0.25rem',
                    fontStyle: 'italic',
                  }}>
                    ↩ {msg.parentMessage.content?.substring(0, 50)}...
                  </div>
                )}

                {/* Content */}
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.4', wordBreak: 'break-word' }}>
                  {msg.content}
                </p>

                {/* Reactions */}
                <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {Object.entries(reactionCounts).map(([emoji, count]) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(msg._id, emoji)}
                      style={{
                        padding: '2px 6px',
                        borderRadius: '12px',
                        border: hasUserReacted(msg.reactions, emoji) ? '1px solid #667eea' : '1px solid #e5e7eb',
                        backgroundColor: hasUserReacted(msg.reactions, emoji) ? '#eef2ff' : 'transparent',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                      }}
                    >
                      {emoji} {count}
                    </button>
                  ))}

                  {/* Add reaction dropdown */}
                  <div className="emoji-picker" style={{ position: 'relative', display: 'inline-block' }}>
                    <button
                      onClick={(e) => {
                        const picker = e.currentTarget.nextSibling;
                        picker.style.display = picker.style.display === 'flex' ? 'none' : 'flex';
                      }}
                      style={{
                        padding: '2px 6px',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                      }}
                    >
                      +
                    </button>
                    <div style={{
                      display: 'none',
                      position: 'absolute',
                      bottom: '100%',
                      left: 0,
                      gap: '2px',
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '4px',
                      zIndex: 10,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}>
                      {emojis.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(msg._id, emoji)}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1rem', padding: '2px' }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.25rem' }}>
                    <button
                      onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.7rem', color: '#6b7280' }}
                    >
                      ↩ Reply
                    </button>
                    {isOrganizer && (
                      <button
                        onClick={() => handlePin(msg._id)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.7rem', color: '#d97706' }}
                      >
                        📌
                      </button>
                    )}
                    {(isOrganizer || isMine) && (
                      <button
                        onClick={() => handleDelete(msg._id)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.7rem', color: '#ef4444' }}
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyTo && (
        <div style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#f3f4f6',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8rem',
        }}>
          <span>
            ↩ Replying to <strong>{getAuthorName(replyTo.author)}</strong>: {replyTo.content?.substring(0, 40)}...
          </span>
          <button
            onClick={() => setReplyTo(null)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} style={{
        padding: '0.75rem 1rem',
        borderTop: '1px solid #e5e7eb',
        backgroundColor: 'white',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
      }}>
        {isOrganizer && (
          <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input
              type="checkbox"
              checked={isAnnouncement}
              onChange={(e) => setIsAnnouncement(e.target.checked)}
            />
            📢
          </label>
        )}
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={connected ? 'Type a message...' : 'Connecting...'}
          disabled={!connected}
          maxLength={2000}
          style={{
            flex: 1,
            padding: '0.5rem 0.75rem',
            borderRadius: '20px',
            border: '1px solid #d1d5db',
            fontSize: '0.9rem',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={!connected || !newMessage.trim()}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            opacity: !connected || !newMessage.trim() ? 0.5 : 1,
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default DiscussionForum;
