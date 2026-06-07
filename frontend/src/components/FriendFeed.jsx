import React, { useState } from 'react';
import { Zap, CheckCircle, History, Clock } from 'lucide-react';

function FriendFeed({ liveAlerts, onViewProfile }) {
  const [subTab, setSubTab] = useState('live');
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Split alerts
  const liveAlertsFiltered = liveAlerts.filter(alert => new Date(alert.completedAt) >= oneDayAgo);
  const historyAlertsFiltered = liveAlerts.filter(alert => new Date(alert.completedAt) < oneDayAgo);

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const currentList = subTab === 'live' ? liveAlertsFiltered : historyAlertsFiltered;

  return (
    <div className="feed-pane">
      <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap className="icon-rose" size={20} style={{ color: 'var(--accent-rose)' }} />
          <span>Activity Stream</span>
        </div>
      </h3>

      {/* Sub-tab Switcher */}
      <div className="tab-menu" style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.5rem' }}>
        <button 
          className={subTab === 'live' ? 'tab-btn active' : 'tab-btn'} 
          onClick={() => setSubTab('live')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.35rem', 
            flexGrow: 1, 
            justifyContent: 'center',
            padding: '0.5rem 0.25rem',
            fontSize: '0.825rem'
          }}
        >
          <Clock size={13} />
          <span>Live (24h) ({liveAlertsFiltered.length})</span>
        </button>
        <button 
          className={subTab === 'history' ? 'tab-btn active' : 'tab-btn'} 
          onClick={() => setSubTab('history')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.35rem', 
            flexGrow: 1, 
            justifyContent: 'center',
            padding: '0.5rem 0.25rem',
            fontSize: '0.825rem'
          }}
        >
          <History size={13} />
          <span>History ({historyAlertsFiltered.length})</span>
        </button>
      </div>

      <div className="alerts-list">
        {currentList.length === 0 ? (
          <p className="no-data" style={{ margin: '2rem 0', textAlign: 'center' }}>
            {subTab === 'live' 
              ? "No live activity in the past 24 hours. Get typing!" 
              : "No historical activity recorded."}
          </p>
        ) : (
          currentList.map((alert, index) => (
            <div key={index} className="alert-card animate-fade-in" style={{ animationDelay: `${index * 0.05}s`, marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <CheckCircle size={16} style={{ color: 'var(--accent-emerald)', marginTop: '0.15rem', flexShrink: 0 }} />
                <div style={{ flexGrow: 1 }}>
                  <strong 
                    style={{ cursor: alert.friendId ? 'pointer' : 'default', textDecoration: alert.friendId ? 'underline' : 'none' }}
                    onClick={() => alert.friendId && onViewProfile(alert.friendId)}
                    title={alert.friendId ? `View ${alert.friendName}'s profile` : ''}
                  >
                    {alert.friendName}
                  </strong> completed{' '}
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>"{alert.taskTitle}"</span> in <em>{alert.subjectName}</em>
                  
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={10} />
                    <span>{formatTime(alert.completedAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default FriendFeed;