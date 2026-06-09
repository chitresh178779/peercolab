import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Send, Users, ChevronLeft, MessageSquare, Trash2, Search,
  MoreVertical, Smile, Check, CheckCheck, Phone, Video, Info
} from 'lucide-react';
import { API_BASE_URL } from '../config';

function TeamChat({ user, socket }) {
  const [friends, setFriends] = useState([]);
  const [filteredFriends, setFilteredFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [deleteMessageId, setDeleteMessageId] = useState(null);
  const [lastMessages, setLastMessages] = useState({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Colors for avatars
  const avatarColors = [
    'var(--accent-purple-glow)',
    'var(--accent-emerald-glow)',
    'var(--accent-amber-glow)',
    'var(--accent-blue-glow)',
    '#FFE4E6', // rose
    '#EDE9FE', // violet
  ];

  const getAvatarBg = (username) => {
    if (!username) return avatarColors[0];
    const code = username.charCodeAt(0) + (username.charCodeAt(username.length - 1) || 0);
    return avatarColors[code % avatarColors.length];
  };

  // Fetch friends list on mount
  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/users/${user.id}/friends`)
      .then(res => {
        const validFriends = (res.data || []).filter(friend => friend && friend._id && friend.username);
        setFriends(validFriends);
        setFilteredFriends(validFriends);

        // Fetch last message for each friend to populate sidebar
        validFriends.forEach(friend => {
          axios.get(`${API_BASE_URL}/api/chat/history/${user.id}/${friend._id}`)
            .then(historyRes => {
              if (historyRes.data && historyRes.data.length > 0) {
                setLastMessages(prev => ({
                  ...prev,
                  [friend._id]: historyRes.data[historyRes.data.length - 1]
                }));
              }
            })
            .catch(err => console.error('Error fetching last message history:', err));
        });
      })
      .catch(err => console.error('Error fetching friends list:', err));
  }, [user.id]);

  // Filter friends list based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFriends(friends);
    } else {
      const filtered = friends.filter(f =>
        f && f.username && f.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFriends(filtered);
    }
  }, [searchQuery, friends]);

  // Load chat history when selectedFriend changes
  useEffect(() => {
    setIsPeerTyping(false);
    setDeleteMessageId(null);
    setShowEmojiPicker(false);
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
        if (res.data.length > 0) {
          setLastMessages(prev => ({
            ...prev,
            [selectedFriend._id]: res.data[res.data.length - 1]
          }));
        }
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
      const senderId = msg.sender._id || msg.sender;
      const recipientId = msg.recipient._id || msg.recipient;

      // Identify which friend this chat belongs to
      const partnerId = senderId === user.id ? recipientId : senderId;

      // Update last message in sidebar
      setLastMessages(prev => ({
        ...prev,
        [partnerId]: msg
      }));

      // Append message if active chat matches
      if (selectedFriend) {
        const isCurrentChat =
          (senderId === selectedFriend._id && recipientId === user.id) ||
          (senderId === user.id && recipientId === selectedFriend._id);

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
    if (e) e.preventDefault();
    if (!inputText.trim() || !selectedFriend) return;

    if (socket) {
      socket.emit('send_direct_message', {
        senderId: user.id,
        recipientId: selectedFriend._id,
        content: inputText.trim()
      });

      // Construct a temporary message object to update the sidebar instantly
      const tempMsg = {
        _id: 'temp-' + Date.now(),
        sender: user.id,
        recipient: selectedFriend._id,
        content: inputText.trim(),
        createdAt: new Date().toISOString()
      };

      setLastMessages(prev => ({
        ...prev,
        [selectedFriend._id]: tempMsg
      }));

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

  const formatMessageTime = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatLastMsgDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const appendEmoji = (emoji) => {
    setInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const mockEmojis = ['😊', '😂', '👍', '🔥', '📚', '💡', '✅', '🎓', '🎯', '🚀', '⭐', '❤️'];

  return (
    <div
      className="glass-card"
      style={{
        display: 'flex',
        height: '650px',
        padding: 0,
        overflow: 'hidden',
        border: '3px solid #000000',
        boxShadow: '8px 8px 0px #000000',
        backgroundColor: '#ffffff'
      }}
    >
      <style>{`
        @keyframes bounce-dot {
          0%, 80%, 100% { transform: scale(0.3); opacity: 0.5; }
          40% { transform: scale(1.1); opacity: 1; }
        }
        .dot-bounce {
          animation: bounce-dot 1.4s infinite ease-in-out both;
        }
        .whatsapp-bubble {
          position: relative;
          max-width: 65%;
          padding: 0.5rem 0.75rem 0.4rem 0.75rem;
          border: 2px solid #000000;
          border-radius: 12px;
          margin-bottom: 2px;
          font-size: 0.9rem;
          line-height: 1.45;
          box-shadow: 2px 2px 0px #000000;
          word-break: break-word;
          font-weight: 600;
        }
        .bubble-me {
          align-self: flex-end;
          background-color: #dcfce7; /* Light green/emerald tint */
          border-top-right-radius: 2px;
        }
        .bubble-other {
          align-self: flex-start;
          background-color: #ffffff; /* White background */
          border-top-left-radius: 2px;
        }
        .bubble-meta {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 3px;
          font-size: 0.65rem;
          color: var(--text-muted);
          margin-top: 0.2rem;
          text-align: right;
        }
        .chat-sidebar-container {
          width: 35%;
          border-right: 3px solid #000000;
          display: flex;
          flex-direction: column;
          height: 100%;
          background-color: #ffffff;
        }
        .chat-window-container {
          width: 65%;
          display: flex;
          flex-direction: column;
          height: 100%;
          background-color: #faf8f5;
        }
        .chat-item-hover:hover {
          background-color: #f5f5f4 !important;
        }
        .chat-wallpaper-grid {
          background-color: #faf8f5;
          background-image: radial-gradient(#000000 1px, transparent 0);
          background-size: 20px 20px;
          background-opacity: 0.15;
        }
        .msg-actions-btn {
          opacity: 0;
          transition: opacity 0.2s ease;
          position: absolute;
          top: 4px;
          right: 4px;
          background: rgba(255,255,255,0.9);
          border: 1.5px solid #000000;
          border-radius: 4px;
          padding: 2px;
          cursor: pointer;
        }
        .whatsapp-bubble:hover .msg-actions-btn {
          opacity: 1;
        }
        .chat-input-form {
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          gap: 0.65rem !important;
          flex-grow: 1 !important;
          min-width: 0 !important;
          width: 100% !important;
        }
        .chat-input-form button {
          width: auto !important;
          margin-top: 0 !important;
          flex-shrink: 0 !important;
        }
        @media (max-width: 768px) {
          .chat-sidebar-container.mobile-hide {
            display: none !important;
          }
          .chat-sidebar-container.mobile-show {
            display: flex !important;
          }
          .chat-window-container.mobile-hide {
            display: none !important;
          }
          .chat-window-container.mobile-show {
            display: flex !important;
          }
          .chat-sidebar-container {
            width: 100% !important;
            border-right: none;
          }
          .chat-window-container {
            width: 100% !important;
          }
        }
      `}</style>

      {/* WHATSAPP SIDEBAR: CHATS LIST */}
      <div className={`chat-sidebar-container ${selectedFriend ? 'mobile-hide' : 'mobile-show'}`}>

        {/* Sidebar Header */}
        <div style={{
          padding: '1rem',
          backgroundColor: '#f5f5f4',
          borderBottom: '3px solid #000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: getAvatarBg(user.username),
              border: '2px solid #000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: '1.1rem',
              boxShadow: '1.5px 1.5px 0px #000000'
            }}>
              {user.username.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>@{user.username}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }} title="Study Partners">
              <Users size={20} />
            </button>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }} title="Menu">
              <MoreVertical size={20} />
            </button>
          </div>
        </div>

        {/* Sidebar Search Bar */}
        <div style={{
          padding: '0.65rem 1rem',
          borderBottom: '2px solid #000000',
          backgroundColor: '#ffffff',
          flexShrink: 0
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: '#f5f5f4',
            border: '2px solid #000000',
            borderRadius: '10px',
            padding: '0.35rem 0.65rem'
          }}>
            <Search size={16} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search study partner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'none',
                outline: 'none',
                fontSize: '0.825rem',
                width: '100%',
                fontWeight: 600,
                color: '#000000'
              }}
            />
          </div>
        </div>

        {/* Sidebar Chat List */}
        <div style={{ flexGrow: 1, overflowY: 'auto', backgroundColor: '#ffffff' }}>
          {filteredFriends.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem', color: 'var(--text-secondary)' }}>
              <MessageSquare size={32} style={{ opacity: 0.25, marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>No partners found.</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Go to "Manage Partners" to link up with active classmates!
              </p>
            </div>
          ) : (
            filteredFriends.map(friend => {
              const isSelected = selectedFriend?._id === friend._id;
              const lastMsg = lastMessages[friend._id];

              return (
                <div
                  key={friend._id}
                  onClick={() => setSelectedFriend(friend)}
                  className="chat-item-hover"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    cursor: 'pointer',
                    borderBottom: '1px solid #e5e7eb',
                    backgroundColor: isSelected ? 'rgba(124, 58, 237, 0.08)' : 'transparent',
                    borderLeft: isSelected ? '4px solid var(--accent-purple)' : '4px solid transparent',
                    transition: 'background-color 0.1s ease'
                  }}
                >
                  {/* Friend Avatar */}
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    backgroundColor: getAvatarBg(friend.username),
                    border: '2px solid #000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 800,
                    fontSize: '1.15rem',
                    boxShadow: '1.5px 1.5px 0px #000000',
                    flexShrink: 0
                  }}>
                    {friend.username.charAt(0).toUpperCase()}
                  </div>

                  {/* Message details */}
                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.15rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.925rem', color: '#000000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {friend.username}
                      </span>
                      {lastMsg && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          {formatLastMsgDate(lastMsg.createdAt)}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {lastMsg && (lastMsg.sender?._id === user.id || lastMsg.sender === user.id) && (
                        <CheckCheck size={14} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
                      )}
                      <span style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'block',
                        fontWeight: 500
                      }}>
                        {lastMsg ? (
                          lastMsg.isDeletedForEveryone ? '🚫 Message deleted' : lastMsg.content
                        ) : (
                          <span style={{ fontStyle: 'italic', opacity: 0.7 }}>Click to start chat</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* WHATSAPP CHAT WINDOW */}
      <div className={`chat-window-container chat-wallpaper-grid ${selectedFriend ? 'mobile-show' : 'mobile-hide'}`}>
        {selectedFriend ? (
          <>
            {/* Chat Window Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.65rem 1rem',
              backgroundColor: '#f5f5f4',
              borderBottom: '3px solid #000000',
              flexShrink: 0,
              zIndex: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {/* Mobile Back Chevron */}
                <button
                  onClick={() => setSelectedFriend(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#000000',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px',
                    borderRadius: '6px'
                  }}
                  className="chat-back-btn"
                  title="Back to Chats"
                >
                  <ChevronLeft size={22} style={{ strokeWidth: 2.5 }} />
                </button>

                {/* Friend Active Avatar */}
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: getAvatarBg(selectedFriend.username),
                  border: '2px solid #000000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  boxShadow: '1.5px 1.5px 0px #000000'
                }}>
                  {selectedFriend.username.charAt(0).toUpperCase()}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.975rem', color: '#000000' }}>
                    {selectedFriend.username}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: isPeerTyping ? 'var(--accent-emerald)' : 'var(--text-secondary)', fontWeight: isPeerTyping ? 700 : 600 }}>
                    {isPeerTyping ? 'typing...' : 'Active Study Session'}
                  </span>
                </div>
              </div>

              {/* Call/Video Call icons */}

            </div>

            {/* Chat Messages Body */}
            <div
              style={{
                flexGrow: 1,
                overflowY: 'auto',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                scrollbarWidth: 'thin'
              }}
            >
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <div className="spinner"></div>
                </div>
              ) : messages.length === 0 ? (
                <div style={{
                  margin: 'auto',
                  backgroundColor: '#ffffff',
                  border: '2px solid #000000',
                  boxShadow: '3px 3px 0px #000000',
                  padding: '1rem 1.5rem',
                  borderRadius: '12px',
                  textAlign: 'center',
                  maxWidth: '300px'
                }}>
                  <MessageSquare size={32} style={{ color: 'var(--accent-purple)', marginBottom: '0.5rem' }} />
                  <p style={{ fontSize: '0.85rem', fontWeight: 700 }}>No messages yet</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Send a direct note to start collaborating on tasks!
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMe = msg.sender?._id === user.id || msg.sender === user.id;

                  return (
                    <div
                      key={msg._id || index}
                      style={{
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%'
                      }}
                      className="animate-fade-in"
                    >
                      <div className={`whatsapp-bubble ${isMe ? 'bubble-me' : 'bubble-other'}`}>
                        {/* Delete message trigger */}
                        {msg._id && !msg.isDeletedForEveryone && (
                          <button
                            className="msg-actions-btn"
                            onClick={() => setDeleteMessageId(msg._id)}
                            title="Message Actions"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}

                        {msg.isDeletedForEveryone ? (
                          <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            🚫 This message was deleted
                          </span>
                        ) : (
                          <span>{msg.content}</span>
                        )}

                        <div className="bubble-meta">
                          <span>{formatMessageTime(msg.createdAt)}</span>
                          {isMe && !msg.isDeletedForEveryone && (
                            <CheckCheck size={14} style={{ color: 'var(--accent-blue)', marginLeft: '2px' }} />
                          )}
                        </div>
                      </div>

                      {/* Deletion Dialog Popup */}
                      {deleteMessageId === msg._id && (
                        <div
                          style={{
                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                            backgroundColor: '#ffffff',
                            border: '2px solid #000000',
                            boxShadow: '3px 3px 0px #000000',
                            padding: '0.75rem',
                            borderRadius: '10px',
                            marginTop: '0.35rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                            maxWidth: '280px',
                            zIndex: 10
                          }}
                        >
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#000000' }}>Delete message?</span>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteForMe(msg._id)}
                              className="btn-secondary"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', border: '1.5px solid #000000', borderRadius: '4px' }}
                            >
                              Delete for me
                            </button>
                            {isMe && (
                              <button
                                type="button"
                                onClick={() => handleDeleteForEveryone(msg._id)}
                                className="btn-primary"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', backgroundColor: 'var(--accent-rose)', color: '#ffffff', border: '1.5px solid #000000', borderRadius: '4px' }}
                              >
                                Delete for everyone
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setDeleteMessageId(null)}
                              className="btn-secondary"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', border: '1.5px solid #000000', borderRadius: '4px' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {isPeerTyping && (
                <div
                  className="whatsapp-bubble bubble-other"
                  style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>typing</span>
                  <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                    <span className="dot-bounce" style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--accent-purple)', display: 'inline-block' }} />
                    <span className="dot-bounce" style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--accent-purple)', display: 'inline-block', animationDelay: '0.2s' }} />
                    <span className="dot-bounce" style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--accent-purple)', display: 'inline-block', animationDelay: '0.4s' }} />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Attachments / Emoji Picker Popups */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {showEmojiPicker && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '10px',
                  backgroundColor: '#ffffff',
                  border: '2px solid #000000',
                  borderRadius: '10px',
                  boxShadow: '3px -3px 0px #000000',
                  padding: '0.5rem',
                  display: 'flex',
                  gap: '0.5rem',
                  zIndex: 20
                }}>
                  {mockEmojis.map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => appendEmoji(e)}
                      style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', padding: '4px' }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Chat Footer Input Area */}
            <div style={{
              padding: '0.85rem 1rem',
              backgroundColor: '#f5f5f4',
              borderTop: '3px solid #000000',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              flexShrink: 0
            }}>
              {/* Chat Input form */}
              <form
                onSubmit={handleSend}
                className="chat-input-form"
              >
                {/* Emoji Trigger */}
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    opacity: 0.8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                  title="Add Emoji"
                >
                  <Smile size={20} />
                </button>

                <input
                  type="text"
                  placeholder={`Message ${selectedFriend.username}...`}
                  value={inputText}
                  onChange={handleInputChange}
                  style={{
                    flexGrow: 1,
                    minWidth: 0,
                    border: '2.5px solid #000000',
                    borderRadius: '12px',
                    padding: '0.65rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    fontFamily: 'inherit'
                  }}
                />

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!inputText.trim()}
                  style={{
                    padding: '0.65rem',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    backgroundColor: inputText.trim() ? 'var(--accent-purple)' : '#e5e7eb',
                    color: inputText.trim() ? '#ffffff' : '#9ca3af',
                    border: '2px solid #000000',
                    boxShadow: inputText.trim() ? '1.5px 1.5px 0px #000000' : 'none',
                    cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </>
        ) : (
          /* Empty Chat Screen */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              border: '3px solid #000000',
              borderRadius: '20px',
              padding: '2.5rem',
              maxWidth: '400px',
              boxShadow: '6px 6px 0px #000000'
            }}>
              <MessageSquare size={64} style={{ color: 'var(--accent-purple)', marginBottom: '1rem', strokeWidth: 1.5 }} />
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                PeerColab Messenger
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, lineHeight: 1.5 }}>
                Select a study partner from the left menu to start a real-time message stream.
              </p>
              <div style={{
                marginTop: '1.5rem',
                padding: '0.5rem',
                border: '1.5px dashed #000000',
                borderRadius: '8px',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                fontWeight: 600
              }}>
                🔒 Private sessions are end-to-end coordinated
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default TeamChat;
