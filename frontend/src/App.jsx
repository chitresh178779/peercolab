import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { Sparkles, LogOut, MessageSquareCode, User, LayoutGrid, Users, Calendar, Menu, X } from 'lucide-react';
import { API_BASE_URL } from './config';
import SubjectWorkspace from './components/SubjectWorkspace';
import FriendFeed from './components/FriendFeed';
import FriendManager from './components/FriendManager';
import Recommendations from './components/Recommendations';
import UserProfile from './components/UserProfile';
import ActivityHeatmap from './components/ActivityHeatmap';
import Auth from './components/Auth';
import NotificationBell from './components/NotificationBell';
import TeamChat from './components/TeamChat';
import { subscribeToPushNotifications } from './utils/pushSubscription';
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
  const [currentTab, setCurrentTab] = useState('workspace');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileSidebarClosing, setMobileSidebarClosing] = useState(false);

  const closeMobileSidebar = () => {
    setMobileSidebarClosing(true);
    setTimeout(() => {
      setMobileSidebarOpen(false);
      setMobileSidebarClosing(false);
    }, 280);
  };

  // Register push notifications when user is active
  useEffect(() => {
    if (user && user.id) {
      subscribeToPushNotifications(user.id);
    }
  }, [user]);

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
    <div className="app-layout-wrapper">
      {/* DESKTOP SIDEBAR */}
      <aside className="desktop-sidebar">
        <div>
          <div className="sidebar-logo">
            <Sparkles className="animate-float" size={26} style={{ color: 'var(--accent-purple)' }} />
            <h2 className="sidebar-logo-text">PeerColab</h2>
          </div>
          
          <nav className="sidebar-menu">
            <button 
              onClick={() => setCurrentTab('workspace')} 
              className={`sidebar-menu-btn ${currentTab === 'workspace' ? 'active' : ''}`}
            >
              <LayoutGrid size={18} />
              <span>Workspace</span>
            </button>
            <button 
              onClick={() => setCurrentTab('challenges')} 
              className={`sidebar-menu-btn ${currentTab === 'challenges' ? 'active' : ''}`}
            >
              <Sparkles size={18} />
              <span>Challenges</span>
            </button>
            <button 
              onClick={() => setCurrentTab('chat')} 
              className={`sidebar-menu-btn ${currentTab === 'chat' ? 'active' : ''}`}
            >
              <MessageSquareCode size={18} />
              <span>Live Chat</span>
            </button>
            <button 
              onClick={() => setCurrentTab('feed')} 
              className={`sidebar-menu-btn ${currentTab === 'feed' ? 'active' : ''}`}
            >
              <Users size={18} />
              <span>Partners Feed</span>
            </button>
            <button 
              onClick={() => setCurrentTab('partners')} 
              className={`sidebar-menu-btn ${currentTab === 'partners' ? 'active' : ''}`}
            >
              <Users size={18} />
              <span>Manage Partners</span>
            </button>
            <button 
              onClick={() => setCurrentTab('heatmap')} 
              className={`sidebar-menu-btn ${currentTab === 'heatmap' ? 'active' : ''}`}
            >
              <Calendar size={18} />
              <span>Activity Heatmap</span>
            </button>
            <button 
              onClick={() => setCurrentTab('profile')} 
              className={`sidebar-menu-btn ${currentTab === 'profile' ? 'active' : ''}`}
            >
              <User size={18} />
              <span>My Profile</span>
            </button>
          </nav>
        </div>

        <div className="sidebar-footer">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.75rem', fontWeight: 700 }}>
            Logged in as @{user.username}
          </span>
          <button 
            onClick={handleLogout} 
            className="btn-secondary" 
            style={{ width: '100%', fontSize: '0.875rem' }}
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <header className="mobile-header">
        <button 
          onClick={() => setMobileSidebarOpen(true)} 
          className="mobile-hamburger-btn"
          title="Open Menu"
        >
          <Menu size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={20} style={{ color: 'var(--accent-purple)' }} />
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.25rem' }}>
            PeerColab
          </span>
        </div>
        <NotificationBell userId={user.id} socket={socket} />
      </header>

      {/* MOBILE TRANSLUCENT GLASS SIDEBAR OVERLAY */}
      {(mobileSidebarOpen || mobileSidebarClosing) && (
        <div 
          className={`mobile-sidebar-overlay ${mobileSidebarClosing ? 'closing' : ''}`} 
          onClick={closeMobileSidebar}
        >
          <div 
            className={`mobile-sidebar-content ${mobileSidebarClosing ? 'closing' : ''}`} 
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="mobile-sidebar-close" 
              onClick={closeMobileSidebar}
              title="Close Menu"
            >
              <X size={16} />
            </button>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '3px solid #000000' }}>
                <Sparkles size={22} style={{ color: 'var(--accent-purple)' }} />
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.4rem' }}>
                  PeerColab
                </span>
              </div>

              <nav className="sidebar-menu">
                <button 
                  onClick={() => { setCurrentTab('workspace'); closeMobileSidebar(); }} 
                  className={`sidebar-menu-btn ${currentTab === 'workspace' ? 'active' : ''}`}
                >
                  <LayoutGrid size={18} />
                  <span>Workspace</span>
                </button>
                <button 
                  onClick={() => { setCurrentTab('challenges'); closeMobileSidebar(); }} 
                  className={`sidebar-menu-btn ${currentTab === 'challenges' ? 'active' : ''}`}
                >
                  <Sparkles size={18} />
                  <span>Challenges</span>
                </button>
                <button 
                  onClick={() => { setCurrentTab('chat'); closeMobileSidebar(); }} 
                  className={`sidebar-menu-btn ${currentTab === 'chat' ? 'active' : ''}`}
                >
                  <MessageSquareCode size={18} />
                  <span>Live Chat</span>
                </button>
                <button 
                  onClick={() => { setCurrentTab('feed'); closeMobileSidebar(); }} 
                  className={`sidebar-menu-btn ${currentTab === 'feed' ? 'active' : ''}`}
                >
                  <Users size={18} />
                  <span>Partners Feed</span>
                </button>
                <button 
                  onClick={() => { setCurrentTab('partners'); closeMobileSidebar(); }} 
                  className={`sidebar-menu-btn ${currentTab === 'partners' ? 'active' : ''}`}
                >
                  <Users size={18} />
                  <span>Manage Partners</span>
                </button>
                <button 
                  onClick={() => { setCurrentTab('heatmap'); closeMobileSidebar(); }} 
                  className={`sidebar-menu-btn ${currentTab === 'heatmap' ? 'active' : ''}`}
                >
                  <Calendar size={18} />
                  <span>Activity Heatmap</span>
                </button>
                <button 
                  onClick={() => { setCurrentTab('profile'); closeMobileSidebar(); }} 
                  className={`sidebar-menu-btn ${currentTab === 'profile' ? 'active' : ''}`}
                >
                  <User size={18} />
                  <span>My Profile</span>
                </button>
              </nav>
            </div>

            <div className="sidebar-footer">
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Logged in as @{user.username}
              </span>
              <button 
                onClick={handleLogout} 
                className="btn-secondary" 
                style={{ width: '100%', fontSize: '0.875rem' }}
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="app-content-area">
        {/* DESKTOP TOP HEADER */}
        <div className="desktop-top-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.05em' }}>PEERCOLAB HUB</span>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, margin: '0.2rem 0 0 0', letterSpacing: '-0.03em' }}>
              {currentTab === 'chat' ? 'Live Chat Room' : currentTab === 'feed' ? 'Partners Activity Feed' : currentTab === 'partners' ? 'Manage Study Partners' : currentTab === 'heatmap' ? 'Study & Activity Heatmap' : currentTab === 'profile' ? 'My Portfolio Workspace' : currentTab.charAt(0).toUpperCase() + currentTab.slice(1)}
            </h1>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', border: '2.5px solid #000000', borderRadius: '12px', boxShadow: '3px 3px 0px #000000', backgroundColor: '#ffffff' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                Welcome, <strong style={{ color: 'var(--accent-purple)' }}>{user.username}</strong>
              </span>
            </div>
            
            <div style={{ position: 'relative' }}>
              <NotificationBell userId={user.id} socket={socket} />
            </div>
          </div>
        </div>

        {/* MOTIVATIONAL BANNER */}
        <div className="quote-banner">
          <MessageSquareCode size={24} style={{ color: 'var(--accent-purple)', marginBottom: '0.25rem' }} />
          <h2>"{quote.text}"</h2>
          {quote.author && <p>- {quote.author}</p>}
        </div>

        {/* RENDER ACTIVE PAGE */}
        <main className="animate-fade-in" style={{ minHeight: '60vh' }}>
          {currentTab === 'workspace' && (
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
          )}

          {currentTab === 'challenges' && (
            <Recommendations 
              userId={user.id} 
              subjects={subjects} 
              onAddTask={handleAddTask} 
              onAddSubject={handleAddSubject}
              recTrigger={recTrigger}
            />
          )}

          {currentTab === 'chat' && (
            <div style={{ width: '100%' }}>
              <TeamChat user={user} socket={socket} />
            </div>
          )}

          {currentTab === 'feed' && (
            <FriendFeed liveAlerts={liveAlerts} onViewProfile={setActiveProfileId} />
          )}

          {currentTab === 'partners' && (
            <FriendManager userId={user.id} onViewProfile={setActiveProfileId} /> 
          )}

          {currentTab === 'heatmap' && (
            <ActivityHeatmap subjects={subjects} />
          )}

          {currentTab === 'profile' && (
            <UserProfile 
              userId={user.id} 
              profileId={user.id} 
              onClose={() => {}} 
              currentUsername={user.username}
              isSelf={true}
              inline={true}
            />
          )}
        </main>
      </div>

      {/* USER PROFILE MODAL (for viewing other partners' profiles on click) */}
      {activeProfileId && activeProfileId !== user.id && (
        <UserProfile 
          userId={user.id} 
          profileId={activeProfileId} 
          onClose={() => setActiveProfileId(null)}
          currentUsername={user.username}
          isSelf={false}
          inline={false}
        />
      )}
    </div>
  );
}

export default App;