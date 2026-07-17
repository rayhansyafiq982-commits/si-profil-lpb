'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (pathname === '/admin/login') { setChecking(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/admin/login?redirect=' + pathname);
      } else {
        setUser(data.session.user);
      }
      setChecking(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && pathname !== '/admin/login') router.push('/admin/login');
    });
    return () => listener.subscription.unsubscribe();
  }, [pathname]);

  async function logout() {
    await supabase.auth.signOut();
    router.push('/admin/login');
  }

  if (pathname === '/admin/login') return children;
  if (checking) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-soft)' }}>Memeriksa sesi...</div>;
  if (!user) return null;

  return (
    <div>
      <header className="no-print" style={{
        background: 'var(--teal-900)', color: '#fff', padding: '14px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo-master.png" alt="Logo LPB" style={{ width: 38, height: 38 }} />
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18 }}>SI-PROFIL</div>
            <div style={{ fontSize: 11, color: 'var(--gold-100)', fontFamily: 'JetBrains Mono, monospace' }}>Dashboard Fasilitator</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <a href="/admin" style={{ color: '#fff', fontSize: 12.5, textDecoration: 'none', opacity: 0.9 }}>Rekap UMKM</a>
          <a href="/admin/wilayah" style={{ color: '#fff', fontSize: 12.5, textDecoration: 'none', opacity: 0.9 }}>Rekap Wilayah</a>
          <span style={{ fontSize: 11.5, color: 'var(--gold-100)' }}>{user?.email}</span>
          <button onClick={logout} style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
            Keluar
          </button>
        </div>
      </header>
      <main style={{ padding: '24px' }}>{children}</main>
    </div>
  );
}
