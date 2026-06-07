import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Bell, MessageSquare, CheckCircle, UserPlus, Check, Trash2, ShieldAlert, Clock } from 'lucide-react';
import { API_BASE_URL } from '../config';

function NotificationBell({ userId, socket }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    // 1. Fetch initial notifications
    fetchNotifications();

    // Request desktop notification permission on mount
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (window.Notification.permission === 'default') {
        window.Notification.requestPermission();
      }
    }

    // 2. Setup real-time listener for incoming notifications
    if (socket) {
      socket.on('new_notification', (newNotif) => {
        setNotifications(prev => [newNotif, ...prev]);

        // Trigger HTML5 Desktop Notification
        if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
          try {
            new window.Notification('PeerColab Alert', {
              body: newNotif.content,
              icon: '/favicon.ico'
            });
          } catch (e) {
            console.error('Desktop Notification delivery failed:', e);
          }
        }
      });
    }

    // 3. Event listener to close dropdown on click outside
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      if (socket) {
        socket.off('new_notification');
      }
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userId, socket]);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/notifications/${userId}`);
      setNotifications(res.data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.put(`${API_BASE_URL}/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const markAllRead = async () => {
    try {
      await axios.put(`${API_BASE_URL}/api/notifications/user/${userId}/read-all`);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  };

  const deleteNotification = async (id, e) => {
    e.stopPropagation(); // Avoid triggering dropdown click / read handler
    try {
      await axios.delete(`${API_BASE_URL}/api/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'chat':
        return <MessageSquare size={16} style={{ color: 'var(--accent-purple)' }} />;
      case 'task_completed':
        return <CheckCircle size={16} style={{ color: 'var(--accent-emerald)' }} />;
      case 'friend_added':
        return <UserPlus size={16} style={{ color: 'var(--accent-blue)' }} />;
      case 'inactivity':
        return <Clock size={16} style={{ color: 'var(--accent-rose)' }} />;
      default:
        return <ShieldAlert size={16} style={{ color: 'var(--accent-amber)' }} />;
    }
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef} style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="btn-secondary" 
        style={{ 
          padding: '0.45rem', 
          borderRadius: '10px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          position: 'relative',
          cursor: 'pointer'
        }}
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span 
            className="animate-pulse" 
            style={{ 
              position: 'absolute', 
              top: '-4px', 
              right: '-4px', 
              backgroundColor: 'var(--accent-rose)', 
              color: 'var(--text-primary)', 
              fontSize: '0.7rem', 
              fontWeight: 'bold',
              borderRadius: '50%', 
              width: '18px', 
              height: '18px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: '2px solid var(--bg-dark)'
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div 
          className="glass-card animate-fade-in" 
          style={{ 
            position: 'absolute', 
            top: '115%', 
            right: 0, 
            width: '320px', 
            maxHeight: '400px', 
            overflowY: 'auto', 
            zIndex: 9999, 
            padding: '1rem',
            boxShadow: 'var(--shadow-glass)',
            backgroundColor: '#0d111c',
            border: '2px solid var(--border-light)',
            borderRadius: '12px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.95rem' }}>Notifications</span>
            {unreadCount > 0 && (
              <button 
                onClick={markAllRead} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--accent-purple)', 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {notifications.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>No notifications yet.</p>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif._id} 
                  onClick={() => !notif.isRead && markAsRead(notif._id)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '0.65rem', 
                    padding: '0.65rem', 
                    borderRadius: '8px', 
                    backgroundColor: notif.isRead ? 'rgba(255, 255, 255, 0.02)' : 'rgba(168, 85, 247, 0.06)', 
                    border: '1px solid',
                    borderColor: notif.isRead ? 'transparent' : 'rgba(168, 85, 247, 0.2)',
                    cursor: notif.isRead ? 'default' : 'pointer',
                    transition: 'var(--transition-fast)',
                    position: 'relative'
                  }}
                  className="notification-item"
                >
                  <div style={{ marginTop: '0.15rem' }}>{getIcon(notif.type)}</div>
                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.825rem', margin: 0, color: 'var(--text-primary)', wordBreak: 'break-word', lineHeight: 1.3 }}>
                      {notif.content}
                    </p>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignSelf: 'center' }}>
                    {!notif.isRead && (
                      <button 
                        onClick={() => markAsRead(notif._id)}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-emerald)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        title="Mark read"
                      >
                        <Check size={12} />
                      </button>
                    )}
                    <button 
                      onClick={(e) => deleteNotification(notif._id, e)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      title="Delete notification"
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-rose)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
