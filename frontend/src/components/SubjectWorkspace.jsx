import { useState } from 'react';
import { LayoutGrid, FolderPlus, Plus, BookOpen, CheckSquare, Lightbulb, CheckCircle, Save, Trash2 } from 'lucide-react';

function SubjectWorkspace({ subjects, onAddSubject, onDeleteSubject, onAddTask, onDeleteTask, onCompleteTask, onAddTip }) {
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newTaskTitles, setNewTaskTitles] = useState({});
  const [newTipContents, setNewTipContents] = useState({}); // Track tip inputs per subject
  const [activeTab, setActiveTab] = useState({}); // Track whether user is looking at 'tasks' or 'tips'
  const [subjectError, setSubjectError] = useState('');
  const [taskErrors, setTaskErrors] = useState({}); // subjectId -> error message

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

          return (
            <div key={subject._id} className="subject-card animate-fade-in" style={{ animationDelay: `${idx * 0.08}s` }}>
              {/* Header card with delete subject button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0 }}>
                  <BookOpen size={18} style={{ color: 'var(--accent-blue)' }} />
                  <span>{subject.name}</span>
                </h4>
                <button
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete the subject "${subject.name}" and all its tasks?`)) {
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
              </div>
              
              {/* Tabs to switch between Tasks and Tips */}
              <div className="tab-menu">
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
                      subject.tasks?.map((task) => (
                        <li key={task._id} className={task.isCompleted ? "task-done" : ""} style={{ gap: '10px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexGrow: 1, minWidth: 0, wordBreak: 'break-word' }}>
                            {task.isCompleted ? (
                              <CheckCircle size={14} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
                            ) : (
                              <span style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid var(--text-muted)', display: 'inline-block', flexShrink: 0 }} />
                            )}
                            <span>{task.title}</span>
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                            {!task.isCompleted && (
                              <button 
                                onClick={() => onCompleteTask(subject._id, task._id, task.title, subject.name)}
                                className="btn-complete animate-fade-in"
                              >
                                <CheckCircle size={12} />
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
                      ))
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
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                            <Lightbulb size={16} style={{ color: 'var(--accent-amber)', marginTop: '0.15rem', flexShrink: 0 }} />
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