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
    const { data: umkm, error } = await supabase
      .from('master_umkm').select('*').eq('id_umkm', id).eq('akses_token', token).maybeSingle();

    if (error || !umkm) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const [legalitas, produk, kemasan, omzetRiwayat] = await Promise.all([
      supabase.from('legalitas').select('*').eq('id_umkm', id),
      supabase.from('produk').select('*').eq('id_umkm', id),
      supabase.from('kemasan').select('*').eq('id_umkm', id),
      supabase.from('omzet_bulanan').select('*').eq('id_umkm', id).order('tahun', { ascending: false }).order('bulan', { ascending: false }).limit(6),
    ]);

    setData({ umkm, legalitas: legalitas.data || [], produk: produk.data || [], kemasan: kemasan.data || [], omzetRiwayat: omzetRiwayat.data || [] });
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
