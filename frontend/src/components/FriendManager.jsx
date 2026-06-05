import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Search, UserPlus, UserCheck } from 'lucide-react';
import { API_BASE_URL } from '../config';

function FriendManager({ userId }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [myFriends, setMyFriends] = useState([]);
  const [statusMsg, setStatusMsg] = useState('');

  // Fetch who we are already friends with on load
  const fetchFriendsList = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/users/${userId}/friends`);
      setMyFriends(res.data);
    } catch (err) {
      console.error('Error fetching friends list:', err);
    }
  };

  useEffect(() => {
    fetchFriendsList();
  }, [userId]);

  // Handle live search execution
  const handleSearch = async (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.trim().length > 1) {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/users/search?username=${value}`);
        // Filter out yourself from search results
        setSearchResults(res.data.filter(u => u._id !== userId));
      } catch (err) {
        console.error(err);
      }
    } else {
      setSearchResults([]);
    }
  };

  // Connect a new friend
  const handleAddFriend = async (friendId) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/users/${userId}/add-friend`, { friendId });
      setStatusMsg('Friend added successfully! Mutual competitiveness activated.');
      setSearchQuery('');
      setSearchResults([]);
      fetchFriendsList(); // Refresh the list
      
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      setStatusMsg(err.response?.data?.message || 'Error connecting friend');
    }
  };

  return (
    <div className="friend-manager-pane" style={{ marginTop: '1.5rem' }}>
      <h3>
        <Users className="icon-amber" size={20} style={{ color: 'var(--accent-amber)' }} />
        <span>Find Your Study Partners</span>
      </h3>
      
      {statusMsg && <p className="status-bubble">{statusMsg}</p>}

      {/* Search Input Box with Icon */}
      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Type a friend's username..."
          value={searchQuery}
          onChange={handleSearch}
          className="form-input-full"
          style={{ paddingLeft: '2.5rem' }}
        />
      </div>

      {/* Dynamic Dropdown Search Results */}
      {searchResults.length > 0 && (
        <div className="search-results-dropdown animate-fade-in">
          {searchResults.map((u) => (
            <div key={u._id} className="search-result-row">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--accent-amber)' }}>👤</span>
                {u.username}
              </span>
              <button 
                onClick={() => handleAddFriend(u._id)} 
                className="btn-complete"
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
              >
                <UserPlus size={12} />
                <span>Add</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Current Friends Grid */}
      <div className="current-friends-section" style={{ marginTop: '1rem' }}>
        <h4>Your Network ({myFriends.length})</h4>
        {myFriends.length === 0 ? (
          <p className="no-data" style={{ fontSize: '0.85rem' }}>Isolated mode. Add a study partner to unlock competitiveness!</p>
        ) : (
          <div className="friends-tag-cloud">
            {myFriends.map((f, i) => (
              <span key={f._id} className="friend-tag animate-fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                <UserCheck size={12} style={{ color: 'var(--accent-blue)' }} />
                <span>{f.username}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FriendManager;