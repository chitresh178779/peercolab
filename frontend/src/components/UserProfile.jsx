import { useState, useEffect } from 'react';
import axios from 'axios';
import ExcelJS from 'exceljs';
import { X, Download, FileSpreadsheet, User, Mail, Award, CheckCircle2, Clock, BookOpen, Filter, ArrowRight } from 'lucide-react';
import { API_BASE_URL } from '../config';

function UserProfile({ userId, profileId, onClose, currentUsername, isSelf, inline = false }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Category (Subject) filtering
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  
  // Friends list for combined export (only used when isSelf is true)
  const [friends, setFriends] = useState([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);
  const [exportingCombined, setExportingCombined] = useState(false);

  const handleToggleFriend = (friendId) => {
    setSelectedFriendIds(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId) 
        : [...prev, friendId]
    );
  };

  const handleSelectAllFriends = () => {
    if (selectedFriendIds.length === friends.length) {
      setSelectedFriendIds([]);
    } else {
      setSelectedFriendIds(friends.map(f => f._id));
    }
  };

  useEffect(() => {
    fetchProfile();
    if (isSelf) {
      fetchFriends();
    }
  }, [profileId]);

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE_URL}/api/users/${profileId}/profile`);
      setProfileData(res.data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFriends = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/users/${userId}/friends`);
      setFriends(res.data);
    } catch (err) {
      console.error('Error fetching friends list:', err);
    }
  };

  // Helper to apply advanced styling to an ExcelJS worksheet
  const formatWorksheet = (worksheet, title, headers, rows, isCombined = false) => {
    worksheet.views = [{ showGridLines: true }];

    // 1. Title Banner Row
    const lastColLetter = String.fromCharCode(64 + headers.length);
    worksheet.mergeCells(`A1:${lastColLetter}1`);
    const titleCell = worksheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isCombined ? 'FF6D28D9' : 'FF4F46E5' } // Purple theme for combined, Indigo for individual
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 40;

    // 2. Add Table Headers (Row 3)
    worksheet.getRow(3).values = headers;
    worksheet.getRow(3).height = 26;
    headers.forEach((h, colIndex) => {
      const cell = worksheet.getCell(3, colIndex + 1);
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isCombined ? 'FF4C1D95' : 'FF312E81' } // Darker background
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'medium', color: { argb: 'FF1E1B4B' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });

    // 3. Add Data Rows
    rows.forEach((row, idx) => {
      const addedRow = worksheet.addRow(row);
      addedRow.height = 20;
      const rNum = addedRow.number;

      row.forEach((val, colIndex) => {
        const cell = worksheet.getCell(rNum, colIndex + 1);
        
        // Base Font
        cell.font = { name: 'Arial', size: 9, color: { argb: 'FF1E293B' } };
        
        // Alternating row backgrounds (grey/indigo tint)
        if (rNum % 2 === 0) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' }
          };
        }

        // Horizontal alignment depending on text content
        const isTextCol = isCombined ? (colIndex === 1 || colIndex === 2) : (colIndex === 0 || colIndex === 1);
        if (isTextCol) {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }

        // Status Badge color formatting
        const statusColIndex = isCombined ? 3 : 2;
        if (colIndex === statusColIndex) {
          if (val === 'Completed') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF065F46' } };
          } else if (val === 'Ongoing') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF92400E' } };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
            cell.font = { name: 'Arial', size: 9, color: { argb: 'FF64748B' } };
          }
        }

        // Cell borders
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });
    });

    // 4. Auto-fit column widths
    worksheet.columns.forEach(column => {
      let maxLen = 0;
      column.eachCell({ includeEmpty: false }, (cell) => {
        if (cell.row === 1) return; // Skip title row since it's merged
        const valStr = cell.value ? cell.value.toString() : '';
        if (valStr.length > maxLen) {
          maxLen = valStr.length;
        }
      });
      column.width = Math.max(maxLen + 4, 15);
    });
  };

  // Perform self Excel export
  const handleExportSelf = async () => {
    if (!profileData) return;
    const { user, subjects } = profileData;
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Workspace Tasks');
    
    const headers = ['Subject/Category', 'Task Title', 'Status', 'Completed At', 'Created At'];
    const rows = [];
    
    subjects.forEach(subj => {
      if (subj.tasks && subj.tasks.length > 0) {
        subj.tasks.forEach(task => {
          rows.push([
            subj.name,
            task.title,
            task.isCompleted ? 'Completed' : 'Ongoing',
            task.completedAt ? new Date(task.completedAt).toLocaleString() : 'N/A',
            task.createdAt || subj.createdAt ? new Date(task.createdAt || subj.createdAt).toLocaleString() : 'N/A'
          ]);
        });
      } else {
        rows.push([
          subj.name,
          '(No tasks added)',
          'N/A',
          'N/A',
          new Date(subj.createdAt).toLocaleString()
        ]);
      }
    });

    formatWorksheet(worksheet, `PeerColab Workspace - ${user.username}`, headers, rows, false);

    try {
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${user.username}_workspace_report.xlsx`;
      link.click();
    } catch (err) {
      console.error('Error exporting self Excel:', err);
      alert('Failed to generate report.');
    }
  };

  // Perform combined Excel export (Self + Selected Friends)
  const handleExportCombined = async () => {
    if (selectedFriendIds.length === 0 || !profileData) return;
    setExportingCombined(true);
    
    try {
      const mySubjects = profileData.subjects;

      // Fetch all selected friends' profiles in parallel
      const friendPromises = selectedFriendIds.map(friendId => 
        axios.get(`${API_BASE_URL}/api/users/${friendId}/profile`)
      );
      const friendResponses = await Promise.all(friendPromises);

      const workbook = new ExcelJS.Workbook();

      // Create worksheets in display order
      const wsCombined = workbook.addWorksheet('Combined Comparison');
      const wsSelf = workbook.addWorksheet('My Tasks');

      // Construct rows for Self
      const myRows = [];
      mySubjects.forEach(subj => {
        if (subj.tasks && subj.tasks.length > 0) {
          subj.tasks.forEach(task => {
            myRows.push([
              currentUsername,
              subj.name,
              task.title,
              task.isCompleted ? 'Completed' : 'Ongoing',
              task.completedAt ? new Date(task.completedAt).toLocaleString() : 'N/A'
            ]);
          });
        } else {
          myRows.push([
            currentUsername,
            subj.name,
            '(No tasks)',
            'N/A',
            'N/A'
          ]);
        }
      });

      // Format Self tasks worksheet (removes 'Owner' column)
      const singleHeaders = ['Subject/Category', 'Task Title', 'Status', 'Completed At'];
      const mySingleRows = myRows.map(r => r.slice(1));
      formatWorksheet(wsSelf, `${currentUsername}'s Tasks`, singleHeaders, mySingleRows, false);

      const allFriendsRows = [];

      // Add each friend's sheet & build combined rows
      friendResponses.forEach(res => {
        const friendUsername = res.data.user.username;
        const friendSubjects = res.data.subjects;
        
        const friendRows = [];
        friendSubjects.forEach(subj => {
          if (subj.tasks && subj.tasks.length > 0) {
            subj.tasks.forEach(task => {
              friendRows.push([
                friendUsername,
                subj.name,
                task.title,
                task.isCompleted ? 'Completed' : 'Ongoing',
                task.completedAt ? new Date(task.completedAt).toLocaleString() : 'N/A'
              ]);
            });
          } else {
            friendRows.push([
              friendUsername,
              subj.name,
              '(No tasks)',
              'N/A',
              'N/A'
            ]);
          }
        });

        // Add a separate tab/sheet for this friend
        const safeSheetName = friendUsername.substring(0, 20).replace(/[:\\\/\?\*\[\]]/g, '') + "'s Tasks";
        const wsFriend = workbook.addWorksheet(safeSheetName);
        const friendSingleRows = friendRows.map(r => r.slice(1));
        formatWorksheet(wsFriend, `${friendUsername}'s Workspace`, singleHeaders, friendSingleRows, false);

        // Add to combined overview
        allFriendsRows.push(...friendRows);
      });

      // Format Tab 1: Combined overview
      const combinedHeaders = ['Owner', 'Subject/Category', 'Task Title', 'Status', 'Completed At'];
      const combinedRows = [...myRows, ...allFriendsRows];
      formatWorksheet(wsCombined, 'PeerColab Combined Comparative Report', combinedHeaders, combinedRows, true);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${currentUsername}_and_partners_comparison.xlsx`;
      link.click();
    } catch (err) {
      console.error('Error exporting combined excel:', err);
      alert('Failed to generate combined export');
    } finally {
      setExportingCombined(false);
    }
  };

  if (loading) {
    if (inline) {
      return (
        <div className="workspace-pane animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '350px' }}>
          <div className="spinner"></div>
          <p style={{ marginLeft: '1rem', color: 'var(--text-secondary)' }}>Loading profile environment...</p>
        </div>
      );
    }
    return (
      <div className="profile-overlay-modal animate-fade-in">
        <div className="profile-modal-content glass-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '350px' }}>
          <div className="spinner"></div>
          <p style={{ marginLeft: '1rem', color: 'var(--text-secondary)' }}>Loading profile environment...</p>
        </div>
      </div>
    );
  }

  if (error || !profileData) {
    if (inline) {
      return (
        <div className="workspace-pane animate-fade-in" style={{ padding: '2rem', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--accent-rose)', marginBottom: '1rem' }}>⚠️ Access Error</h3>
          <p>{error || 'Unable to retrieve user workspace.'}</p>
        </div>
      );
    }
    return (
      <div className="profile-overlay-modal animate-fade-in">
        <div className="profile-modal-content glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
          <button className="close-modal-btn" onClick={onClose}><X size={20} /></button>
          <h3 style={{ color: 'var(--accent-rose)', marginBottom: '1rem' }}>⚠️ Access Error</h3>
          <p>{error || 'Unable to retrieve user workspace.'}</p>
          <button className="btn-secondary" style={{ marginTop: '1.5rem' }} onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const { user, subjects } = profileData;

  // Flatten tasks to filter and display
  let allTasks = [];
  subjects.forEach(subj => {
    if (subj.tasks) {
      subj.tasks.forEach(task => {
        allTasks.push({
          ...task,
          subjectId: subj._id,
          subjectName: subj.name
        });
      });
    }
  });

  // Calculate statistics
  const totalSubjects = subjects.length;
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(t => t.isCompleted).length;
  const ongoingTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Apply subject filter
  const filteredTasks = selectedSubject === 'ALL' 
    ? allTasks 
    : allTasks.filter(t => t.subjectId === selectedSubject);

  const ongoingFiltered = filteredTasks.filter(t => !t.isCompleted);
  const completedFiltered = filteredTasks.filter(t => t.isCompleted);

  const Wrapper = ({ children }) => {
    if (inline) {
      return (
        <div className="workspace-pane animate-fade-in" style={{ width: '100%', maxWidth: '100%', background: '#ffffff', border: '2.5px solid #000000', borderRadius: '16px', padding: '2.2rem' }}>
          {children}
        </div>
      );
    }
    return (
      <div className="profile-overlay-modal animate-fade-in">
        <div className="profile-modal-content glass-card">
          <button className="close-modal-btn" onClick={onClose} title="Close Profile">
            <X size={20} />
          </button>
          {children}
        </div>
      </div>
    );
  };

  return (
    <Wrapper>

        {/* Profile Header Block */}
        <div className="profile-header-block">
          <div className="avatar-large">
            {user.username.substring(0, 2).toUpperCase()}
          </div>
          <div className="profile-identity">
            <h2>
              {user.username}
              {isSelf && <span className="self-badge">You</span>}
            </h2>
            <p className="profile-email">
              <Mail size={14} style={{ color: 'var(--text-muted)' }} />
              <span>{user.email}</span>
            </p>
            <p className="profile-network-stats">
              <span>🤝 <strong>{user.friendsCount}</strong> Study Partners</span>
            </p>
          </div>
          
          {/* Quick Actions / Self Export */}
          <div className="profile-quick-actions">
            <button className="btn-primary" onClick={handleExportSelf} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.875rem' }}>
              <FileSpreadsheet size={16} />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* STATS PANEL GRID */}
        <div className="profile-stats-grid">
          <div className="stat-card">
            <div className="stat-icon-container" style={{ background: 'var(--accent-blue-glow)' }}>
              <BookOpen size={18} style={{ color: 'var(--accent-blue)' }} />
            </div>
            <div className="stat-info">
              <span className="stat-val">{totalSubjects}</span>
              <span className="stat-lbl">Active Subjects</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-container" style={{ background: 'var(--accent-amber-glow)' }}>
              <Clock size={18} style={{ color: 'var(--accent-amber)' }} />
            </div>
            <div className="stat-info">
              <span className="stat-val">{ongoingTasks}</span>
              <span className="stat-lbl">Ongoing Tasks</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-container" style={{ background: 'var(--accent-emerald-glow)' }}>
              <CheckCircle2 size={18} style={{ color: 'var(--accent-emerald)' }} />
            </div>
            <div className="stat-info">
              <span className="stat-val">{completedTasks}</span>
              <span className="stat-lbl">Completed Tasks</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-container" style={{ background: 'var(--accent-purple-glow)' }}>
              <Award size={18} style={{ color: 'var(--accent-purple)' }} />
            </div>
            <div className="stat-info">
              <span className="stat-val">{completionRate}%</span>
              <span className="stat-lbl">Task Progress</span>
            </div>
          </div>
        </div>

        {/* COMBINED EXPORT WITH FRIEND PANEL (Self Only) */}
        {isSelf && (
          <div className="combined-export-panel">
            <h4>
              <FileSpreadsheet size={16} style={{ color: 'var(--accent-purple)' }} />
              <span>Generate Combined Comparative Report</span>
            </h4>
            <div className="combined-export-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
              <p className="combined-desc" style={{ maxWidth: '100%' }}>
                Merge workspaces! Select one or more study partners to compile a side-by-side comparative Excel report, containing separate tabs for everyone, plus a main overview sheet.
              </p>
              
              {friends.length === 0 ? (
                <p className="no-data" style={{ fontSize: '0.85rem', textAlign: 'left', margin: 0 }}>No study partners available yet. Connect with study partners on the dashboard to enable comparison exports.</p>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                    <button 
                      onClick={handleSelectAllFriends} 
                      className="btn-secondary" 
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', borderRadius: '20px' }}
                    >
                      {selectedFriendIds.length === friends.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                    {friends.map(f => {
                      const isChecked = selectedFriendIds.includes(f._id);
                      return (
                        <label 
                          key={f._id} 
                          className={`partner-select-pill ${isChecked ? 'active' : ''}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.4rem 0.85rem',
                            borderRadius: '20px',
                            border: '2px solid #000000',
                            background: isChecked ? '#000000' : '#ffffff',
                            color: isChecked ? '#ffffff' : '#000000',
                            fontSize: '0.825rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: isChecked ? 'none' : '2px 2px 0px #000000',
                            transform: isChecked ? 'translate(1px, 1px)' : 'none',
                            transition: 'var(--transition-fast)'
                          }}
                        >
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleFriend(f._id)}
                            style={{ display: 'none' }}
                          />
                          <span>{isChecked ? '✓' : '+'}</span>
                          <span>{f.username}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', width: '100%', justifyContent: 'flex-start', marginTop: '1rem' }}>
                    <button 
                      onClick={handleExportCombined} 
                      disabled={selectedFriendIds.length === 0 || exportingCombined}
                      className="btn-purple"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}
                    >
                      {exportingCombined ? (
                        <>
                          <div className="spinner-mini"></div>
                          <span>Compiling {selectedFriendIds.length} partners...</span>
                        </>
                      ) : (
                        <>
                          <Download size={14} />
                          <span>Export Combined Excel ({selectedFriendIds.length} Selected)</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* CATEGORY (SUBJECT) FILTER BUTTONS */}
        <div className="category-filter-section">
          <h5>
            <Filter size={14} style={{ color: 'var(--text-secondary)' }} />
            <span>Filter by Subject:</span>
          </h5>
          <div className="filter-badges-container">
            <button 
              className={selectedSubject === 'ALL' ? 'filter-badge active' : 'filter-badge'} 
              onClick={() => setSelectedSubject('ALL')}
            >
              All Subjects ({totalTasks})
            </button>
            {subjects.map(subj => {
              const subjTaskCount = allTasks.filter(t => t.subjectId === subj._id).length;
              return (
                <button 
                  key={subj._id}
                  className={selectedSubject === subj._id ? 'filter-badge active' : 'filter-badge'} 
                  onClick={() => setSelectedSubject(subj._id)}
                >
                  {subj.name} ({subjTaskCount})
                </button>
              );
            })}
          </div>
        </div>

        {/* ONGOING & COMPLETED TASKS SECTIONS */}
        <div className="profile-tasks-columns">
          {/* Ongoing Section */}
          <div className="tasks-col ongoing-col">
            <h4 className="col-header">
              <Clock size={16} style={{ color: 'var(--accent-amber)' }} />
              <span>Ongoing Tasks ({ongoingFiltered.length})</span>
            </h4>
            <div className="profile-tasks-list">
              {ongoingFiltered.length === 0 ? (
                <p className="no-tasks-placeholder">No ongoing tasks here.</p>
              ) : (
                ongoingFiltered.map(task => (
                  <div key={task._id} className="profile-task-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span className="dot dot-ongoing" />
                      <span className="task-title-text">{task.title}</span>
                    </div>
                    {selectedSubject === 'ALL' && (
                      <span className="task-subject-tag">{task.subjectName}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Completed Section */}
          <div className="tasks-col completed-col">
            <h4 className="col-header">
              <CheckCircle2 size={16} style={{ color: 'var(--accent-emerald)' }} />
              <span>Completed Tasks ({completedFiltered.length})</span>
            </h4>
            <div className="profile-tasks-list">
              {completedFiltered.length === 0 ? (
                <p className="no-tasks-placeholder">No completed tasks here.</p>
              ) : (
                completedFiltered.map(task => (
                  <div key={task._id} className="profile-task-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <CheckCircle2 size={14} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
                      <span className="task-title-text task-done-text">{task.title}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {selectedSubject === 'ALL' ? (
                        <span className="task-subject-tag">{task.subjectName}</span>
                      ) : <span />}
                      {task.completedAt && (
                        <span className="completed-timestamp">
                          Finished {new Date(task.completedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

    </Wrapper>
  );
}

export default UserProfile;
