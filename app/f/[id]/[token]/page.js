'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import UmkmForm from '../../../../components/UmkmForm';

export default function LinkPribadiPage() {
  const { id, token } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => { loadData(); }, [id, token]);

  async function loadData() {
    setLoading(true);

    const { data: hasil, error } = await supabase.rpc('get_umkm_mandiri', {
      p_id_umkm: id,
      p_token: token,
    });

    if (error || !hasil) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    // token tidak pernah dikirim balik oleh server (tidak lagi ada di kolom umkm);
    // kita sisipkan kembali dari URL agar UmkmForm tetap bisa memakainya saat submit.
    setData({
      umkm: { ...hasil.umkm, akses_token: token },
      legalitas: hasil.legalitas || [],
      produk: hasil.produk || [],
      kemasan: hasil.kemasan || [],
      omzetRiwayat: hasil.omzet_bulanan || [],
    });
    setLoading(false);
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-soft)' }}>Memuat data...</div>;

  if (notFound) {
    return (
      <div style={{ maxWidth: 420, margin: '80px auto', textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <h2>Link tidak valid</h2>
        <p style={{ color: 'var(--ink-soft)', marginTop: 8, fontSize: 13.5 }}>
          Link ini tidak ditemukan atau sudah tidak berlaku. Silakan hubungi Fasilitator LPB Anda untuk mendapatkan link yang benar.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px 0' }}>
      <img src="/logo-master.png" alt="Logo LPB" style={{ width: 52, height: 52, marginBottom: 12 }} />
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--teal-500)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
        SI-PROFIL · Link Pribadi UMKM
      </div>
      <h1 style={{ fontSize: 24 }}>{data.umkm.nama_umkm}</h1>
      <UmkmForm mode="update" existingData={data} />
    </div>
  );
}
