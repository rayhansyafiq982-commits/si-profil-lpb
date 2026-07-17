'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError('Email atau password salah.');
    } else {
      router.push(params.get('redirect') || '/admin');
    }
  }

  return (
    <div style={{ maxWidth: 380, margin: '100px auto', padding: 24 }}>
      <img src="/logo-master.png" alt="Logo LPB" style={{ width: 52, height: 52, marginBottom: 12 }} />
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--teal-500)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
        SI-PROFIL · Dashboard Fasilitator
      </div>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Masuk</h1>
      <form onSubmit={handleLogin} className="card">
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <div style={{ color: 'var(--clay)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button className="btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Memeriksa...' : 'Masuk'}
        </button>
      </form>
      <p style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 14, textAlign: 'center' }}>
        Belum punya akun? Minta Fasilitator lain menambahkan Anda lewat Supabase Dashboard.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
