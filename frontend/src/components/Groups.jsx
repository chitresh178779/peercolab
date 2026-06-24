import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Users, Plus, Search, Trash2, ExternalLink, Shield, ShieldAlert,
  FileText, Video, Link2, Settings, LogOut, FolderOpen, UserCheck,
  UserMinus, ChevronRight, Play, Save, FileDown, Loader2, Info, Share2, X
} from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function Groups({ currentUserId, subjects }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Group Details State
  const [activeGroup, setActiveGroup] = useState(null);
  const [activeTab, setActiveTab] = useState('resources'); // resources, members, settings

  // Create Group Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupProject, setNewGroupProject] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Add Resource Form State
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceType, setResourceType] = useState('link'); // link, youtube, pdf
  const [resourceUrl, setResourceUrl] = useState('');
  const [resourceNotes, setResourceNotes] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [resourceError, setResourceError] = useState('');

  // Add Member State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [memberSuccess, setMemberSuccess] = useState('');

  // Edit Settings State
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editWhoCanAdd, setEditWhoCanAdd] = useState('all');
  const [editWhoCanEdit, setEditWhoCanEdit] = useState('admins');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');

  // Active YouTube video player state
  const [playingVideoId, setPlayingVideoId] = useState(null);

  // File Input Ref
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchGroups();
  }, [currentUserId]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/groups/user/${currentUserId}`);
      setGroups(res.data);
      // Sync active group if one was open
      if (activeGroup) {
        const updated = res.data.find(g => g._id === activeGroup._id);
        if (updated) {
          setActiveGroup(updated);
        } else {
          setActiveGroup(null);
        }
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      setCreateLoading(true);
      setCreateError('');
      const res = await axios.post(`${API_BASE_URL}/api/groups`, {
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        projectId: newGroupProject || undefined,
        creatorId: currentUserId
      });
      setGroups([res.data, ...groups]);
      setActiveGroup(res.data);
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupProject('');
      setShowCreateForm(false);
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleAddResource = async (e) => {
    e.preventDefault();
    setResourceError('');
    if (!resourceTitle.trim()) {
      setResourceError('Title is required');
      return;
    }

    try {
      setResourceLoading(true);

      if (resourceType === 'pdf') {
        if (!pdfFile) {
          setResourceError('Please choose a PDF file to upload.');
          setResourceLoading(false);
          return;
        }

        // Read file as base64
        const reader = new FileReader();
        reader.readAsDataURL(pdfFile);
        reader.onloadend = async () => {
          try {
            const base64Data = reader.result;
            const res = await axios.post(`${API_BASE_URL}/api/groups/${activeGroup._id}/resources/upload-pdf`, {
              title: resourceTitle.trim(),
              notes: resourceNotes.trim(),
              fileName: pdfFile.name,
              base64Data,
              userId: currentUserId
            });
            setActiveGroup(res.data);
            // Update lists
            setGroups(groups.map(g => g._id === res.data._id ? res.data : g));
            resetResourceForm();
          } catch (err) {
            setResourceError(err.response?.data?.message || 'Error uploading PDF file');
          } finally {
            setResourceLoading(false);
          }
        };
      } else {
        if (!resourceUrl.trim()) {
          setResourceError('Resource URL is required');
          setResourceLoading(false);
          return;
        }

        const res = await axios.post(`${API_BASE_URL}/api/groups/${activeGroup._id}/resources`, {
          title: resourceTitle.trim(),
          type: resourceType,
          url: resourceUrl.trim(),
          notes: resourceNotes.trim(),
          userId: currentUserId
        });

        setActiveGroup(res.data);
        setGroups(groups.map(g => g._id === res.data._id ? res.data : g));
        resetResourceForm();
        setResourceLoading(false);
      }
    } catch (err) {
      setResourceError(err.response?.data?.message || 'Failed to add resource');
      setResourceLoading(false);
    }
  };

  const resetResourceForm = () => {
    setResourceTitle('');
    setResourceUrl('');
    setResourceNotes('');
    setPdfFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowResourceForm(false);
  };

  const handleDeleteResource = async (resourceId) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) return;
    try {
      const res = await axios.delete(
        `${API_BASE_URL}/api/groups/${activeGroup._id}/resources/${resourceId}?userId=${currentUserId}`
      );
      setActiveGroup(res.data);
      setGroups(groups.map(g => g._id === res.data._id ? res.data : g));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete resource');
    }
  };

  // Autocomplete Partner Search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/users/search?username=${searchQuery}`);

        // Filter out people already in group
        const groupMemberIds = activeGroup.members.map(m => m._id.toString());
        const filtered = res.data.filter(u => !groupMemberIds.includes(u._id.toString()));
        setSearchResults(filtered);
      } catch (err) {
        console.error('Search friends error:', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeGroup]);

  const handleAddMember = async (username) => {
    try {
      setMemberLoading(true);
      setMemberError('');
      setMemberSuccess('');

      const res = await axios.post(`${API_BASE_URL}/api/groups/${activeGroup._id}/members`, {
        username,
        adminUserId: currentUserId
      });

      setActiveGroup(res.data);
      setGroups(groups.map(g => g._id === res.data._id ? res.data : g));
      setMemberSuccess(`Successfully added @${username} to the group!`);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      setMemberError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setMemberLoading(false);
    }
  };

  const handleRemoveMember = async (targetUserId, username) => {
    const isSelf = targetUserId === currentUserId;
    const confirmMsg = isSelf
      ? 'Are you sure you want to leave this group?'
      : `Are you sure you want to remove @${username} from the group?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await axios.delete(
        `${API_BASE_URL}/api/groups/${activeGroup._id}/members/${targetUserId}?requestUserId=${currentUserId}`
      );

      if (isSelf) {
        // Redirect to list and remove from local state
        setGroups(groups.filter(g => g._id !== activeGroup._id));
        setActiveGroup(null);
      } else {
        setActiveGroup(res.data);
        setGroups(groups.map(g => g._id === res.data._id ? res.data : g));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error processing request');
    }
  };

  const handleRoleAction = async (targetUserId, action) => {
    try {
      const res = await axios.put(`${API_BASE_URL}/api/groups/${activeGroup._id}/admins`, {
        targetUserId,
        action,
        requestUserId: currentUserId
      });
      setActiveGroup(res.data);
      setGroups(groups.map(g => g._id === res.data._id ? res.data : g));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update admin role');
    }
  };

  // Sync settings inputs when active group changes or settings tab is clicked
  useEffect(() => {
    if (activeGroup) {
      setEditName(activeGroup.name || '');
      setEditDesc(activeGroup.description || '');
      setEditWhoCanAdd(activeGroup.settings?.whoCanAddResources || 'all');
      setEditWhoCanEdit(activeGroup.settings?.whoCanEditInfo || 'admins');
    }
  }, [activeGroup, activeTab]);

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    try {
      setSettingsLoading(true);
      setSettingsError('');
      setSettingsSuccess('');

      const res = await axios.put(`${API_BASE_URL}/api/groups/${activeGroup._id}`, {
        name: editName.trim(),
        description: editDesc.trim(),
        settings: {
          whoCanAddResources: editWhoCanAdd,
          whoCanEditInfo: editWhoCanEdit
        },
        userId: currentUserId
      });

      setActiveGroup(res.data);
      setGroups(groups.map(g => g._id === res.data._id ? res.data : g));
      setSettingsSuccess('Group settings updated successfully!');
      setTimeout(() => setSettingsSuccess(''), 3000);
    } catch (err) {
      setSettingsError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm('⚠️ WARNING: Are you sure you want to permanently delete this group? This will erase all shared files and resources. This action cannot be undone.')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/groups/${activeGroup._id}?userId=${currentUserId}`);
      setGroups(groups.filter(g => g._id !== activeGroup._id));
      setActiveGroup(null);
      alert('Group deleted successfully.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete group');
    }
  };

  // Extract YouTube ID helper
  const getYouTubeId = (url) => {
    const reg = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const m = url.match(reg);
    return m ? m[1] : null;
  };

  // Group roles checks
  const isCreator = activeGroup?.creator?._id === currentUserId || activeGroup?.creator === currentUserId;
  const isAdmin = activeGroup?.admins.some(a => a._id === currentUserId || a === currentUserId);
  const whoCanAdd = activeGroup?.settings?.whoCanAddResources || 'all';
  const whoCanEdit = activeGroup?.settings?.whoCanEditInfo || 'admins';

  const canAddResources = whoCanAdd === 'all' || isAdmin || isCreator;
  const canEditInfo = whoCanEdit === 'all' || isAdmin || isCreator;

  return (
    <div className="workspace-pane groups-pane">

      {/* HEADER ROW */}
      <div className="group-header-row">
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={22} className="icon-blue" style={{ color: 'var(--accent-purple)' }} />
          <span>Project Study Groups</span>
        </h3>

        {activeGroup ? (
          <button
            className="btn-secondary"
            onClick={() => { setActiveGroup(null); setPlayingVideoId(null); }}
            style={{ fontSize: '0.85rem' }}
          >
            ← Back to Groups
          </button>
        ) : (
          <button
            className="btn-primary"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            <Plus size={16} />
            <span>Create Group</span>
          </button>
        )}
      </div>

      {/* CREATE GROUP FORM */}
      {!activeGroup && showCreateForm && (
        <form onSubmit={handleCreateGroup} className="quick-idea-form animate-fade-in" style={{ marginBottom: '2rem' }}>
          <div className="form-header">
            <span className="form-title">Create a Collaborator Group</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
            <div className="form-field-group">
              <label className="form-field-label">Group Name</label>
              <input
                type="text"
                placeholder="e.g., OS Lab Group B, Web Dev Team"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="form-input-full"
                required
                disabled={createLoading}
              />
            </div>

            <div className="form-field-group">
              <label className="form-field-label">Description / Objective</label>
              <textarea
                placeholder="What is this group collaborating on?"
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                className="idea-textarea"
                rows={2}
                disabled={createLoading}
              />
            </div>

            <div className="form-field-group">
              <label className="form-field-label">Link to Project Workspace (Optional)</label>
              <select
                value={newGroupProject}
                onChange={(e) => setNewGroupProject(e.target.value)}
                className="form-field-select"
                disabled={createLoading}
              >
                <option value="">No linked project</option>
                {subjects.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {createError && (
            <div className="auth-error" style={{ margin: '0.5rem 0' }}>
              ⚠️ {createError}
            </div>
          )}

          <div className="form-footer" style={{ justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowCreateForm(false)}
              disabled={createLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={createLoading || !newGroupName.trim()}
            >
              {createLoading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      )}

      {/* GROUPS LIST VIEW */}
      {!activeGroup && (
        <>
          {loading ? (
            <div className="loading-ideas" style={{ padding: '3rem 0' }}>
              <Loader2 size={36} className="animate-spin" style={{ color: 'var(--accent-purple)' }} />
              <p>Fetching your active study groups...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="empty-ideas-state" style={{ padding: '3rem 1.5rem' }}>
              <Users size={48} className="empty-icon" style={{ color: 'var(--accent-purple)' }} />
              <h3>No Study Groups Yet</h3>
              <p>Create a group, link it to your subjects, and invite study partners to share resource links, PDFs, and YouTube videos securely!</p>
              <button className="btn-primary" onClick={() => setShowCreateForm(true)}>
                <Plus size={16} />
                <span>Create Group</span>
              </button>
            </div>
          ) : (
            <div className="ideas-grid">
              {groups.map((group) => (
                <div
                  key={group._id}
                  className="idea-card group-card"
                  onClick={() => { setActiveGroup(group); setActiveTab('resources'); }}
                  style={{ cursor: 'pointer', borderColor: '#000000', transition: 'var(--transition-normal)' }}
                >
                  <div className="card-top">
                    {group.project ? (
                      <span className="idea-project">{group.project.name}</span>
                    ) : (
                      <span className="idea-project" style={{ borderColor: 'var(--text-muted)' }}>Standalone</span>
                    )}
                    <span className="idea-card-type" style={{ backgroundColor: 'rgba(109, 40, 217, 0.08)', color: 'var(--accent-purple)' }}>
                      👥 {group.members?.length || 0} Members
                    </span>
                  </div>

                  <h3 className="idea-card-title" style={{ marginTop: '0.5rem', marginBottom: '0.25rem' }}>{group.name}</h3>
                  <p className="idea-card-snippet" style={{ minHeight: '40px', fontSize: '0.85rem' }}>
                    {group.description || 'No description provided.'}
                  </p>

                  <div className="card-footer-date" style={{ marginTop: '1rem', borderTop: '1.5px solid var(--border-light)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Admin: <strong>@{group.creator?.username || 'user'}</strong>
                    </span>
                    <span className="btn-expand-link" style={{ gap: '0.15rem' }}>
                      <span>Enter Group</span>
                      <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ACTIVE GROUP DETAIL VIEW */}
      {activeGroup && (
        <div className="active-group-workspace animate-fade-in">

          {/* GROUP TOP INFO BAR */}
          <div className="glass-card" style={{ border: '2.5px solid #000000', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '3px 3px 0 #000000', backgroundColor: '#ffffff' }}>
            <div className="group-info-bar-inner">
              <div>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {activeGroup.name}
                </h2>
                <p style={{ margin: '0.25rem 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  {activeGroup.description || 'No description.'}
                </p>
                {activeGroup.project && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.725rem', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #1d4ed8', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                    Project: {activeGroup.project.name}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleRemoveMember(currentUserId, '')}
                  className="btn-secondary"
                  style={{ borderColor: 'var(--accent-rose)', color: 'var(--accent-rose)', padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  disabled={isCreator}
                  title={isCreator ? "Creators cannot leave the group. You must delete the group from Settings instead." : "Leave group"}
                >
                  <LogOut size={13} />
                  <span>Leave Group</span>
                </button>
              </div>
            </div>
          </div>

          {/* WORKSPACE TAB MENU */}
          <div className="tab-menu" style={{ marginBottom: '1.5rem' }}>
            <button
              className={activeTab === 'resources' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setActiveTab('resources')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <FolderOpen size={14} />
              <span>Shared Drive ({activeGroup.resources?.length || 0})</span>
            </button>
            <button
              className={activeTab === 'members' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setActiveTab('members')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Users size={14} />
              <span>Collaborators ({activeGroup.members?.length || 0})</span>
            </button>
            <button
              className={activeTab === 'settings' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setActiveTab('settings')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Settings size={14} />
              <span>Permissions & Settings</span>
            </button>
          </div>

          {/* TAB CONTENT: RESOURCES */}
          {activeTab === 'resources' && (
            <div>
              {/* ADD RESOURCE ROW */}
              <div style={{ marginBottom: '1.5rem' }}>
                {canAddResources ? (
                  !showResourceForm ? (
                    <button
                      className="btn-primary"
                      onClick={() => setShowResourceForm(true)}
                    >
                      <Plus size={16} />
                      <span>Upload Resource</span>
                    </button>
                  ) : (
                    <form onSubmit={handleAddResource} className="quick-idea-form animate-fade-in" style={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}>
                      <div className="form-header">
                        <span className="form-title">Share Resource Link or Document</span>
                        <button type="button" className="close-form-btn" onClick={resetResourceForm}>
                          <X size={16} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
                        <div className="form-field-group">
                          <label className="form-field-label">Resource Title</label>
                          <input
                            type="text"
                            placeholder="e.g., Cheat Sheet PDF, Lecture 4 Video"
                            value={resourceTitle}
                            onChange={(e) => setResourceTitle(e.target.value)}
                            className="form-input-full"
                            required
                            disabled={resourceLoading}
                          />
                        </div>

                        <div className="form-manual-fields">
                          <div className="form-field-group">
                            <label className="form-field-label">Resource Type</label>
                            <select
                              value={resourceType}
                              onChange={(e) => {
                                setResourceType(e.target.value);
                                setResourceUrl('');
                                setPdfFile(null);
                              }}
                              className="form-field-select"
                              disabled={resourceLoading}
                            >
                              <option value="link">Web Link / Article</option>
                              <option value="youtube">YouTube Video</option>
                              <option value="pdf">PDF File (Upload)</option>
                            </select>
                          </div>

                          <div className="form-field-group" style={{ flexGrow: 2 }}>
                            {resourceType === 'pdf' ? (
                              <>
                                <label className="form-field-label">Select PDF Document</label>
                                <input
                                  type="file"
                                  accept="application/pdf"
                                  ref={fileInputRef}
                                  onChange={(e) => setPdfFile(e.target.files[0])}
                                  className="form-field-input"
                                  style={{ padding: '0.4rem' }}
                                  required
                                  disabled={resourceLoading}
                                />
                              </>
                            ) : (
                              <>
                                <label className="form-field-label">Resource Link URL</label>
                                <input
                                  type="url"
                                  placeholder={resourceType === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://example.com/notes'}
                                  value={resourceUrl}
                                  onChange={(e) => setResourceUrl(e.target.value)}
                                  className="form-input-full"
                                  required
                                  disabled={resourceLoading}
                                />
                              </>
                            )}
                          </div>
                        </div>

                        <div className="form-field-group">
                          <label className="form-field-label">Collaborator Notes (Optional)</label>
                          <input
                            type="text"
                            placeholder="Add brief details for your partners..."
                            value={resourceNotes}
                            onChange={(e) => setResourceNotes(e.target.value)}
                            className="form-input-full"
                            disabled={resourceLoading}
                          />
                        </div>
                      </div>

                      {resourceError && (
                        <div className="auth-error" style={{ margin: '0.5rem 0' }}>
                          ⚠️ {resourceError}
                        </div>
                      )}

                      <div className="form-footer" style={{ justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={resetResourceForm}
                          disabled={resourceLoading}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn-primary"
                          disabled={resourceLoading}
                        >
                          {resourceLoading ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <span>Upload to Drive</span>
                          )}
                        </button>
                      </div>
                    </form>
                  )
                ) : (
                  <div className="ai-hint" style={{ background: '#fef3c7', borderColor: '#d97706', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '10px' }}>
                    <Info size={16} />
                    <span>🔒 Only group admins are permitted to upload resources in this group.</span>
                  </div>
                )}
              </div>

              {/* SHARED RESOURCES FEED */}
              {activeGroup.resources && activeGroup.resources.length === 0 ? (
                <p className="no-data" style={{ padding: '2rem' }}>No files or links shared in this group yet. Post something above!</p>
              ) : (
                <div className="ideas-grid">
                  {activeGroup.resources?.map((resource) => {
                    const isUploader = resource.uploadedBy?._id === currentUserId || resource.uploadedBy === currentUserId;
                    const canDelete = isAdmin || isCreator || isUploader;
                    const fullUrl = resource.url.startsWith('/uploads/')
                      ? `${API_BASE_URL}${resource.url}`
                      : resource.url;

                    return (
                      <div
                        key={resource._id}
                        className={`idea-card resource-card-${resource.type || 'link'}`}
                        style={{ cursor: 'default', minHeight: 'auto' }}
                      >
                        <div className="card-top">
                          <span className="idea-project" style={{
                            backgroundColor: resource.type === 'pdf' ? '#fef2f2' : resource.type === 'youtube' ? '#fff5f5' : '#eff6ff',
                            color: resource.type === 'pdf' ? 'var(--accent-rose)' : resource.type === 'youtube' ? '#ef4444' : 'var(--accent-blue)',
                            border: '1.5px solid #000000',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            textTransform: 'uppercase'
                          }}>
                            {resource.type === 'pdf' ? '📄 PDF Document' : resource.type === 'youtube' ? '📺 YouTube' : '🌐 Web Link'}
                          </span>
                          <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteResource(resource._id)}
                                className="delete-action-btn"
                                style={{ padding: '4px', borderRadius: '4px', color: 'var(--text-muted)' }}
                                title="Delete Resource"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>

                        <h3 className="idea-card-title" style={{ marginTop: '0.25rem', marginBottom: '0.5rem' }}>{resource.title}</h3>

                        {resource.notes ? (
                          <p className="idea-card-snippet" style={{ marginBottom: '0.75rem' }}>{resource.notes}</p>
                        ) : (
                          <p className="idea-card-snippet" style={{ marginBottom: '0.75rem', fontStyle: 'italic', opacity: 0.6 }}>No notes provided.</p>
                        )}

                        {/* PREVIEW CONTAINER */}
                        <div style={{ margin: '0.5rem 0 1rem 0', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          {/* YOUTUBE EMBED INLINE OR CARD PREVIEW */}
                          {resource.type === 'youtube' && (
                            <div style={{ width: '100%' }}>
                              {playingVideoId === resource._id ? (
                                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', border: '2px solid #000000', borderRadius: '8px', boxShadow: '2px 2px 0px #000000' }}>
                                  <iframe
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                                    src={`https://www.youtube.com/embed/${getYouTubeId(resource.url)}?autoplay=1`}
                                    title="YouTube video player"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  ></iframe>
                                </div>
                              ) : (
                                /* YouTube Card Preview */
                                <div
                                  onClick={() => setPlayingVideoId(resource._id)}
                                  style={{
                                    position: 'relative',
                                    border: '2px solid #000000',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    height: '140px',
                                    backgroundImage: resource.previewData?.image ? `url(${resource.previewData.image})` : 'none',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    backgroundColor: '#1c1917',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '2px 2px 0px #000000'
                                  }}
                                >
                                  <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                    transition: '0.2s'
                                  }} />
                                  <div style={{
                                    position: 'relative',
                                    zIndex: 2,
                                    backgroundColor: '#ffffff',
                                    border: '2px solid #000000',
                                    borderRadius: '50%',
                                    padding: '8px',
                                    color: '#ef4444',
                                    boxShadow: '2px 2px 0px #000000',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    <Play size={18} fill="#ef4444" />
                                  </div>
                                  <span style={{
                                    position: 'absolute',
                                    bottom: '6px',
                                    left: '8px',
                                    right: '8px',
                                    color: '#ffffff',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    zIndex: 2
                                  }}>
                                    {resource.previewData?.title || 'Watch Video'}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* PDF DOWNLOAD BOX */}
                          {resource.type === 'pdf' && (
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.5rem',
                              border: '2px solid #000000',
                              borderRadius: '8px',
                              padding: '0.6rem 0.85rem',
                              backgroundColor: '#fafaf9',
                              boxShadow: '2px 2px 0px #000000'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                                <FileText size={16} style={{ color: 'var(--accent-rose)' }} />
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {resource.previewData?.title || 'Shared PDF Document'}
                                </span>
                              </div>

                              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                <a
                                  href={fullUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn-secondary"
                                  style={{ padding: '3px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}
                                >
                                  <ExternalLink size={10} />
                                  <span>Open</span>
                                </a>
                                <a
                                  href={fullUrl}
                                  download={resource.previewData?.title || 'file.pdf'}
                                  className="btn-primary"
                                  style={{ padding: '3px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}
                                >
                                  <FileDown size={10} />
                                  <span>Save</span>
                                </a>
                              </div>
                            </div>
                          )}

                          {/* GENERAL LINK CARD PREVIEW */}
                          {resource.type === 'link' && (
                            <div>
                              <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ textDecoration: 'none', color: 'inherit' }}
                              >
                                <div style={{
                                  border: '2px solid #000000',
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  backgroundColor: '#fcfbf7',
                                  transition: '0.2s',
                                  boxShadow: '2px 2px 0px #000000'
                                }}
                                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translate(-1px, -1px)'}
                                  onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                                >
                                  {/* Preview Image */}
                                  {resource.previewData?.image && (
                                    <div style={{
                                      width: '100%',
                                      height: '80px',
                                      backgroundImage: `url(${resource.previewData.image})`,
                                      backgroundSize: 'cover',
                                      backgroundPosition: 'center',
                                      borderBottom: '2px solid #000000'
                                    }} />
                                  )}

                                  {/* Preview Description */}
                                  <div style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-blue)' }}>
                                      {resource.previewData?.siteName || 'Link Preview'}
                                    </span>
                                    <h5 style={{ margin: '0.1rem 0', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {resource.previewData?.title || resource.url}
                                    </h5>
                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                                      {resource.url}
                                    </span>
                                  </div>
                                </div>
                              </a>
                            </div>
                          )}
                        </div>

                        {/* CARD FOOTER */}
                        <div className="card-bottom" style={{ margin: 0, padding: '0.5rem 0 0 0', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.15rem' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Uploaded by: <strong>@{resource.uploadedBy?.username || 'member'}</strong>
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            Shared on {new Date(resource.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: MEMBERS */}
          {activeTab === 'members' && (
            <div>
              {/* ADD MEMBER FORM (Only for Admins) */}
              {isAdmin || isCreator ? (
                <div className="glass-card" style={{ border: '2px dashed #000000', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', backgroundColor: '#fafaf9' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Users size={16} />
                    <span>Invite Study Partners to Group</span>
                  </h4>

                  <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Search collaborator username..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setMemberError('');
                        setMemberSuccess('');
                      }}
                      className="form-input-full"
                      style={{ paddingLeft: '2.5rem' }}
                      disabled={memberLoading}
                    />
                  </div>

                  {searchResults.length > 0 && (
                    <div className="search-results-dropdown" style={{ border: '2px solid #000000', marginTop: '0.5rem', boxShadow: '2px 2px 0px #000000' }}>
                      {searchResults.map(user => (
                        <div key={user._id} className="search-result-row" style={{ padding: '0.5rem 0.75rem' }}>
                          <span style={{ fontWeight: 700 }}>@{user.username} ({user.email})</span>
                          <button
                            onClick={() => handleAddMember(user.username)}
                            className="btn-secondary"
                            style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                            disabled={memberLoading}
                          >
                            Add to Group
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {memberLoading && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>Inviting partner...</p>
                  )}
                  {memberError && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--accent-rose)', fontWeight: 600, margin: '0.5rem 0 0 0' }}>⚠️ {memberError}</p>
                  )}
                  {memberSuccess && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', fontWeight: 600, margin: '0.5rem 0 0 0' }}>✓ {memberSuccess}</p>
                  )}
                </div>
              ) : (
                <div className="ai-hint" style={{ background: '#f5f5f4', borderColor: '#d6d3d1', color: '#57534e', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
                  <Info size={16} />
                  <span>🔒 Only group admins can invite other members.</span>
                </div>
              )}

              {/* MEMBERS LIST */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Group Members ({activeGroup.members?.length || 0})
                </h4>

                {activeGroup.members?.map(member => {
                  const isMemberCreator = activeGroup.creator?._id === member._id || activeGroup.creator === member._id;
                  const isMemberAdmin = activeGroup.admins.some(aId => aId._id === member._id || aId === member._id);
                  const isTargetSelf = member._id === currentUserId;

                  return (
                    <div
                      key={member._id}
                      className="glass-card"
                      style={{
                        border: '2px solid #000000',
                        borderRadius: '10px',
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: '#ffffff',
                        boxShadow: '2px 2px 0px #000000'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                          @{member.username} {isTargetSelf && <strong style={{ color: 'var(--accent-purple)' }}>(You)</strong>}
                        </span>

                        {isMemberCreator ? (
                          <span style={{ fontSize: '0.65rem', backgroundColor: '#fffbeb', border: '1.5px solid #d97706', color: '#b45309', padding: '1px 6px', borderRadius: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                            <Shield size={10} fill="#d97706" />
                            <span>Creator</span>
                          </span>
                        ) : isMemberAdmin ? (
                          <span style={{ fontSize: '0.65rem', backgroundColor: '#f0fdf4', border: '1.5px solid #16a34a', color: '#15803d', padding: '1px 6px', borderRadius: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                            <Shield size={10} />
                            <span>Admin</span>
                          </span>
                        ) : null}
                      </div>

                      {/* Role admin actions (Only visible to Admins, managing other members) */}
                      {(isAdmin || isCreator) && !isMemberCreator && !isTargetSelf && (
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          {isMemberAdmin ? (
                            /* Creator or Admins can demote */
                            <button
                              onClick={() => handleRoleAction(member._id, 'demote')}
                              className="btn-secondary"
                              style={{ padding: '2px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}
                              title="Dismiss as admin"
                            >
                              <ShieldAlert size={10} />
                              <span>Demote</span>
                            </button>
                          ) : (
                            /* Promote to Admin */
                            <button
                              onClick={() => handleRoleAction(member._id, 'promote')}
                              className="btn-primary"
                              style={{ padding: '2px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}
                              title="Make admin"
                            >
                              <UserCheck size={10} />
                              <span>Make Admin</span>
                            </button>
                          )}

                          {/* Remove member from Group */}
                          <button
                            onClick={() => handleRemoveMember(member._id, member.username)}
                            className="btn-secondary"
                            style={{ padding: '2px 8px', fontSize: '0.7rem', borderColor: 'var(--accent-rose)', color: 'var(--accent-rose)', display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}
                            title="Remove member"
                          >
                            <UserMinus size={10} />
                            <span>Remove</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB CONTENT: SETTINGS */}
          {activeTab === 'settings' && (
            <div>
              {canEditInfo ? (
                <form onSubmit={handleUpdateSettings} className="quick-idea-form animate-fade-in" style={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}>
                  <div className="form-header">
                    <span className="form-title">Group Configurations</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem 0' }}>

                    <div className="form-field-group">
                      <label className="form-field-label">Group Title</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="form-input-full"
                        required
                        disabled={settingsLoading}
                      />
                    </div>

                    <div className="form-field-group">
                      <label className="form-field-label">Group Description</label>
                      <textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="idea-textarea"
                        rows={2}
                        disabled={settingsLoading}
                      />
                    </div>

                    <h4 style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Permissions
                    </h4>

                    <div className="form-manual-fields" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-field-group">
                        <label className="form-field-label">Who can upload resources?</label>
                        <select
                          value={editWhoCanAdd}
                          onChange={(e) => setEditWhoCanAdd(e.target.value)}
                          className="form-field-select"
                          disabled={settingsLoading}
                        >
                          <option value="all">All Members</option>
                          <option value="admins">Only Admins</option>
                        </select>
                      </div>

                      <div className="form-field-group">
                        <label className="form-field-label">Who can edit group info?</label>
                        <select
                          value={editWhoCanEdit}
                          onChange={(e) => setEditWhoCanEdit(e.target.value)}
                          className="form-field-select"
                          disabled={settingsLoading}
                        >
                          <option value="all">All Members</option>
                          <option value="admins">Only Admins</option>
                        </select>
                      </div>
                    </div>

                  </div>

                  {settingsError && (
                    <div className="auth-error" style={{ margin: '0.5rem 0' }}>
                      ⚠️ {settingsError}
                    </div>
                  )}

                  {settingsSuccess && (
                    <div className="status-bubble" style={{ margin: '0.5rem 0' }}>
                      {settingsSuccess}
                    </div>
                  )}

                  <div className="form-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      {isCreator && (
                        <button
                          type="button"
                          onClick={handleDeleteGroup}
                          className="btn-secondary"
                          style={{ borderColor: 'var(--accent-rose)', color: 'var(--accent-rose)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Trash2 size={14} />
                          <span>Delete Group</span>
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={settingsLoading || !editName.trim()}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <Save size={14} />
                        <span>{settingsLoading ? 'Saving...' : 'Save Settings'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="ai-hint" style={{ background: '#fef2f2', borderColor: '#f43f5e', color: '#9f1239', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '10px' }}>
                  <ShieldAlert size={16} />
                  <span>🔒 Only group admins have permission to edit settings or delete the group.</span>
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
