import { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, Lightbulb, Copy, Share2, Check, ArrowRight, ArrowLeft, BrainCircuit } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function SharedIdea({ ideaId, onClose }) {
  const [idea, setIdea] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/ideas/${ideaId}`)
      .then(res => {
        setIdea(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.response?.data?.message || 'Failed to fetch the shared idea.');
        setLoading(false);
      });
  }, [ideaId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!idea) return;
    const message = `💡 Check out this idea on PeerColab: *${idea.title}*\n\n${window.location.href}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', textAlign: 'center' }}>
        <Lightbulb size={48} className="animate-spin" style={{ color: 'var(--accent-purple)', marginBottom: '1rem' }} />
        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800 }}>Loading Shared Idea...</h3>
      </div>
    );
  }

  if (error || !idea) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', textAlign: 'center' }}>
        <div className="glass-card" style={{ maxWidth: '480px', padding: '2rem', border: '3px solid #000', boxShadow: '4px 4px 0px #000' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, color: '#dc2626', marginBottom: '1rem' }}>Idea Not Found</h3>
          <p style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error || 'This shared idea does not exist or may have been deleted.'}</p>
          <button onClick={onClose} className="btn-primary" style={{ width: '100%' }}>
            Go to PeerColab Homepage
          </button>
        </div>
      </div>
    );
  }

  const getPriorityBadgeStyle = (priority) => {
    switch (priority) {
      case 'High':
        return { backgroundColor: '#fee2e2', color: '#991b1b', border: '2px solid #000000', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 };
      case 'Medium':
        return { backgroundColor: '#fef3c7', color: '#92400e', border: '2px solid #000000', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 };
      default:
        return { backgroundColor: '#e0f2fe', color: '#075985', border: '2px solid #000000', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 };
    }
  };

  return (
    <div className="shared-idea-wrapper animate-fade-in" style={{ padding: '2rem 1.5rem', maxWidth: '800px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* HEADER NAVBAR */}
      <header className="glass-card landing-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Sparkles className="animate-float" size={28} style={{ color: 'var(--accent-purple)' }} />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.6rem', letterSpacing: '-0.03em', margin: 0 }}>PeerColab</h2>
        </div>
        <button onClick={onClose} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.9rem' }}>
          <ArrowLeft size={16} />
          <span>Back to Hub</span>
        </button>
      </header>

      {/* CORE IDEA CARD CONTENT */}
      <main className="glass-card" style={{ border: '3px solid #000000', borderRadius: '16px', padding: '2rem', boxShadow: '6px 6px 0px 0px #000000', background: '#ffffff', position: 'relative' }}>
        
        {/* SHARER ATTRIBUTION & DATE */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '3px solid #000000', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--accent-purple)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.95rem', border: '2px solid #000' }}>
              {idea.user?.username?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, display: 'block' }}>Shared by @{idea.user?.username || 'anonymous'}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Created on {new Date(idea.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={handleCopyLink} 
              className="favorite-action-btn"
              style={{ padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', border: '2px solid #000', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, backgroundColor: copied ? '#d1fae5' : '#ffffff' }}
              title="Copy share link to clipboard"
            >
              {copied ? <Check size={14} style={{ color: '#16a34a' }} /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
            <button 
              onClick={handleShareWhatsApp} 
              className="favorite-action-btn"
              style={{ padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', border: '2px solid #000', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, backgroundColor: '#ffffff', color: '#16a34a' }}
              title="Share on WhatsApp"
            >
              <Share2 size={14} />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* CLASSIFICATION BADGES */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '2px solid #000000', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
            💼 Project: {idea.project || 'General'}
          </span>
          <span style={{ backgroundColor: '#f3e8ff', color: '#6b21a8', border: '2px solid #000000', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
            🏷️ Type: {idea.type || 'Feature'}
          </span>
          <span style={getPriorityBadgeStyle(idea.priority)}>
            🔥 Priority: {idea.priority || 'Medium'}
          </span>
        </div>

        {/* TITLE & DESCRIPTION */}
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem' }}>
          {idea.title}
        </h1>

        <div style={{ backgroundColor: '#fafaf9', border: '2px solid #000000', borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem', fontSize: '1.05rem', lineHeight: '1.6', fontWeight: 500 }}>
          {idea.content}
        </div>

        {/* TAGS CLOUD */}
        {idea.tags && idea.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
            {idea.tags.map((tag, idx) => (
              <span key={idx} style={{ background: '#f5f5f4', color: '#44403c', border: '1.5px solid #000000', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* AI EXPANDED DETAILS PANEL */}
        {idea.aiExpanded && idea.aiExpanded.problemStatement ? (
          <div style={{ border: '2.5px solid #000000', borderRadius: '12px', background: '#FAF8F5', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1rem', background: '#000', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.9rem' }}>
              <BrainCircuit size={16} />
              <span>AI-Generated Idea Blueprint</span>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div>
                <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-purple)' }}>Problem Statement</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#27272a', lineHeight: 1.5, fontWeight: 500 }}>{idea.aiExpanded.problemStatement}</p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-purple)' }}>Proposed Solution</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#27272a', lineHeight: 1.5, fontWeight: 500 }}>{idea.aiExpanded.proposedSolution}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-purple)' }}>Target Users</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#27272a', lineHeight: 1.5, fontWeight: 500 }}>{idea.aiExpanded.targetUsers}</p>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-purple)' }}>Expected Impact</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#27272a', lineHeight: 1.5, fontWeight: 500 }}>{idea.aiExpanded.expectedImpact}</p>
                </div>
              </div>

              {idea.aiExpanded.nextSteps && idea.aiExpanded.nextSteps.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-purple)' }}>Next Steps & Action Items</h4>
                  <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {idea.aiExpanded.nextSteps.map((step, idx) => (
                      <li key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.9rem', fontWeight: 500 }}>
                        <Check size={16} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>
          </div>
        ) : (
          <div style={{ border: '2px dashed #000000', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', background: '#fafaf9' }}>
            <Lightbulb size={24} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>This idea has not been expanded with AI blueprint yet.</p>
          </div>
        )}

      </main>

      {/* CALL TO ACTION BANNER */}
      <section className="glass-card" style={{ border: '3px solid #000000', borderRadius: '16px', padding: '1.75rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem', background: '#fef08a', color: '#854d0e', boxShadow: '4px 4px 0px 0px #000000' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-heading)', margin: '0 0 0.35rem 0', fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase' }}>
            Organize Your Own Ideas
          </h3>
          <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#713f12' }}>
            Join PeerColab to capture concepts, automate study pipelines, and collaborate in real-time with peers.
          </p>
        </div>
        <button onClick={onClose} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1.25rem', fontSize: '0.9rem', alignSelf: 'center' }}>
          <span>Get Started Free</span>
          <ArrowRight size={16} />
        </button>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '2px solid #000000', paddingTop: '1rem', display: 'flex', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
        <span>Powered by PeerColab v2.0 • Study Room Hub</span>
      </footer>

    </div>
  );
}
