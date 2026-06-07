import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { Sparkles, LogOut, MessageSquareCode, User, LayoutGrid, Users } from 'lucide-react';
import { API_BASE_URL } from './config';
import SubjectWorkspace from './components/SubjectWorkspace';
import FriendFeed from './components/FriendFeed';
import FriendManager from './components/FriendManager';
import Recommendations from './components/Recommendations';
import UserProfile from './components/UserProfile';
import Auth from './components/Auth';
import NotificationBell from './components/NotificationBell';
import TeamChat from './components/TeamChat';
import './App.css';

const socket = io.connect(API_BASE_URL);

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [quote, setQuote] = useState({ text: 'Loading motivation...', author: '' });
  const [subjects, setSubjects] = useState([]);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [recTrigger, setRecTrigger] = useState(0);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [currentTab, setCurrentTab] = useState('dashboard');

  // Load baseline configuration elements and token sessions
  useEffect(() => {
    // Fetch unified quote of the day
    axios.get(`${API_BASE_URL}/api/quotes/daily`)
      .then(res => setQuote(res.data))
      .catch(err => console.error('Quote fetch error:', err));

    if (token) {
      const savedUser = JSON.parse(localStorage.getItem('user'));
      if (savedUser) {
        setUser(savedUser);
        loadDashboardData(savedUser.id);
      }
    }

    // Set up WebSocket real-time event listener
    socket.on('friend_activity', (data) => {
      setLiveAlerts((prevAlerts) => [data, ...prevAlerts]);
      setRecTrigger(prev => prev+1);
    });

    return () => {
      socket.off('friend_activity');
    };
  }, [token]);

  // Keep socket user registration synced on connect/reconnect
  useEffect(() => {
    if (token && user) {
      const handleConnect = () => {
        socket.emit('register_user', user.id);
      };
      
      if (socket.connected) {
        handleConnect();
      }
      
      socket.on('connect', handleConnect);
      return () => {
        socket.off('connect', handleConnect);
      };
    }
  }, [token, user]);

  // Master fetch execution for an authorized user session
  const loadDashboardData = (userId) => {
    // 1. Fetch user workspace subjects, tasks, and tips
    axios.get(`${API_BASE_URL}/api/subjects/user/${userId}`)
      .then(res => setSubjects(res.data))
      .catch(err => console.error('Subjects fetch error:', err));

    // 2. Fetch timeline history feed
    axios.get(`${API_BASE_URL}/api/users/${userId}/feed`)
      .then(res => setLiveAlerts(res.data))
      .catch(err => console.error('Timeline fetch error:', err));
  };

  const handleAuthSuccess = (receivedToken, receivedUser) => {
    localStorage.setItem('token', receivedToken);
    localStorage.setItem('user', JSON.stringify(receivedUser));
    setToken(receivedToken);
    setUser(receivedUser);
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
    setSubjects([]);
    setLiveAlerts([]);
  };

  const handleAddSubject = async (name) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/subjects`, { name, ownerId: user.id });
      setSubjects([...subjects, res.data]);
      return { success: true, subject: res.data };
    } catch (err) {
      console.error('Error creating subject:', err);
      return { success: false, error: err.response?.data?.message || 'Error creating subject' };
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/subjects/${subjectId}`);
      setSubjects(subjects.filter(s => s._id !== subjectId));
    } catch (err) {
      console.error('Error deleting subject:', err);
    }
  };

  const handleAddTask = async (subjectId, title) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/subjects/${subjectId}/tasks`, { title });
      setSubjects(subjects.map(s => s._id === subjectId ? res.data : s));
      return { success: true };
    } catch (err) {
      console.error('Error creating task:', err);
      return { success: false, error: err.response?.data?.message || 'Error creating task' };
    }
  };

  const handleDeleteTask = async (subjectId, taskId) => {
    try {
      const res = await axios.delete(`${API_BASE_URL}/api/subjects/${subjectId}/tasks/${taskId}`);
      setSubjects(subjects.map(s => s._id === subjectId ? res.data : s));
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const handleAddTip = async (subjectId, content) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/subjects/${subjectId}/tips`, { content });
      setSubjects(subjects.map(s => s._id === subjectId ? res.data : s));
    } catch (err) {
      console.error('Error upload tip:', err);
    }
  };

  const handleCompleteTask = async (subjectId, taskId, taskTitle, subjectName) => {
    try {
      await axios.put(`${API_BASE_URL}/api/subjects/${subjectId}/tasks/${taskId}`);
      
      // Update local state arrays seamlessly
      setSubjects(subjects.map(s => s._id === subjectId ? {
        ...s,
        tasks: s.tasks.map(t => t._id === taskId ? { ...t, isCompleted: true } : t)
      } : s));

      // Emit network broadcast across WebSockets
      socket.emit('task_completed', {
        friendId: user.id,
        friendName: user.username, 
        subjectName,
        taskTitle,
        completedAt: new Date(),
        subjectId
      });
    } catch (err) {
      console.error('Error finishing task item:', err);
    }
  };

  const handleShareSubject = async (subjectId, username) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/subjects/${subjectId}/share`, { username });
      setSubjects(subjects.map(s => s._id === subjectId ? res.data : s));
      return { success: true };
    } catch (err) {
      console.error('Error sharing subject:', err);
      return { success: false, error: err.response?.data?.message || 'Error sharing subject' };
    }
  };

  const handleAssignTask = async (subjectId, taskId, assignedUserId) => {
    try {
      const res = await axios.put(`${API_BASE_URL}/api/subjects/${subjectId}/tasks/${taskId}/assign`, { userId: assignedUserId });
      setSubjects(subjects.map(s => s._id === subjectId ? res.data : s));
    } catch (err) {
      console.error('Error assigning task:', err);
    }
  };

  // Guard Clause: If not logged in, drop back to Auth screens
  if (!token || !user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="app-container">
      {/* HEADER NAV */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Sparkles className="animate-float" size={28} style={{ color: 'var(--accent-purple)' }} />
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', margin: 0, fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>
            PeerColab
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            Welcome back, <strong style={{ color: 'var(--accent-purple)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setActiveProfileId(user.id)} title="View Profile">{user.username}</strong>!
          </span>
          <NotificationBell userId={user.id} socket={socket} />
          <button 
            onClick={() => setActiveProfileId(user.id)} 
            className="btn-secondary" 
            style={{ padding: '0.45rem 1rem', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <User size={14} />
            <span>My Profile</span>
          </button>
          <button 
            onClick={handleLogout} 
            className="btn-secondary" 
            style={{ padding: '0.45rem 1rem', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* MOTIVATIONAL BANNER */}
      <div className="quote-banner">
        <MessageSquareCode size={24} style={{ color: 'var(--accent-purple)', marginBottom: '0.25rem' }} />
        <h2>"{quote.text}"</h2>
        {quote.author && <p>- {quote.author}</p>}
      </div>

      {/* TABS NAVIGATION */}
      <nav className="glass-card" style={{ 
        display: 'flex', 
        justifyContent: 'space-around', 
        padding: '0.65rem', 
        marginBottom: '2rem', 
        borderRadius: '12px',
        border: '2px solid var(--border-light)',
        backgroundColor: 'rgba(15, 23, 42, 0.4)'
      }}>
        <button 
          onClick={() => setCurrentTab('dashboard')} 
          className={currentTab === 'dashboard' ? 'tab-btn active' : 'tab-btn'}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexGrow: 1, justifyContent: 'center', padding: '0.5rem', borderBottom: currentTab === 'dashboard' ? '2px solid var(--accent-purple)' : 'none' }}
        >
          <LayoutGrid size={16} />
          <span>Workspace</span>
        </button>
        <button 
          onClick={() => setCurrentTab('chat')} 
          className={currentTab === 'chat' ? 'tab-btn active' : 'tab-btn'}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexGrow: 1, justifyContent: 'center', padding: '0.5rem', borderBottom: currentTab === 'chat' ? '2px solid var(--accent-purple)' : 'none' }}
        >
          <MessageSquareCode size={16} />
          <span>Chat / DMs</span>
        </button>
        <button 
          onClick={() => setCurrentTab('social')} 
          className={currentTab === 'social' ? 'tab-btn active' : 'tab-btn'}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexGrow: 1, justifyContent: 'center', padding: '0.5rem', borderBottom: currentTab === 'social' ? '2px solid var(--accent-purple)' : 'none' }}
        >
          <Users size={16} />
          <span>Partners</span>
        </button>
      </nav>

      {/* RENDER ACTIVE PAGE */}
      <main className="animate-fade-in" style={{ minHeight: '60vh' }}>
        {currentTab === 'dashboard' && (
          <div className="workspace-column">
            <Recommendations 
              userId={user.id} 
              subjects={subjects} 
              onAddTask={handleAddTask} 
              onAddSubject={handleAddSubject}
              recTrigger={recTrigger}
            />
            <SubjectWorkspace 
              subjects={subjects} 
              currentUserId={user.id}
              onAddSubject={handleAddSubject}
              onDeleteSubject={handleDeleteSubject}
              onAddTask={handleAddTask}
              onDeleteTask={handleDeleteTask}
              onCompleteTask={handleCompleteTask}
              onAddTip={handleAddTip}
              onShareSubject={handleShareSubject}
              onAssignTask={handleAssignTask}
            />
          </div>
        )}

        {currentTab === 'chat' && (
          <div style={{ width: '100%' }}>
            <TeamChat user={user} socket={socket} />
          </div>
        )}

        {currentTab === 'social' && (
          <div className="dashboard-grid">
            <FriendFeed liveAlerts={liveAlerts} onViewProfile={setActiveProfileId} />
            <FriendManager userId={user.id} onViewProfile={setActiveProfileId} /> 
          </div>
        )}
      </main>

      {/* USER PROFILE MODAL */}
      {activeProfileId && (
        <UserProfile 
          userId={user.id} 
          profileId={activeProfileId} 
          onClose={() => setActiveProfileId(null)}
          currentUsername={user.username}
          isSelf={activeProfileId === user.id}
        />
      )}
    </div>
  );
}

export default App;