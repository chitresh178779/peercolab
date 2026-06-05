import { useState, useEffect } from 'react';
import axios from 'axios';
import { Trophy, PlusCircle } from 'lucide-react';
import { API_BASE_URL } from '../config';

function Recommendations({ userId, subjects, onAddTask, recTrigger }) {
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

  const handleAcceptTask = (taskTitle, subjectName) => {
    const matchingSubject = subjects.find(s => s.name.toLowerCase() === subjectName.toLowerCase());

    if (matchingSubject) {
      onAddTask(matchingSubject._id, taskTitle);
    } else {
      alert(`To take on this challenge, please create a subject named "${subjectName}" first!`);
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
          <div className="suggestions-list">
            {suggestions.map((rec, index) => (
              <div key={index} className="suggestion-card animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                <div className="suggestion-info">
                  <strong>{rec.title}</strong>
                  <span>Targeting: <em>{rec.subjectName}</em> (via @{rec.suggestedBy})</span>
                </div>
                <button 
                  onClick={() => handleAcceptTask(rec.title, rec.subjectName)}
                  className="btn-accept-challenge"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <PlusCircle size={14} />
                  <span>Accept</span>
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default Recommendations;