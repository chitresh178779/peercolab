import { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  LayoutGrid,
  Lightbulb,
  MessageSquareCode,
  Users,
  Calendar,
  CheckSquare,
  Star,
  Send,
  BrainCircuit,
  Trophy,
  Activity,
  Code
} from 'lucide-react';

function LandingPage({ onEnterHub }) {
  const [activeTab, setActiveTab] = useState('workspace');

  // Workspace Tab Mock State
  const [mockTasks, setMockTasks] = useState([
    { id: 1, title: 'Revise Neural Networks architecture', completed: false },
    { id: 2, title: 'Set up MongoDB database schema', completed: true },
    { id: 3, title: 'Draft landing page wireframe', completed: false }
  ]);

  // Vault Tab Mock State
  const [mockIdeas, setMockIdeas] = useState([
    { id: 1, title: 'AI-Powered Flashcard Generator', priority: 'High', favorite: false, category: 'AI' },
    { id: 2, title: 'Peer-to-Peer Code Review system', priority: 'Medium', favorite: true, category: 'Dev' },
    { id: 3, title: 'Pomodoro challenge multiplier', priority: 'Low', favorite: false, category: 'UX' }
  ]);
  const [aiTyping, setAiTyping] = useState(false);
  const [aiMessage, setAiMessage] = useState('');

  // Chat Tab Mock State
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'Alex', text: 'Hey team, did anyone check the recommendations for today?', time: '10:42 AM' },
    { id: 2, sender: 'Sarah', text: 'Yeah, I completed the Webpack task! The feed alert should be live.', time: '10:43 AM' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Heatmap Mock State
  const [hoveredCell, setHoveredCell] = useState(null);

  const toggleTask = (id) => {
    setMockTasks(prev => prev.map(t => {
      if (t.id === id) {
        const nextState = !t.completed;
        return { ...t, completed: nextState };
      }
      return t;
    }));
  };

  const toggleFavorite = (id) => {
    setMockIdeas(prev => prev.map(idea =>
      idea.id === id ? { ...idea, favorite: !idea.favorite } : idea
    ));
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg = {
      id: chatMessages.length + 1,
      sender: 'You',
      text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, newMsg]);
    setChatInput('');

    // Simulate auto response
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setChatMessages(prev => [...prev, {
        id: prev.length + 1,
        sender: 'Study Bot',
        text: 'Awesome! Working together makes learning 10x faster. Try creating a shared workspace subject in the actual hub!',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 1500);
  };

  const runAiBrainstorm = () => {
    setAiTyping(true);
    setAiMessage('');

    const responses = [
      "Based on your vaults, I recommend: 1. Add a Node.js benchmark task. 2. Schedule a 45min chat sync with @Sarah to map the database structure.",
      "AI Recommendation: Create a shared task 'Dockerize Frontend & Backend' under your DevOps subject. Level: Medium. Reward: 30 XP.",
      "Brainstorm suggestion: Integrate a web-RTC canvas so you and your peers can sketch flowcharts live during chat sessions."
    ];

    const chosen = responses[Math.floor(Math.random() * responses.length)];
    let i = 0;

    const timer = setInterval(() => {
      if (i < chosen.length) {
        setAiMessage(curr => curr + chosen.charAt(i));
        i++;
      } else {
        clearInterval(timer);
        setAiTyping(false);
      }
    }, 25);
  };

  return (
    <div className="landing-wrapper animate-fade-in" style={{ padding: '2rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* HEADER NAVBAR */}
      <header className="glass-card landing-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Sparkles className="animate-float" size={28} style={{ color: 'var(--accent-blue)' }} />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.6rem', letterSpacing: '-0.03em' }}>PeerColab</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span className="landing-badge" style={{ fontSize: '0.8rem', fontWeight: 800, padding: '0.35rem 0.75rem', background: '#e0f2fe', color: '#0369a1', border: '1.5px solid #000000', borderRadius: '20px' }}>
            v2.0 Live Hub
          </span>
          <button onClick={onEnterHub} className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}>
            Enter Collaborative Hub
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section style={{ textAlign: 'center', marginBottom: '5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="glass-card animate-float" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.9rem', borderRadius: '30px', border: '2px solid #000000', background: '#fef08a', color: '#854d0e', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: 800, boxShadow: '2px 2px 0px #000000' }}>
          <BrainCircuit size={16} />
          <span>Your Social Learning Network</span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.04em', maxWidth: '900px', marginBottom: '1.5rem', textTransform: 'uppercase' }}>
          Collaborate. Brainstorm. <span style={{ textDecoration: 'underline', textDecorationColor: 'var(--accent-blue)', textDecorationThickness: '6px' }}>Conquer Subjects Together.</span>
        </h1>

        <p style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)', color: '#444', maxWidth: '680px', marginBottom: '2.5rem', lineHeight: 1.5, fontWeight: 500 }}>
          PeerColab merges shared task management, AI brainstorming, gamified peer recommendation loops, and WhatsApp-inspired live group chat into a beautiful sketchbook canvas.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
          <button onClick={onEnterHub} className="btn-primary landing-hero-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
            <span>Join Study Room</span>
            <ArrowRight size={18} />
          </button>
          <a href="#interactive-playground" className="btn-secondary landing-hero-btn" style={{ textDecoration: 'none', textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            Try Interactive Playground
          </a>
        </div>
      </section>

      {/* CORE FEATURES GRID */}
      <section style={{ marginBottom: '6rem' }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, textAlign: 'center', marginBottom: '3rem', textTransform: 'uppercase' }}>
          Engineered for Deep Collaboration
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '2rem 1.5rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', border: '2px solid #000000' }}>
              <LayoutGrid size={24} style={{ color: 'var(--accent-blue)' }} />
            </div>
            <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>Shared Workspaces</h4>
            <p style={{ fontSize: '0.9rem', color: '#444', lineHeight: 1.5 }}>
              Create study subjects. Share them instantly with study partners, assign tasks, collaborate on details, and upload workspace tips.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '2rem 1.5rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', border: '2px solid #000000' }}>
              <Lightbulb size={24} style={{ color: '#d97706' }} />
            </div>
            <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>Brainstorm Vault</h4>
            <p style={{ fontSize: '0.9rem', color: '#444', lineHeight: 1.5 }}>
              Capture raw ideas. Tag, categorize, prioritize, and toggle favorites. Use integrated Gemini AI suggestions to unpack your concepts into actionable study plans.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '2rem 1.5rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', border: '2px solid #000000' }}>
              <MessageSquareCode size={24} style={{ color: 'var(--accent-emerald)' }} />
            </div>
            <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>Live WhatsApp Chat</h4>
            <p style={{ fontSize: '0.9rem', color: '#444', lineHeight: 1.5 }}>
              Talk with study groups or directly in private. Pin key messages, search chats, reply to quotes, leave reactions, and share formatted code snippets.
            </p>
          </div>

        </div>
      </section>

      {/* INTERACTIVE PLAYGROUND SHOWCASE */}
      <section id="interactive-playground" style={{ marginBottom: '6rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Interactive Playground
          </h3>
          <p style={{ color: '#555', fontWeight: 600 }}>
            Test-drive the core features of PeerColab below. Try clicking around!
          </p>
        </div>

        {/* PLAYGROUND BOARD WRAPPER */}
        <div className="glass-card playground-board">

          {/* PLAYGROUND NAV SIDEBAR */}
          <div className="playground-sidebar">

            <button
              onClick={() => setActiveTab('workspace')}
              className={`sidebar-menu-btn ${activeTab === 'workspace' ? 'active' : ''}`}
              style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', border: '2px solid #000', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', background: activeTab === 'workspace' ? '#000' : '#fff', color: activeTab === 'workspace' ? '#fff' : '#000', boxShadow: activeTab === 'workspace' ? 'none' : '2px 2px 0px #000' }}
            >
              <LayoutGrid size={18} />
              <span>1. Collaborative Board</span>
            </button>

            <button
              onClick={() => setActiveTab('vault')}
              className={`sidebar-menu-btn ${activeTab === 'vault' ? 'active' : ''}`}
              style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', border: '2px solid #000', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', background: activeTab === 'vault' ? '#000' : '#fff', color: activeTab === 'vault' ? '#fff' : '#000', boxShadow: activeTab === 'vault' ? 'none' : '2px 2px 0px #000' }}
            >
              <Lightbulb size={18} />
              <span>2. Brainstorm Vault</span>
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`sidebar-menu-btn ${activeTab === 'chat' ? 'active' : ''}`}
              style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', border: '2px solid #000', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', background: activeTab === 'chat' ? '#000' : '#fff', color: activeTab === 'chat' ? '#fff' : '#000', boxShadow: activeTab === 'chat' ? 'none' : '2px 2px 0px #000' }}
            >
              <MessageSquareCode size={18} />
              <span>3. WhatsApp Chat</span>
            </button>

            <button
              onClick={() => setActiveTab('heatmap')}
              className={`sidebar-menu-btn ${activeTab === 'heatmap' ? 'active' : ''}`}
              style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', border: '2px solid #000', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', background: activeTab === 'heatmap' ? '#000' : '#fff', color: activeTab === 'heatmap' ? '#fff' : '#000', boxShadow: activeTab === 'heatmap' ? 'none' : '2px 2px 0px #000' }}
            >
              <Calendar size={18} />
              <span>4. Study Heatmap</span>
            </button>

            {/* no xp helper note */}
          </div>

          {/* PLAYGROUND DISPLAY PANE */}
          <div className="playground-display">

            {/* WORKSPACE PLAYGROUND */}
            {activeTab === 'workspace' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
                <div className="landing-playground-header">
                  <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800 }}>Subject: Machine Learning (Shared)</h4>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, background: '#f0fdf4', color: '#166534', padding: '0.2rem 0.6rem', border: '1.5px solid #000', borderRadius: '4px' }}>
                    Active Partners: Sarah, Alex
                  </span>
                </div>

                <p style={{ fontSize: '0.875rem', color: '#555' }}>
                  A shared subject allows all members to view, complete, and add task items. Check off completed items to simulate real-time partner sync:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '0.5rem 0' }}>
                  {mockTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1.1rem', border: '2px solid #000000', borderRadius: '8px', cursor: 'pointer', background: task.completed ? '#f0fdf4' : '#fff', textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? '#166534' : '#000', transition: 'all 0.15s ease' }}
                    >
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => { }} // toggled via parent div click
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', flexShrink: 1, minWidth: 0 }}>{task.title}</span>
                    </div>
                  ))}
                </div>

                {/* Progress bar indicator */}
                <div style={{ marginTop: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 800, marginBottom: '0.35rem' }}>
                    <span>Board Progress</span>
                    <span>{Math.round((mockTasks.filter(t => t.completed).length / mockTasks.length) * 100)}%</span>
                  </div>
                  <div style={{ width: '100%', height: '14px', background: '#FAF8F5', border: '2px solid #000', borderRadius: '20px', overflow: 'hidden' }}>
                    <div style={{ width: `${(mockTasks.filter(t => t.completed).length / mockTasks.length) * 100}%`, height: '100%', background: 'var(--accent-emerald)', transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              </div>
            )}

            {/* VAULT PLAYGROUND */}
            {activeTab === 'vault' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
                <div className="landing-playground-header">
                  <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800 }}>Idea Vault & Gemini Assistant</h4>
                  <button
                    onClick={runAiBrainstorm}
                    disabled={aiTyping}
                    className="btn-primary"
                    style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <BrainCircuit size={16} />
                    <span>{aiTyping ? 'Generating...' : 'Ask AI Suggestions'}</span>
                  </button>
                </div>

                <p style={{ fontSize: '0.875rem', color: '#555' }}>
                  Ditch spreadsheets. Capture thoughts in the vault, favorite important ones, and tap AI to auto-extract plans.
                </p>

                <div className="landing-playground-idea-grid">
                  {mockIdeas.map(idea => (
                    <div key={idea.id} style={{ padding: '0.75rem', border: '2px solid #000', borderRadius: '8px', background: idea.favorite ? '#fffbeb' : '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '90px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', background: '#eaeaea', padding: '0.15rem 0.4rem', border: '1px solid #000', borderRadius: '4px' }}>
                          {idea.category}
                        </span>
                        <Star
                          size={16}
                          onClick={() => toggleFavorite(idea.id)}
                          style={{ cursor: 'pointer', fill: idea.favorite ? '#fbbf24' : 'none', strokeWidth: 2, color: idea.favorite ? '#d97706' : '#666' }}
                        />
                      </div>
                      <h5 style={{ fontWeight: 800, fontSize: '0.85rem', margin: '0.4rem 0' }}>{idea.title}</h5>
                      <span style={{ fontSize: '0.7rem', color: '#666', alignSelf: 'flex-end', fontWeight: 600 }}>Priority: {idea.priority}</span>
                    </div>
                  ))}
                </div>

                {/* AI Panel Response container */}
                {(aiMessage || aiTyping) && (
                  <div className="glass-card" style={{ padding: '1rem', border: '1.5px dashed var(--accent-blue)', background: '#f8fafc', borderRadius: '8px', fontSize: '0.85rem', marginTop: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem', fontWeight: 800, color: 'var(--accent-blue)' }}>
                      <BrainCircuit size={16} />
                      <span>Gemini Assistant Suggestion:</span>
                    </div>
                    <p style={{ fontStyle: 'italic', color: '#334155', lineHeight: 1.4 }}>
                      {aiMessage}
                      {aiTyping && <span className="ai-cursor" style={{ fontWeight: 'bold', marginLeft: '2px' }}>|</span>}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* CHAT PLAYGROUND */}
            {activeTab === 'chat' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>Group Chat: Project Sketchbook</h4>

                {/* Chat window viewport */}
                <div style={{ flexGrow: 1, border: '2px solid #000', borderRadius: '8px', background: '#FAF8F5', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '220px', minHeight: '180px', marginBottom: '0.75rem' }}>
                  {chatMessages.map(msg => (
                    <div
                      key={msg.id}
                      style={{
                        alignSelf: msg.sender === 'You' ? 'flex-end' : 'flex-start',
                        maxWidth: '80%',
                        backgroundColor: msg.sender === 'You' ? '#dbeafe' : msg.sender === 'Study Bot' ? '#f3e8ff' : '#ffffff',
                        border: '1.5px solid #000',
                        borderRadius: '12px',
                        padding: '0.5rem 0.75rem',
                        boxShadow: '1px 1px 0px #000'
                      }}
                    >
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#333', marginBottom: '0.15rem' }}>
                        {msg.sender} <span style={{ fontWeight: 400, color: '#888', marginLeft: '4px' }}>{msg.time}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500, lineHeight: 1.3 }}>{msg.text}</div>
                    </div>
                  ))}

                  {isTyping && (
                    <div style={{ alignSelf: 'flex-start', fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>
                      Study Bot is typing...
                    </div>
                  )}
                </div>

                {/* Send Input Bar */}
                <form onSubmit={handleSendChat} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Type a message to peers..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    style={{ flexGrow: 1, padding: '0.55rem', border: '2px solid #000', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, outline: 'none' }}
                  />
                  <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Send size={16} />
                  </button>
                </form>
              </div>
            )}

            {/* HEATMAP PLAYGROUND */}
            {activeTab === 'heatmap' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
                <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800 }}>Study Activity Tracker</h4>
                <p style={{ fontSize: '0.875rem', color: '#555' }}>
                  PeerColab logs your study events (completed tasks, assigned items, code snippet uploads) and converts them into an interactive heatmap grid. Hover over blocks:
                </p>

                {/* Mock grid cells */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '1rem', border: '2px solid #000', borderRadius: '8px', background: '#FAF8F5' }}>
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-start', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'thin' }}>
                    {Array.from({ length: 42 }).map((_, idx) => {
                      // Determine mock shade levels
                      const shades = ['#EAEAEA', '#d1fae5', '#a7f3d0', '#34d399', '#059669'];
                      const studyHours = [0, 1.5, 3.2, 5.0, 8.4];
                      let shadeIndex = (idx * 3 + 1) % shades.length;
                      if (idx % 6 === 0) shadeIndex = 0; // blank days

                      const hours = studyHours[shadeIndex];
                      const date = new Date();
                      date.setDate(date.getDate() - (42 - idx));
                      const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

                      return (
                        <div
                          key={idx}
                          onMouseEnter={() => {
                            setHoveredCell({ dateStr, hours });
                          }}
                          onMouseLeave={() => setHoveredCell(null)}
                          style={{
                            width: '16px',
                            height: '16px',
                            backgroundColor: shades[shadeIndex],
                            border: '1px solid #000',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            transition: 'transform 0.1s ease',
                            transform: hoveredCell?.dateStr === dateStr ? 'scale(1.2)' : 'none'
                          }}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Hover stats viewer */}
                <div style={{ minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px dashed #000', borderRadius: '8px', background: '#fff' }}>
                  {hoveredCell ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.85rem' }}>
                      <Activity size={18} style={{ color: 'var(--accent-emerald)' }} />
                      <span>{hoveredCell.dateStr}: <strong>{hoveredCell.hours} Hours</strong> of active peer learning.</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: 600 }}>Hover over the contribution tiles above to see details</span>
                  )}
                </div>
              </div>
            )}

          </div>

        </div>
      </section>

      {/* TECH STACK & DESIGN SYSTEM CARD */}
      <section style={{ marginBottom: '4.5rem' }}>
        <div className="glass-card landing-tech-card">
          <div className="tech-card-left">
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 800, marginBottom: '1rem', textTransform: 'uppercase' }}>
              Built for Modern Learners
            </h3>
            <p style={{ color: '#444', lineHeight: 1.5, marginBottom: '1.5rem', fontWeight: 500 }}>
              PeerColab is fully responsive and packages high-performance features in a lightweight bundle. No complex setup, no unnecessary overhead.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 800, background: '#fafafa', border: '1.5px solid #000', padding: '0.3rem 0.7rem', borderRadius: '4px' }}>
                <Code size={14} /> WebSocket Hub
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 800, background: '#fafafa', border: '1.5px solid #000', padding: '0.3rem 0.7rem', borderRadius: '4px' }}>
                <BrainCircuit size={14} /> Gemini Integrations
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 800, background: '#fafafa', border: '1.5px solid #000', padding: '0.3rem 0.7rem', borderRadius: '4px' }}>
                <Activity size={14} /> PWA Offline Ready
              </span>
            </div>
          </div>

          <div className="tech-card-right">
            <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, marginBottom: '1rem' }}>Why choose PeerColab?</h4>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', listStyle: 'none' }}>
              <li style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                ✅ <strong>Zero Distraction:</strong> Beautiful neobrutalist sketchbook interface keeps visual noise out.
              </li>
              <li style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                ✅ <strong>Real-time Co-learning:</strong> Live sockets sync work the microsecond your peers complete it.
              </li>
              <li style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                ✅ <strong>Privacy-First:</strong> Full local control of data formats with easy exports (CSV/JSON).
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '2px solid #000000', paddingTop: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', color: '#666', fontSize: '0.85rem', fontWeight: 600 }}>
        <span>&copy; {new Date().getFullYear()} PeerColab. All rights reserved.</span>
        <span>Collaborate. Brainstorm. Conquer.</span>
      </footer>

    </div>
  );
}

export default LandingPage;
