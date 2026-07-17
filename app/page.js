'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '60px 20px 80px', textAlign: 'center' }}>
      <img src="/logo-master.png" alt="Logo LPB" style={{ width: 64, height: 64, marginBottom: 16 }} />
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--teal-500)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
        SI-PROFIL · LPB Pama Bessai Berinta
      </div>
      <h1 style={{ fontSize: 26, marginBottom: 12 }}>Sistem Informasi Profil UMKM Binaan</h1>
      <p style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 28 }}>
        Pilih salah satu di bawah sesuai kebutuhan Anda.
      </p>

      <Link href="/daftar" className="btn-primary" style={{ display: 'block', textDecoration: 'none', marginBottom: 14 }}>
        🆕 Daftar sebagai UMKM Baru
      </Link>

      <div className="card" style={{ textAlign: 'left', marginTop: 24 }}>
        <h4 style={{ fontSize: 14, marginBottom: 8 }}>Sudah pernah terdaftar?</h4>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
          Gunakan <strong>link atau QR code pribadi</strong> yang diberikan Fasilitator LPB saat kunjungan untuk update data Anda kapan saja.
          Belum punya atau lupa link-nya? Hubungi Fasilitator LPB Anda.
        </p>
      </div>

      <Link href="/admin/login" style={{ display: 'inline-block', marginTop: 28, fontSize: 12, color: 'var(--ink-soft)', textDecoration: 'none', borderBottom: '1px dotted var(--ink-soft)' }}>
        🔒 Masuk sebagai Fasilitator
      </Link>
    </div>
  );
}
