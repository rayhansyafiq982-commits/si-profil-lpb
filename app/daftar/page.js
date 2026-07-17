'use client';

import UmkmForm from '../../components/UmkmForm';

export default function DaftarPage() {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px 0' }}>
      <img src="/logo-master.png" alt="Logo LPB" style={{ width: 52, height: 52, marginBottom: 12 }} />
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--teal-500)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
        SI-PROFIL · LPB Pama Bessai Berinta
      </div>
      <h1 style={{ fontSize: 26 }}>Daftar UMKM Baru</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 8 }}>
        Setelah selesai, Anda akan mendapatkan link/QR pribadi untuk update data ini kapan saja di kemudian hari.
      </p>
      <UmkmForm mode="baru" />
    </div>
  );
}
