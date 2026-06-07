import { useState } from 'react';
import { LayoutGrid, FolderPlus, Plus, BookOpen, CheckSquare, Lightbulb, CheckCircle, Save, Trash2, UserPlus, Shield } from 'lucide-react';

function SubjectWorkspace({ 
  subjects, 
  currentUserId,
  onAddSubject, 
  onDeleteSubject, 
  onAddTask, 
  onDeleteTask, 
  onCompleteTask, 
  onAddTip,
  onShareSubject,
  onAssignTask
}) {
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newTaskTitles, setNewTaskTitles] = useState({});
  const [newTipContents, setNewTipContents] = useState({}); // Track tip inputs per subject
  const [activeTab, setActiveTab] = useState({}); // Track whether user is looking at 'tasks' or 'tips'
  const [subjectError, setSubjectError] = useState('');
  const [taskErrors, setTaskErrors] = useState({}); // subjectId -> error message

  // Share state management
  const [showShareForm, setShowShareForm] = useState({});
  const [shareUsernames, setShareUsernames] = useState({});
  const [shareErrors, setShareErrors] = useState({});
  const [shareSuccess, setShareSuccess] = useState({});

  const handleSubjectSubmit = async (e) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    setSubjectError('');
    
    const res = await onAddSubject(newSubjectName);
    if (res && !res.success) {
      setSubjectError(res.error);
    } else {
      setNewSubjectName('');
    }
  };

  const handleTaskSubmit = async (e, subjectId) => {
    e.preventDefault();
    const title = newTaskTitles[subjectId];
    if (!title || !title.trim()) return;
    
    setTaskErrors(prev => ({ ...prev, [subjectId]: '' }));
    
    const res = await onAddTask(subjectId, title);
    if (res && !res.success) {
      setTaskErrors(prev => ({ ...prev, [subjectId]: res.error }));
    } else {
      setNewTaskTitles(prev => ({ ...prev, [subjectId]: '' }));
    }
  };

  const handleTipSubmit = (e, subjectId) => {
    e.preventDefault();
    const content = newTipContents[subjectId];
    if (!content || !content.trim()) return;
    onAddTip(subjectId, content);
    setNewTipContents({ ...newTipContents, [subjectId]: '' });
  };

  const handleShareSubmit = async (e, subjectId) => {
    e.preventDefault();
    const username = shareUsernames[subjectId];
    if (!username || !username.trim()) return;

    setShareErrors(prev => ({ ...prev, [subjectId]: '' }));
    setShareSuccess(prev => ({ ...prev, [subjectId]: '' }));

    const res = await onShareSubject(subjectId, username);
    if (res && !res.success) {
      setShareErrors(prev => ({ ...prev, [subjectId]: res.error }));
    } else {
      setShareSuccess(prev => ({ ...prev, [subjectId]: 'Successfully shared subject!' }));
      setShareUsernames(prev => ({ ...prev, [subjectId]: '' }));
      setTimeout(() => {
        setShareSuccess(prev => ({ ...prev, [subjectId]: '' }));
        setShowShareForm(prev => ({ ...prev, [subjectId]: false }));
      }, 2000);
    }
  };

  return (
    <div className="workspace-pane">
      <h3>
        <LayoutGrid size={20} className="icon-blue" style={{ color: 'var(--accent-blue)' }} />
        <span>Your Dashboard</span>
      </h3>
      
      <form onSubmit={handleSubjectSubmit} style={{ marginBottom: '2rem', display: 'flex', gap: '0.75rem' }}>
        <div style={{ position: 'relative', flexGrow: 1 }}>
          <FolderPlus size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="New Subject (e.g., Data Structures, OS)" 
            value={newSubjectName}
            onChange={(e) => {
              setNewSubjectName(e.target.value);
              if (subjectError) setSubjectError('');
            }}
            className="form-input"
            style={{ width: '100%', paddingLeft: '2.5rem' }}
          />
        </div>
        <button type="submit" className="btn-primary" style={{ flexShrink: 0 }}>
          <Plus size={16} />
          <span>Add Subject</span>
        </button>
      </form>
 
      {subjectError && (
        <div className="animate-fade-in" style={{ color: 'var(--accent-rose)', fontSize: '0.875rem', marginTop: '-1.5rem', marginBottom: '1.5rem', paddingLeft: '0.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span>⚠️</span>
          <span>{subjectError}</span>
        </div>
      )}

      {subjects.length === 0 ? (
        <p className="no-data">No subjects added yet. Create one to begin your workspace!</p>
      ) : (
        subjects.map((subject, idx) => {
          const currentTab = activeTab[subject._id] || 'tasks';
          
          // Check if current user is owner
          const isOwner = subject.owner?._id === currentUserId || subject.owner === currentUserId;

          return (
            <div key={subject._id} className="subject-card animate-fade-in" style={{ animationDelay: `${idx * 0.08}s` }}>
              
              {/* Header card with delete subject & share button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BookOpen size={18} style={{ color: 'var(--accent-blue)' }} />
                  <span>{subject.name}</span>
                </h4>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isOwner && (
                    <button
                      onClick={() => setShowShareForm(prev => ({ ...prev, [subject._id]: !prev[subject._id] }))}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: showShareForm[subject._id] ? 'var(--accent-purple)' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px',
                        borderRadius: '4px',
                        transition: 'var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => { if (!showShareForm[subject._id]) e.currentTarget.style.color = 'var(--accent-purple)'; }}
                      onMouseLeave={(e) => { if (!showShareForm[subject._id]) e.currentTarget.style.color = 'var(--text-muted)'; }}
                      title="Share Subject Workspace"
                    >
                      <UserPlus size={16} />
                    </button>
                  )}

                  {isOwner && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete the subject "${subject.name}"?`)) {
                          onDeleteSubject(subject._id);
                        }
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px',
                        borderRadius: '4px',
                        transition: 'var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-rose)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                      title="Delete Subject"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Collaborator Badges */}
              {(subject.isShared || (subject.collaborators && subject.collaborators.length > 0)) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Shield size={12} />
                    <span>Teammates:</span>
                  </span>
                  <span style={{ fontSize: '0.7rem', backgroundColor: '#ffffff', border: '2px solid #000000', padding: '2px 8px', borderRadius: '12px', color: '#000000', fontWeight: 700, boxShadow: '1.5px 1.5px 0px #000000' }}>
                    👑 {subject.owner?.username || 'Owner'}
                  </span>
                  {subject.collaborators?.map(collab => (
                    <span key={collab._id} style={{ fontSize: '0.7rem', backgroundColor: '#ffffff', border: '2px solid #000000', padding: '2px 8px', borderRadius: '12px', color: '#000000', fontWeight: 700, boxShadow: '1.5px 1.5px 0px #000000' }}>
                      {collab.username}
                    </span>
                  ))}
                </div>
              )}

              {/* Share Form Popover */}
              {showShareForm[subject._id] && (
                <form 
                  onSubmit={(e) => handleShareSubmit(e, subject._id)} 
                  className="animate-fade-in"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.03)', 
                    border: '1px dashed var(--border-light)', 
                    padding: '0.75rem', 
                    borderRadius: '8px', 
                    marginBottom: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      placeholder="Partner username..."
                      value={shareUsernames[subject._id] || ''}
                      onChange={(e) => setShareUsernames({ ...shareUsernames, [subject._id]: e.target.value })}
                      className="form-input-small"
                      style={{ flexGrow: 1 }}
                    />
                    <button type="submit" className="btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.75rem' }}>
                      Invite
                    </button>
                  </div>
                  {shareErrors[subject._id] && (
                    <span style={{ fontSize: '0.725rem', color: 'var(--accent-rose)', fontWeight: 600 }}>
                      ⚠️ {shareErrors[subject._id]}
                    </span>
                  )}
                  {shareSuccess[subject._id] && (
                    <span style={{ fontSize: '0.725rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                      ✓ {shareSuccess[subject._id]}
                    </span>
                  )}
                </form>
              )}
              
              {/* Tabs to switch between Tasks and Tips */}
              <div className="tab-menu" style={{ marginBottom: '1rem' }}>
                <button 
                  className={currentTab === 'tasks' ? 'tab-btn active' : 'tab-btn'} 
                  onClick={() => setActiveTab({ ...activeTab, [subject._id]: 'tasks' })}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <CheckSquare size={14} />
                  <span>Tasks ({subject.tasks?.length || 0})</span>
                </button>
                <button 
                  className={currentTab === 'tips' ? 'tab-btn active' : 'tab-btn'} 
                  onClick={() => setActiveTab({ ...activeTab, [subject._id]: 'tips' })}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Lightbulb size={14} />
                  <span>Tips & Tricks ({subject.tips?.length || 0})</span>
                </button>
              </div>

              {/* TASKS VIEW */}
              {currentTab === 'tasks' && (
                <>
                  <form onSubmit={(e) => handleTaskSubmit(e, subject._id)} style={{ display: 'flex', marginBottom: '1rem', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      placeholder="Add a target task..." 
                      value={newTaskTitles[subject._id] || ''}
                      onChange={(e) => {
                        setNewTaskTitles({ ...newTaskTitles, [subject._id]: e.target.value });
                        if (taskErrors[subject._id]) {
                          setTaskErrors(prev => ({ ...prev, [subject._id]: '' }));
                        }
                      }}
                      className="form-input-small"
                    />
                    <button type="submit" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Plus size={14} />
                      <span>Add</span>
                    </button>
                  </form>

                  {taskErrors[subject._id] && (
                    <div className="animate-fade-in" style={{ color: 'var(--accent-rose)', fontSize: '0.8rem', marginTop: '-0.5rem', marginBottom: '0.75rem', paddingLeft: '0.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span>⚠️</span>
                      <span>{taskErrors[subject._id]}</span>
                    </div>
                  )}

                  <ul className="task-list">
                    {subject.tasks && subject.tasks.length === 0 ? (
                      <p className="no-data" style={{ fontSize: '0.8rem', margin: '0.5rem 0' }}>No tasks. Add one above!</p>
                    ) : (
                      subject.tasks?.map((task) => {
                        const assignedToVal = task.assignedTo?._id || task.assignedTo || '';
                        
                        return (
                          <li key={task._id} className={task.isCompleted ? "task-done" : ""} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexGrow: 1, minWidth: 0, wordBreak: 'break-word', fontSize: '0.875rem' }}>
                              {task.isCompleted ? (
                                <CheckCircle size={14} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
                              ) : (
                                <span style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid var(--text-muted)', display: 'inline-block', flexShrink: 0 }} />
                              )}
                              <span>{task.title}</span>
                            </span>
                            
                            {/* Collaborator Task Assignment Controls */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {(subject.isShared || (subject.collaborators && subject.collaborators.length > 0)) && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  {!task.isCompleted ? (
                                    <select
                                      value={assignedToVal}
                                      onChange={(e) => onAssignTask(subject._id, task._id, e.target.value)}
                                      style={{
                                        fontSize: '0.7rem',
                                        padding: '2px 4px',
                                        borderRadius: '4px',
                                        backgroundColor: '#ffffff',
                                        border: '2.5px solid #000000',
                                        color: '#000000',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <option value="">Unassigned</option>
                                      <option value={subject.owner?._id || subject.owner}>{subject.owner?.username || 'Owner'}</option>
                                      {subject.collaborators?.map(collab => (
                                        <option key={collab._id} value={collab._id}>{collab.username}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    task.assignedTo && (
                                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                        Done by: {task.assignedTo?.username || 'Owner'}
                                      </span>
                                    )
                                  )}
                                </div>
                              )}

                              {!task.isCompleted && (
                                <button 
                                  onClick={() => onCompleteTask(subject._id, task._id, task.title, subject.name)}
                                  className="btn-complete animate-fade-in"
                                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                >
                                  <CheckCircle size={10} />
                                  <span>Done</span>
                                </button>
                              )}
                              
                              <button
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to delete the task "${task.title}"?`)) {
                                    onDeleteTask(subject._id, task._id);
                                  }
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'var(--text-muted)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '4px',
                                  borderRadius: '4px',
                                  transition: 'var(--transition-fast)'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-rose)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                title="Delete Task"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </>
              )}

              {/* TIPS VIEW */}
              {currentTab === 'tips' && (
                <>
                  <form onSubmit={(e) => handleTipSubmit(e, subject._id)} style={{ display: 'flex', marginBottom: '1rem', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      placeholder="Upload a tip or resource link..." 
                      value={newTipContents[subject._id] || ''}
                      onChange={(e) => setNewTipContents({ ...newTipContents, [subject._id]: e.target.value })}
                      className="form-input-small"
                    />
                    <button type="submit" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Save size={14} />
                      <span>Save</span>
                    </button>
                  </form>

                  <ul className="tips-list">
                    {subject.tips && subject.tips.length === 0 ? (
                      <p className="no-data" style={{ fontSize: '0.8rem', margin: '0.5rem 0' }}>No tips shared yet. Share a tip!</p>
                    ) : (
                      subject.tips?.map((tip, index) => (
                        <li key={tip._id || index} className="tip-item animate-fade-in">
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.85rem' }}>
                            <Lightbulb size={15} style={{ color: 'var(--accent-amber)', marginTop: '0.15rem', flexShrink: 0 }} />
                            <span>{tip.content}</span>
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                </>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

export default SubjectWorkspace;