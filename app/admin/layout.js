'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { RoleProvider } from '../../lib/RoleContext';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    if (pathname === '/admin/login') { setChecking(false); return; }
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.push('/admin/login?redirect=' + pathname);
        setChecking(false);
        return;
      }
      setUser(data.session.user);
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, nama')
        .eq('id', data.session.user.id)
        .single();
      setRole(profile?.role || 'viewer'); // kalau profil tidak ketemu, anggap paling aman: viewer
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

  const isAdmin = role === 'admin';
  const isViewer = role === 'viewer';

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
          {isViewer && (
            <span style={{
              background: 'var(--gold-500)', color: '#3a2a05', fontSize: 10.5, fontWeight: 800,
              padding: '4px 10px', borderRadius: 20, marginLeft: 4,
            }}>
              👁 MODE LIHAT SAJA
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <a href="/admin" style={{ color: '#fff', fontSize: 12.5, textDecoration: 'none', opacity: 0.9 }}>Rekap UMKM</a>
          <a href="/admin/wilayah" style={{ color: '#fff', fontSize: 12.5, textDecoration: 'none', opacity: 0.9 }}>Rekap Wilayah</a>
          <a href="/admin/program" style={{ color: '#fff', fontSize: 12.5, textDecoration: 'none', opacity: 0.9 }}>Program</a>
          <span style={{ fontSize: 11.5, color: 'var(--gold-100)' }}>{user?.email}</span>
          <button onClick={logout} style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
            Keluar
          </button>
        </div>
      </header>
      {isViewer && (
        <div className="no-print" style={{ background: 'var(--gold-100)', color: '#6b4e10', fontSize: 12.5, padding: '8px 24px', textAlign: 'center', fontWeight: 600 }}>
          Anda login sebagai Tim CSR PAMA INDO — akses lihat saja, tidak bisa menambah/mengubah/menghapus data.
        </div>
      )}
      <main style={{ padding: '24px' }}>
        <RoleProvider value={{ role, isAdmin, isViewer }}>
          {children}
        </RoleProvider>
      </main>
    </div>
  );
}
