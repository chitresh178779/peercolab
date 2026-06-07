import { useState, useEffect } from 'react';
import axios from 'axios';
import { Trophy, PlusCircle, XCircle } from 'lucide-react';
import { API_BASE_URL } from '../config';

function Recommendations({ userId, subjects, onAddTask, onAddSubject, recTrigger }) {
  const [suggestions, setSuggestions] = useState([]);

  const fetchRecommendations = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/users/${userId}/recommendations`);
      setSuggestions(res.data);
    } catch (err) {
      console.error('Error loading recommendations:', err);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [userId, subjects, recTrigger]);

  const handleAcceptTask = async (taskTitle, subjectName) => {
    let matchingSubject = subjects.find(s => s.name.toLowerCase() === subjectName.toLowerCase());

    if (!matchingSubject) {
      const result = await onAddSubject(subjectName);
      if (result && result.success && result.subject) {
        matchingSubject = result.subject;
      } else {
        alert(`Could not automatically create subject workspace "${subjectName}".`);
        return;
      }
    }

    if (matchingSubject) {
      onAddTask(matchingSubject._id, taskTitle);
    }
  };

  const handleRejectTask = async (taskTitle, subjectName) => {
    try {
      await axios.post(`${API_BASE_URL}/api/users/${userId}/challenges/reject`, {
        title: taskTitle,
        subjectName: subjectName
      });
      // Filter out immediately from local suggestions array
      setSuggestions(prev => prev.filter(rec => !(rec.title === taskTitle && rec.subjectName === subjectName)));
    } catch (err) {
      console.error('Error rejecting challenge:', err);
    }
  };

  return (
    <div className="recommendations-pane" style={{ marginBottom: '1.5rem' }}>
      <h3>
        <Trophy className="icon-emerald animate-float" size={20} style={{ color: 'var(--accent-emerald)' }} />
        <span>Peer Challenges</span>
      </h3>
      
      {suggestions.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
          No active peer challenges. When a friend completes a task in a subject you share, it will appear here to challenge you!
        </p>
      ) : (
        <>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '-5px', marginBottom: '1rem' }}>
            Your friends completed these tasks. Can you keep up?
          </p>
          <div className="suggestions-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {suggestions.map((rec, index) => (
              <div key={index} className="suggestion-card animate-fade-in" style={{ animationDelay: `${index * 0.05}s`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div className="suggestion-info" style={{ display: 'flex', flexDirection: 'column' }}>
                  <strong>{rec.title}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Targeting: <em>{rec.subjectName}</em> (via @{rec.suggestedBy})</span>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button 
                    onClick={() => handleAcceptTask(rec.title, rec.subjectName)}
                    className="btn-accept-challenge"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                  >
                    <PlusCircle size={14} />
                    <span>Accept</span>
                  </button>
                  <button 
                    onClick={() => handleRejectTask(rec.title, rec.subjectName)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.8rem',
                      borderRadius: '8px',
                      border: '1.5px solid var(--accent-rose)',
                      backgroundColor: 'transparent',
                      color: 'var(--accent-rose)',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--accent-rose)';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--accent-rose)';
                    }}
                    title="Reject Challenge"
                  >
                    <XCircle size={14} />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default Recommendations;