import React from 'react';
import { Zap, CheckCircle } from 'lucide-react';

function FriendFeed({ liveAlerts }) {
  return (
    <div className="feed-pane">
      <h3>
        <Zap className="icon-rose" size={20} style={{ color: 'var(--accent-rose)' }} />
        <span>Live Activity Stream</span>
      </h3>
      <div className="alerts-list">
        {liveAlerts.length === 0 ? (
          <p className="no-data">No recent activity from friends. Time to challenge them!</p>
        ) : (
          liveAlerts.map((alert, index) => (
            <div key={index} className="alert-card animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <CheckCircle size={16} style={{ color: 'var(--accent-emerald)', marginTop: '0.15rem', flexShrink: 0 }} />
                <div>
                  <strong>{alert.friendName}</strong> completed{' '}
                  <span>"{alert.taskTitle}"</span> in <em>{alert.subjectName}</em>
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