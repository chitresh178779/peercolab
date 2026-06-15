import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, Search, Trash2, Star, Maximize2, Grid, List, 
  Loader2, Sparkles, Lightbulb, X, ArrowUpDown, ChevronDown, Check, Settings
} from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function IdeaVault({ currentUserId }) {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandingId, setExpandingId] = useState(null);
  
  // Form State
  const [newIdeaText, setNewIdeaText] = useState('');
  const [newIdeaProject, setNewIdeaProject] = useState('');
  const [newIdeaType, setNewIdeaType] = useState('');
  const [newIdeaPriority, setNewIdeaPriority] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Settings State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(localStorage.getItem('gemini_api_key') || '');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  
  // Display View State (card or list)
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'list'
  
  // Sort State
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'

  // Expand Modal State
  const [activeExpandedIdea, setActiveExpandedIdea] = useState(null);
  const [dbHasKey, setDbHasKey] = useState(false);

  useEffect(() => {
    fetchIdeas();
    fetchDbKeyStatus();
  }, [currentUserId]);

  const fetchDbKeyStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/users/${currentUserId}/secret-key`);
      setDbHasKey(res.data.hasKey);
    } catch (err) {
      console.error('Error fetching backend key status:', err);
    }
  };

  const handleRetrieveKeyFromProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/users/${currentUserId}/secret-key?decrypt=true`);
      if (res.data.key) {
        setTempApiKey(res.data.key);
      } else {
        alert('No saved key found in your profile.');
      }
    } catch (err) {
      console.error('Error retrieving key from profile:', err);
      alert('Failed to retrieve key from profile.');
    }
  };

  const fetchIdeas = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/ideas/user/${currentUserId}`);
      setIdeas(res.data);
    } catch (err) {
      console.error('Error fetching ideas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseForm = () => {
    setNewIdeaText('');
    setNewIdeaProject('');
    setNewIdeaType('');
    setNewIdeaPriority('');
    setShowForm(false);
  };

  const handleSaveIdea = async (e) => {
    e.preventDefault();
    if (!newIdeaText.trim()) return;

    try {
      setSubmitting(true);
      const key = localStorage.getItem('gemini_api_key');
      const config = key ? { headers: { 'x-gemini-key': key } } : {};
      const res = await axios.post(`${API_BASE_URL}/api/ideas`, {
        userId: currentUserId,
        content: newIdeaText,
        project: newIdeaProject || undefined,
        type: newIdeaType || undefined,
        priority: newIdeaPriority || undefined
      }, config);
      setIdeas([res.data, ...ideas]);
      setNewIdeaText('');
      setNewIdeaProject('');
      setNewIdeaType('');
      setNewIdeaPriority('');
      setShowForm(false);
    } catch (err) {
      console.error('Error saving idea:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteIdea = async (ideaId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this idea?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/ideas/${ideaId}`);
      setIdeas(ideas.filter(idea => idea._id !== ideaId));
      if (activeExpandedIdea?._id === ideaId) {
        setActiveExpandedIdea(null);
      }
    } catch (err) {
      console.error('Error deleting idea:', err);
    }
  };

  const handleToggleFavorite = async (ideaId, e) => {
    e.stopPropagation();
    try {
      const res = await axios.put(`${API_BASE_URL}/api/ideas/${ideaId}/favorite`);
      setIdeas(ideas.map(idea => idea._id === ideaId ? res.data : idea));
      if (activeExpandedIdea?._id === ideaId) {
        setActiveExpandedIdea(res.data);
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const handleExpandIdea = async (ideaId) => {
    const cachedIdea = ideas.find(idea => idea._id === ideaId);
    if (!cachedIdea) return;

    // If already expanded in local state cache, show it right away
    if (cachedIdea.aiExpanded && cachedIdea.aiExpanded.problemStatement) {
      setActiveExpandedIdea(cachedIdea);
      return;
    }

    try {
      setExpandingId(ideaId);
      const key = localStorage.getItem('gemini_api_key');
      const config = key ? { headers: { 'x-gemini-key': key } } : {};
      const res = await axios.post(`${API_BASE_URL}/api/ideas/${ideaId}/expand`, {}, config);
      setIdeas(ideas.map(idea => idea._id === ideaId ? res.data : idea));
      setActiveExpandedIdea(res.data);
    } catch (err) {
      console.error('Error expanding idea:', err);
    } finally {
      setExpandingId(null);
    }
  };

  // Toggle sort field/direction
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get unique lists for filtering
  const projects = ['All', ...new Set(ideas.map(i => i.project))];
  const types = ['All', ...new Set(ideas.map(i => i.type))];

  // Filtering Logic
  const filteredIdeas = ideas.filter(idea => {
    const matchesSearch = 
      idea.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      idea.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      idea.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesProject = selectedProject === 'All' || idea.project === selectedProject;
    const matchesType = selectedType === 'All' || idea.type === selectedType;
    const matchesPriority = selectedPriority === 'All' || idea.priority === selectedPriority;

    return matchesSearch && matchesProject && matchesType && matchesPriority;
  });

  // Sorting Logic
  const sortedIdeas = [...filteredIdeas].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'createdAt') {
      valA = new Date(a.createdAt);
      valB = new Date(b.createdAt);
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'High': return 'priority-badge high';
      case 'Medium': return 'priority-badge medium';
      case 'Low': return 'priority-badge low';
      default: return 'priority-badge';
    }
  };

  return (
    <div className="idea-vault-container">
      {/* HEADER SECTION */}
      <div className="vault-header-actions">
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button 
            className="btn-primary new-idea-trigger" 
            onClick={() => setShowForm(!showForm)}
          >
            <Plus size={16} />
            <span>New Idea</span>
          </button>

          <button 
            className="btn-secondary ai-settings-trigger" 
            onClick={() => {
              setTempApiKey(localStorage.getItem('gemini_api_key') || '');
              setShowSettingsModal(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '2.5px solid #000000', borderRadius: '10px' }}
            title="Configure Gemini API Connection"
          >
            <Settings size={16} />
            <span>AI Connection</span>
            <span className={`ai-status-dot ${localStorage.getItem('gemini_api_key') ? 'connected' : 'heuristics'}`} />
          </button>
        </div>

        <div className="view-toggle-buttons">
          <button 
            className={`toggle-btn ${viewMode === 'card' ? 'active' : ''}`}
            onClick={() => setViewMode('card')}
            title="Grid Card View"
          >
            <Grid size={16} />
          </button>
          <button 
            className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List Table View"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* QUICK CAPTURE FORM */}
      {showForm && (
        <form onSubmit={handleSaveIdea} className="quick-idea-form animate-fade-in">
          <div className="form-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lightbulb size={18} style={{ color: 'var(--accent-purple)' }} />
              <span className="form-title">Capture Your Thought</span>
            </div>
            <button 
              type="button" 
              className="close-form-btn" 
              onClick={handleCloseForm}
            >
              <X size={16} />
            </button>
          </div>

          <textarea
            value={newIdeaText}
            onChange={(e) => setNewIdeaText(e.target.value)}
            placeholder="What's on your mind? Just type it in natural language..."
            className="idea-textarea"
            rows={4}
            required
            disabled={submitting}
          />

          <div className="form-manual-fields">
            <div className="form-field-group">
              <label className="form-field-label">Project Name</label>
              <input
                type="text"
                list="form-projects-list"
                value={newIdeaProject}
                onChange={(e) => setNewIdeaProject(e.target.value)}
                placeholder="Auto-Detect (or type...)"
                className="form-field-input"
                disabled={submitting}
              />
              <datalist id="form-projects-list">
                <option value="PeerColab" />
                <option value="StudySync" />
                <option value="TaskFlow" />
                {projects.filter(p => p !== 'All').map(p => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>

            <div className="form-field-group">
              <label className="form-field-label">Idea Type</label>
              <select
                value={newIdeaType}
                onChange={(e) => setNewIdeaType(e.target.value)}
                className="form-field-select"
                disabled={submitting}
              >
                <option value="">Auto-Detect</option>
                <option value="Feature">Feature</option>
                <option value="Startup Idea">Startup Idea</option>
                <option value="Business Strategy">Business Strategy</option>
                <option value="Research">Research</option>
                <option value="Technical">Technical</option>
                <option value="Content">Content</option>
                <option value="Personal">Personal</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-field-group">
              <label className="form-field-label">Priority</label>
              <select
                value={newIdeaPriority}
                onChange={(e) => setNewIdeaPriority(e.target.value)}
                className="form-field-select"
                disabled={submitting}
              >
                <option value="">Auto-Detect</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="form-footer">
            <span className="ai-hint">
              <Sparkles size={14} className="animate-pulse" />
              <span>AI will auto-fill any unset options</span>
            </span>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={handleCloseForm}
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={submitting || !newIdeaText.trim()}
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <span>Save Idea</span>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* SEARCH AND FILTERS */}
      <div className="vault-filters-bar">
        <div className="search-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search by title, tags, or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-search-input"
          />
        </div>

        <div className="filters-dropdowns">
          <div className="filter-select-wrapper">
            <span className="filter-label">Project:</span>
            <select 
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="filter-select"
            >
              {projects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="filter-select-wrapper">
            <span className="filter-label">Type:</span>
            <select 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="filter-select"
            >
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="filter-select-wrapper">
            <span className="filter-label">Priority:</span>
            <select 
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="filter-select"
            >
              <option value="All">All</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* MAIN VIEW CONTENT */}
      {loading ? (
        <div className="loading-ideas">
          <Loader2 size={36} className="animate-spin" style={{ color: 'var(--accent-purple)' }} />
          <p>Opening your Idea Vault...</p>
        </div>
      ) : sortedIdeas.length === 0 ? (
        <div className="empty-ideas-state">
          <Lightbulb size={48} className="empty-icon" />
          <h3>Your Vault is empty</h3>
          <p>Got a sudden startup idea or a feature suggestion? Add it below in under 15 seconds!</p>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} />
            <span>Create First Idea</span>
          </button>
        </div>
      ) : viewMode === 'card' ? (
        /* CARD VIEW */
        <div className="ideas-grid">
          {sortedIdeas.map((idea) => (
            <div 
              key={idea._id} 
              className={`idea-card ${idea.favorite ? 'is-favorite' : ''}`}
              onClick={() => handleExpandIdea(idea._id)}
            >
              <div className="card-top">
                <span className="idea-project">{idea.project}</span>
                <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={(e) => handleToggleFavorite(idea._id, e)}
                    className={`favorite-action-btn ${idea.favorite ? 'active' : ''}`}
                    title={idea.favorite ? "Unfavorite" : "Favorite"}
                  >
                    <Star size={16} fill={idea.favorite ? "var(--accent-yellow, #eab308)" : "none"} />
                  </button>
                  <button 
                    onClick={(e) => handleDeleteIdea(idea._id, e)}
                    className="delete-action-btn"
                    title="Delete Idea"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <h3 className="idea-card-title">{idea.title}</h3>
              <p className="idea-card-snippet">{idea.content}</p>

              <div className="card-bottom">
                <span className={getPriorityBadgeClass(idea.priority)}>
                  {idea.priority}
                </span>
                
                <span className="idea-card-type">{idea.type}</span>
              </div>

              {idea.tags && idea.tags.length > 0 && (
                <div className="idea-card-tags">
                  {idea.tags.map((tag, idx) => (
                    <span key={idx} className="idea-tag">#{tag}</span>
                  ))}
                </div>
              )}

              <div className="card-footer-date">
                <span>Created {new Date(idea.createdAt).toLocaleDateString()}</span>
                <button 
                  className="btn-expand-link"
                  disabled={expandingId === idea._id}
                >
                  {expandingId === idea._id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Maximize2 size={12} />
                  )}
                  <span>Expand</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LIST/TABLE VIEW */
        <div className="table-responsive">
          <table className="ideas-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('title')}>
                  <div className="th-content">
                    <span>Title</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th onClick={() => handleSort('project')}>
                  <div className="th-content">
                    <span>Project</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th onClick={() => handleSort('type')}>
                  <div className="th-content">
                    <span>Type</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th onClick={() => handleSort('priority')}>
                  <div className="th-content">
                    <span>Priority</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th onClick={() => handleSort('createdAt')}>
                  <div className="th-content">
                    <span>Date Created</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedIdeas.map((idea) => (
                <tr key={idea._id} className={idea.favorite ? 'fav-row' : ''}>
                  <td className="td-title-cell">
                    <div className="td-title-wrapper">
                      <button 
                        onClick={(e) => handleToggleFavorite(idea._id, e)} 
                        className={`row-star-btn ${idea.favorite ? 'active' : ''}`}
                      >
                        <Star size={14} fill={idea.favorite ? "var(--accent-yellow, #eab308)" : "none"} />
                      </button>
                      <span className="idea-list-title" onClick={() => handleExpandIdea(idea._id)}>
                        {idea.title}
                      </span>
                    </div>
                  </td>
                  <td><span className="list-proj-badge">{idea.project}</span></td>
                  <td>{idea.type}</td>
                  <td>
                    <span className={getPriorityBadgeClass(idea.priority)}>
                      {idea.priority}
                    </span>
                  </td>
                  <td>{new Date(idea.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="table-row-actions">
                      <button 
                        onClick={() => handleExpandIdea(idea._id)} 
                        className="row-action-btn view"
                        title="Expand"
                        disabled={expandingId === idea._id}
                      >
                        {expandingId === idea._id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Maximize2 size={14} />
                        )}
                      </button>
                      <button 
                        onClick={(e) => handleDeleteIdea(idea._id, e)} 
                        className="row-action-btn delete"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* EXPANDED IDEA MODAL DRAWER */}
      {activeExpandedIdea && (
        <div className="idea-expand-overlay" onClick={() => setActiveExpandedIdea(null)}>
          <div className="idea-expand-modal animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close-btn"
              onClick={() => setActiveExpandedIdea(null)}
              title="Close modal"
            >
              <X size={18} />
            </button>

            <div className="modal-header">
              <div className="modal-header-top">
                <span className="list-proj-badge">{activeExpandedIdea.project}</span>
                <span className="modal-idea-type">{activeExpandedIdea.type}</span>
                <span className={getPriorityBadgeClass(activeExpandedIdea.priority)}>
                  {activeExpandedIdea.priority}
                </span>
              </div>
              <h2 className="modal-title">{activeExpandedIdea.title}</h2>
              <div className="modal-favorite-bar">
                <button 
                  onClick={(e) => handleToggleFavorite(activeExpandedIdea._id, e)}
                  className={`btn-fav-modal ${activeExpandedIdea.favorite ? 'active' : ''}`}
                >
                  <Star size={16} fill={activeExpandedIdea.favorite ? "var(--accent-yellow, #eab308)" : "none"} />
                  <span>{activeExpandedIdea.favorite ? 'Favorited' : 'Add to Favorites'}</span>
                </button>
                <span className="modal-date">Captured on {new Date(activeExpandedIdea.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="modal-body-scroll">
              {/* RAW IDEA SECTION */}
              <div className="expand-section">
                <h4 className="section-subtitle">Original Idea</h4>
                <div className="raw-idea-box">
                  <p>{activeExpandedIdea.content}</p>
                </div>
              </div>

              {/* AI EXPANSION METADATA */}
              {activeExpandedIdea.aiExpanded && activeExpandedIdea.aiExpanded.problemStatement ? (
                <div className="ai-expanded-content">
                  <div className="ai-header-badge">
                    <Sparkles size={16} />
                    <span>AI-Generated Analysis</span>
                  </div>

                  <div className="expand-grid">
                    <div className="expand-section">
                      <h4 className="section-subtitle">Problem Statement</h4>
                      <p className="expanded-text">{activeExpandedIdea.aiExpanded.problemStatement}</p>
                    </div>

                    <div className="expand-section">
                      <h4 className="section-subtitle">Proposed Solution</h4>
                      <p className="expanded-text">{activeExpandedIdea.aiExpanded.proposedSolution}</p>
                    </div>

                    <div className="expand-section">
                      <h4 className="section-subtitle">Target Users</h4>
                      <p className="expanded-text">{activeExpandedIdea.aiExpanded.targetUsers}</p>
                    </div>

                    <div className="expand-section">
                      <h4 className="section-subtitle">Expected Impact</h4>
                      <p className="expanded-text">{activeExpandedIdea.aiExpanded.expectedImpact}</p>
                    </div>
                  </div>

                  {activeExpandedIdea.aiExpanded.nextSteps && activeExpandedIdea.aiExpanded.nextSteps.length > 0 && (
                    <div className="expand-section next-steps-section">
                      <h4 className="section-subtitle">Next Steps & Action Items</h4>
                      <ul className="next-steps-list">
                        {activeExpandedIdea.aiExpanded.nextSteps.map((step, idx) => (
                          <li key={idx}>
                            <Check size={14} className="check-icon" />
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="modal-loading-ai">
                  <Loader2 size={24} className="animate-spin" />
                  <p>Expanding the idea with AI...</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={() => setActiveExpandedIdea(null)}
              >
                Close
              </button>
              <button 
                className="btn-secondary delete-btn-footer"
                onClick={(e) => handleDeleteIdea(activeExpandedIdea._id, e)}
              >
                <Trash2 size={14} />
                <span>Delete Idea</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="idea-expand-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="idea-expand-modal settings-modal animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close-btn"
              onClick={() => setShowSettingsModal(false)}
              title="Close modal"
            >
              <X size={18} />
            </button>

            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings size={20} style={{ color: 'var(--accent-purple)' }} />
                <h2 className="modal-title" style={{ margin: 0 }}>AI Connection Settings</h2>
              </div>
            </div>

            <div className="modal-body-scroll" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.9rem', color: '#57534e', lineHeight: '1.4', margin: 0 }}>
                To connect the Idea Vault to a live Gemini AI model, enter your Google AI Studio API Key below. 
                You can save it locally in your browser, or autofill it from your profile if you previously saved it in your settings.
              </p>

              <div className="form-field-group">
                <label className="form-field-label">Gemini API Key</label>
                <div className="api-key-input-group">
                  <input
                    type="password"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="form-field-input"
                    style={{ letterSpacing: tempApiKey ? '0.125em' : 'normal', flex: 1 }}
                  />
                  {dbHasKey && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleRetrieveKeyFromProfile}
                      style={{ padding: '0.5rem 0.75rem', border: '2.5px solid #000000', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}
                      title="Load the key stored securely in your user profile"
                    >
                      <Sparkles size={14} />
                      <span>Autofill from Profile</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="ai-hint" style={{ background: '#ecfdf5', borderColor: '#000000', color: '#065f46' }}>
                <Sparkles size={14} />
                <span>You can get a free API Key from the Google AI Studio console.</span>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'flex-end', gap: '0.75rem' }}>
              {localStorage.getItem('gemini_api_key') && (
                <button 
                  className="btn-secondary delete-btn-footer"
                  onClick={() => {
                    localStorage.removeItem('gemini_api_key');
                    setTempApiKey('');
                    setShowSettingsModal(false);
                    alert('Gemini API Key removed. Vault will use heuristic fallback analysis.');
                  }}
                  style={{ border: '2px solid #000000' }}
                >
                  Disconnect AI
                </button>
              )}
              <button 
                className="btn-primary" 
                onClick={() => {
                  localStorage.setItem('gemini_api_key', tempApiKey.trim());
                  setShowSettingsModal(false);
                  alert(tempApiKey.trim() ? 'Gemini API Key saved successfully! The vault is now connected to live AI.' : 'Saved! Heuristics fallback will be used.');
                }}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
