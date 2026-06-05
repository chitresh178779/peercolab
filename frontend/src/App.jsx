import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { Sparkles, LogOut, MessageSquareCode } from 'lucide-react';
import { API_BASE_URL } from './config';
import SubjectWorkspace from './components/SubjectWorkspace';
import FriendFeed from './components/FriendFeed';
import FriendManager from './components/FriendManager';
import Recommendations from './components/Recommendations';
import Auth from './components/Auth';
import './App.css';

const socket = io.connect(API_BASE_URL);

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [quote, setQuote] = useState({ text: 'Loading motivation...', author: '' });
  const [subjects, setSubjects] = useState([]);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [recTrigger, setRecTrigger] = useState(0);

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

    return () => socket.off('friend_activity');
  }, [token]);

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
      return { success: true };
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
        friendName: user.username, 
        subjectName,
        taskTitle,
        completedAt: new Date()
      });
    } catch (err) {
      console.error('Error finishing task item:', err);
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            Welcome back, <strong style={{ color: 'var(--accent-purple)' }}>{user.username}</strong>!
          </span>
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

      {/* SYMMETRIC TWO-COLUMN GRID ARCHITECTURE */}
      <main className="dashboard-grid">
        
        {/* LEFT COLUMN: ACTIVE USER WORKSPACE */}
        <div className="workspace-column">
          <Recommendations 
            userId={user.id} 
            subjects={subjects} 
            onAddTask={handleAddTask} 
            recTrigger={recTrigger}
          />
          <SubjectWorkspace 
            subjects={subjects} 
            onAddSubject={handleAddSubject}
            onDeleteSubject={handleDeleteSubject}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
            onCompleteTask={handleCompleteTask}
            onAddTip={handleAddTip}
          />
        </div>

        {/* RIGHT COLUMN: SOCIAL TIMELINE FEED & NETWORK PIPELINE */}
        <div className="social-sidebar-column">
          <FriendFeed liveAlerts={liveAlerts} />
          <FriendManager userId={user.id} /> 
        </div>

      </main>
    </div>
  );
}

export default App;