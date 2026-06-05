import { useState } from 'react';
import axios from 'axios';
import { Sparkles, Mail, Lock, User, LogIn } from 'lucide-react';
import { API_BASE_URL } from '../config';

function Auth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isLogin ? 'login' : 'register';
    const payload = isLogin ? { email, password } : { username, email, password };

    try {
      const res = await axios.post(`${API_BASE_URL}/api/users/${endpoint}`, payload);
      onAuthSuccess(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
          <Sparkles className="animate-float" size={32} style={{ color: 'var(--accent-purple)' }} />
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.2rem', margin: 0, fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>
            PeerColab
          </h1>
        </div>
        
        <h3 style={{ marginBottom: '1.5rem', fontWeight: 600, fontSize: '1.15rem', color: 'var(--text-secondary)' }}>
          {isLogin ? 'Sign In to Hub' : 'Create Account'}
        </h3>
        
        {error && <p className="auth-error">{error}</p>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!isLogin && (
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Username" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required 
                className="form-input-full"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          )}
          <div style={{ position: 'relative' }}>
            <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              className="form-input-full"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              className="form-input-full"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <button type="submit" className="btn-primary-full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <LogIn size={18} />
            <span>{isLogin ? 'Login' : 'Sign Up'}</span>
          </button>
        </form>

        <p className="auth-toggle" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
        </p>
      </div>
    </div>
  );
}

export default Auth;