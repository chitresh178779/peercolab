import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, MessageSquareCode, Users, ChevronLeft, MessageSquare, Trash2 } from 'lucide-react';
import { API_BASE_URL } from '../config';

function TeamChat({ user, socket }) {
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [deleteMessageId, setDeleteMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Fetch friends list on mount
  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/users/${user.id}/friends`)
      .then(res => setFriends(res.data))
      .catch(err => console.error('Error fetching friends list:', err));
  }, [user.id]);

  // Load chat history when selectedFriend changes
  useEffect(() => {
    setIsPeerTyping(false);
    setDeleteMessageId(null);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (!selectedFriend) {
      setMessages([]);
      return;
    }

    setLoading(true);
    axios.get(`${API_BASE_URL}/api/chat/history/${user.id}/${selectedFriend._id}`)
      .then(res => {
        setMessages(res.data);
        setLoading(false);
        setTimeout(scrollToBottom, 50);
      })
      .catch(err => {
        console.error('Error fetching chat history:', err);
        setLoading(false);
      });
  }, [selectedFriend, user.id]);

  // Listen for real-time incoming DMs, typing events, and deletion events
  useEffect(() => {
    if (!socket) return;

    const handleReceiveDirectMessage = (msg) => {
      if (selectedFriend) {
        const isCurrentChat = 
          (msg.sender._id === selectedFriend._id && msg.recipient._id === user.id) ||
          (msg.sender._id === user.id && msg.recipient._id === selectedFriend._id) ||
          (msg.sender === selectedFriend._id && msg.recipient === user.id) ||
          (msg.sender === user.id && msg.recipient === selectedFriend._id);

        if (isCurrentChat) {
          setMessages(prev => [...prev, msg]);
        }
      }
    };

    const handleReceiveTyping = (data) => {
      if (selectedFriend && data.senderId === selectedFriend._id) {
        setIsPeerTyping(data.isTyping);
      }
    };

    const handleMessageDeleted = (data) => {
      setMessages(prev => prev.map(m => m._id === data.messageId ? { ...m, isDeletedForEveryone: true } : m));
    };

    socket.on('receive_direct_message', handleReceiveDirectMessage);
    socket.on('receive_typing', handleReceiveTyping);
    socket.on('message_deleted', handleMessageDeleted);

    return () => {
      socket.off('receive_direct_message', handleReceiveDirectMessage);
      socket.off('receive_typing', handleReceiveTyping);
      socket.off('message_deleted', handleMessageDeleted);
    };
  }, [socket, selectedFriend, user.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPeerTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);

    if (socket && selectedFriend) {
      socket.emit('typing', {
        senderId: user.id,
        recipientId: selectedFriend._id,
        isTyping: true
      });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', {
          senderId: user.id,
          recipientId: selectedFriend._id,
          isTyping: false
        });
      }, 1500);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedFriend) return;

    if (socket) {
      socket.emit('send_direct_message', {
        senderId: user.id,
        recipientId: selectedFriend._id,
        content: inputText.trim()
      });
      setInputText('');

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      socket.emit('typing', {
        senderId: user.id,
        recipientId: selectedFriend._id,
        isTyping: false
      });
    }
  };

  const handleDeleteForMe = async (messageId) => {
    try {
      await axios.put(`${API_BASE_URL}/api/chat/message/${messageId}/delete-me`, { userId: user.id });
      setMessages(prev => prev.filter(m => m._id !== messageId));
      setDeleteMessageId(null);
    } catch (err) {
      console.error('Error deleting message for me:', err);
    }
  };

  const handleDeleteForEveryone = async (messageId) => {
    try {
      await axios.put(`${API_BASE_URL}/api/chat/message/${messageId}/delete-everyone`, { userId: user.id });
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, isDeletedForEveryone: true } : m));
      setDeleteMessageId(null);
    } catch (err) {
      console.error('Error deleting message for everyone:', err);
    }
  };

  return (
    <div className="feed-pane team-chat-pane" style={{ display: 'flex', height: '520px', padding: 0, overflow: 'hidden' }}>
      
      <style>{`
        @keyframes bounce-dot {
          0%, 80%, 100% { transform: scale(0.3); opacity: 0.5; }
          40% { transform: scale(1.1); opacity: 1; }
        }
        .dot-bounce {
          animation: bounce-dot 1.4s infinite ease-in-out both;
        }
        .msg-delete-btn {
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .msg-container:hover .msg-delete-btn {
          opacity: 0.6;
        }
        .msg-delete-btn:hover {
          opacity: 1 !important;
          color: var(--accent-rose) !important;
        }
      `}</style>

      {/* FRIENDS DIRECTORY COLUMN */}
      <div 
        style={{ 
          width: selectedFriend ? '30%' : '100%', 
          borderRight: '2.5px solid #000000',
          display: !selectedFriend ? 'flex' : 'none',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: '#faf8f5'
        }}
        className="chat-sidebar-desktop"
      >
        <div style={{ padding: '1rem', borderBottom: '2.5px solid #000000', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={18} style={{ color: '#000000' }} />
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: '#000000' }}>Study Partners</span>
        </div>
        <div style={{ flexGrow: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {friends.length === 0 ? (
            <p style={{ fontSize: '0.825rem', color: '#000000', textAlign: 'center', marginTop: '2rem', fontStyle: 'italic' }}>
              No study partners added yet. Go to Partners page to add friends!
            </p>
          ) : (
            friends.map(friend => {
              const isSelected = selectedFriend?._id === friend._id;
              return (
                <div 
                  key={friend._id}
                  onClick={() => setSelectedFriend(friend)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    marginBottom: '0.4rem',
                    transition: 'var(--transition-fast)',
                    backgroundColor: isSelected ? '#000000' : 'transparent',
                    border: '2px solid',
                    borderColor: isSelected ? '#000000' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem'
                  }}
                  className="chat-friend-item"
                >
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isSelected ? '#ffffff' : '#000000' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: isSelected ? '#ffffff' : '#000000' }}>
                    {friend.username}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CHAT MESSAGING COLUMN */}
      <div 
        style={{ 
          width: '100%', 
          display: selectedFriend ? 'flex' : 'none',
          flexDirection: 'column',
          height: '100%',
          padding: '1rem'
        }}
        className="chat-window-desktop"
      >
        {selectedFriend ? (
          <>
            {/* Chat Header */}
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem', 
                borderBottom: '1px solid var(--border-light)', 
                paddingBottom: '0.75rem', 
                marginBottom: '0.75rem',
                flexShrink: 0
              }}
            >
              <button 
                onClick={() => setSelectedFriend(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  borderRadius: '6px',
                  transition: 'var(--transition-fast)'
                }}
                title="Back to partner list"
              >
                <ChevronLeft size={20} />
              </button>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.05rem', color: '#000000' }}>
                  {selectedFriend.username}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Private Conversation</span>
              </div>
            </div>

            {/* Chat Body */}
            <div 
              style={{ 
                flexGrow: 1, 
                overflowY: 'auto', 
                paddingRight: '4px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                marginBottom: '0.5rem'
              }}
            >
              {loading ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', margin: 'auto' }}>Loading chat history...</p>
              ) : messages.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <MessageSquare size={28} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                  <p style={{ fontSize: '0.825rem', fontStyle: 'italic' }}>No messages yet. Send a message to start!</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMe = msg.sender?._id === user.id || msg.sender === user.id;
                  
                  return (
                    <div 
                      key={msg._id || index} 
                      style={{ 
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        maxWidth: '80%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMe ? 'flex-end' : 'flex-start'
                      }}
                      className="animate-fade-in msg-container"
                    >
                      {msg.isDeletedForEveryone ? (
                        <div 
                          style={{ 
                            padding: '0.65rem 0.95rem', 
                            borderRadius: '12px', 
                            borderTopRightRadius: isMe ? '2px' : '12px',
                            borderTopLeftRadius: isMe ? '12px' : '2px',
                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                            border: '1px dashed var(--border-light)',
                            color: 'var(--text-muted)',
                            fontSize: '0.825rem',
                            fontStyle: 'italic',
                            lineHeight: 1.4,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <span style={{ fontSize: '0.9rem' }}>🚫</span>
                          <span>This message was deleted</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                          <div 
                            style={{ 
                              padding: '0.65rem 0.95rem', 
                              borderRadius: '12px', 
                              borderTopRightRadius: isMe ? '2px' : '12px',
                              borderTopLeftRadius: isMe ? '12px' : '2px',
                              backgroundColor: isMe ? '#ffffff' : '#f5f5f4',
                              border: '2px solid #000000',
                              color: '#000000',
                              fontSize: '0.875rem',
                              lineHeight: 1.4,
                              wordBreak: 'break-word',
                              boxShadow: '2.5px 2.5px 0px #000000',
                              fontWeight: 700
                            }}
                          >
                            {msg.content}
                          </div>
                          {msg._id && (
                            <button
                              onClick={() => setDeleteMessageId(msg._id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                borderRadius: '4px',
                                outline: 'none'
                              }}
                              className="msg-delete-btn"
                              title="Delete Message"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Deletion Dialog Popup */}
                      {deleteMessageId === msg._id && (
                        <div 
                          style={{ 
                            backgroundColor: '#1e293b', 
                            border: '1.5px solid var(--border-light)', 
                            padding: '0.65rem', 
                            borderRadius: '8px', 
                            marginTop: '0.35rem', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '0.5rem',
                            alignItems: isMe ? 'flex-end' : 'flex-start',
                            zIndex: 10,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                          }}
                          className="animate-fade-in"
                        >
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>Delete message?</span>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <button 
                              type="button"
                              onClick={() => handleDeleteForMe(msg._id)}
                              className="btn-secondary" 
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', border: '1px solid var(--border-light)' }}
                            >
                              Delete for me
                            </button>
                            {isMe && (
                              <button 
                                type="button"
                                onClick={() => handleDeleteForEveryone(msg._id)}
                                className="btn-primary" 
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', backgroundColor: 'var(--accent-rose)', borderColor: 'var(--accent-rose)' }}
                              >
                                Delete for everyone
                              </button>
                            )}
                            <button 
                              type="button"
                              onClick={() => setDeleteMessageId(null)}
                              className="btn-secondary" 
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', border: '1px solid var(--border-light)' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px', padding: '0 4px' }}>
                        {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}

              {/* WhatsApp Bouncing Dots Typing Indicator */}
              {isPeerTyping && (
                <div 
                  style={{ 
                    alignSelf: 'flex-start',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.45rem', 
                    padding: '0.5rem 0.75rem',
                    borderRadius: '12px',
                    borderTopLeftRadius: '2px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-light)',
                    marginTop: '0.25rem'
                  }}
                  className="animate-fade-in"
                >
                  <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    typing
                  </span>
                  <div style={{ display: 'flex', gap: '3px', alignItems: 'center', height: '100%', marginTop: '2px' }}>
                    <span className="dot-bounce" style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--accent-purple)', display: 'inline-block' }} />
                    <span className="dot-bounce" style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--accent-purple)', display: 'inline-block', animationDelay: '0.2s' }} />
                    <span className="dot-bounce" style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--accent-purple)', display: 'inline-block', animationDelay: '0.4s' }} />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <input 
                type="text" 
                placeholder={`Message ${selectedFriend.username}...`} 
                value={inputText}
                onChange={handleInputChange}
                className="form-input-small"
                style={{ fontSize: '0.875rem', padding: '0.65rem 1rem' }}
              />
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ padding: '0.65rem 1.1rem', borderRadius: '10px', flexShrink: 0 }}
              >
                <Send size={14} />
                <span>Send</span>
              </button>
            </form>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            <MessageSquareCode size={48} style={{ opacity: 0.25, marginBottom: '0.75rem' }} />
            <span style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>Select a study partner from the left menu to chat privately.</span>
          </div>
        )}
      </div>

    </div>
  );
}

export default TeamChat;
