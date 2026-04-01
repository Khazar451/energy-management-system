'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api';
import { Zap, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPw,   setShowPw]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      localStorage.setItem('ems_token',   res.token);
      localStorage.setItem('ems_company', res.companyName);
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Giriş başarısız. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">
            <Zap size={30} color="white" />
          </div>
          <h1 className="login-title">Enerji Yönetim Sistemi</h1>
          <p className="login-sub">Hesabınıza giriş yapın</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">E-posta Adresi</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="admin@sirket.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label" htmlFor="password">Şifre</label>
            <input
              id="password"
              type={showPw ? 'text' : 'password'}
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ paddingRight: 44 }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPw(p => !p)}
              style={{
                position: 'absolute', right: 12, bottom: 10,
                background: 'none', border: 'none',
                color: 'var(--text-muted)', cursor: 'pointer',
              }}
            >
              {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? <span className="spinner" style={{ borderTopColor: 'white' }} /> : 'Giriş Yap'}
          </button>
        </form>

        <p style={{ textAlign:'center', fontSize:12, color:'var(--text-muted)', marginTop:20 }}>
          Demo: <strong>admin@acme.com</strong> / <strong>Test1234!</strong>
        </p>
      </div>
    </div>
  );
}
