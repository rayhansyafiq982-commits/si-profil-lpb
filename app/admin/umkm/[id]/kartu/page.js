'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import QRCode from 'qrcode';
import { supabase } from '../../../../../lib/supabase';

export default function KartuProfilPage() {
  const { id } = useParams();
  const [umkm, setUmkm] = useState(null);
  const [legalitas, setLegalitas] = useState([]);
  const [produk, setProduk] = useState([]);
  const [kelas, setKelas] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true);
    const [u, l, p, k] = await Promise.all([
      supabase.from('master_umkm').select('*').eq('id_umkm', id).single(),
      supabase.from('legalitas').select('*').eq('id_umkm', id),
      supabase.from('produk').select('*').eq('id_umkm', id),
      supabase.from('kelas_kemandirian').select('*').eq('id_umkm', id).eq('tahun', 2026),
    ]);
    setUmkm(u.data);
    setLegalitas(l.data || []);
    setProduk(p.data || []);
    const kMap = {};
    (k.data || []).forEach((row) => { kMap[row.jenis_penilai] = row.kelas; });
    setKelas(kMap);

    if (u.data) {
      const link = `${window.location.origin}/f/${u.data.id_umkm}/${u.data.akses_token}`;
      const qr = await QRCode.toDataURL(link, { width: 200, margin: 1, color: { dark: '#0B3B3C', light: '#FFFFFF' } });
      setQrDataUrl(qr);
    }
    setLoading(false);
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-soft)' }}>Memuat...</div>;
  if (!umkm) return <div style={{ padding: 40 }}>UMKM tidak ditemukan.</div>;

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '24px 20px' }}>
      <div className="no-print" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <a href={`/admin/umkm/${id}`} className="btn-ghost">← Kembali ke detail</a>
        <button className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }} onClick={() => window.print()}>🖨️ Cetak / Simpan PDF</button>
      </div>

      <div className="card" style={{ border: '2px solid var(--teal-900)', padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--teal-900)', paddingBottom: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <img src="/logo-master.png" alt="Logo LPB" style={{ width: 50, height: 50 }} />
            <div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--teal-500)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>SI-PROFIL · Kartu Mitra Binaan</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--ink-soft)' }}>LPB Pama Bessai Berinta</div>
            </div>
          </div>
          {qrDataUrl && <img src={qrDataUrl} alt="QR" style={{ width: 70, height: 70 }} />}
        </div>

        <div className="id-mono" style={{ marginBottom: 4 }}>{umkm.id_umkm}</div>
        <h1 style={{ fontSize: 26, marginBottom: 6 }}>{umkm.nama_umkm}</h1>
        {umkm.nama_pemilik && <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 16 }}>Pemilik: {umkm.nama_pemilik}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-soft)', marginBottom: 4 }}>Lokasi</div>
            <div style={{ fontSize: 13.5 }}>{umkm.daerah}{umkm.daerah && umkm.wilayah ? ', ' : ''}{umkm.wilayah}</div>
          </div>
          <div>
            <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-soft)', marginBottom: 4 }}>Bergabung Sejak</div>
            <div style={{ fontSize: 13.5 }}>{umkm.tahun_masuk || '-'}</div>
          </div>
          <div>
            <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-soft)', marginBottom: 4 }}>Bidang Usaha</div>
            <div style={{ fontSize: 13.5 }}>{umkm.bidang_usaha || '-'} {umkm.spesialisasi && `(${umkm.spesialisasi})`}</div>
          </div>
          <div>
            <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-soft)', marginBottom: 4 }}>Kelas Kemandirian 2026</div>
            <div style={{ fontSize: 13.5 }}>
              PAMA: <strong>{kelas?.PAMA || '-'}</strong> · YDBA: <strong>{kelas?.YDBA || '-'}</strong>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-soft)', marginBottom: 6 }}>Legalitas</div>
          {legalitas.filter((l) => l.jenis_legalitas).length > 0 ? (
            <div className="chip-row">{legalitas.filter((l) => l.jenis_legalitas).map((l, i) => <span key={i} className="chip on">{l.jenis_legalitas}</span>)}</div>
          ) : <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Belum tercatat</div>}
        </div>

        <div>
          <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-soft)', marginBottom: 6 }}>Produk</div>
          {produk.length > 0 ? (
            <div style={{ fontSize: 13.5 }}>{produk.map((p) => p.nama_produk).join(', ')}</div>
          ) : <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Belum tercatat</div>}
        </div>

        <div style={{ marginTop: 24, paddingTop: 12, borderTop: '1px solid var(--line)', fontSize: 10, color: 'var(--ink-soft)', textAlign: 'center' }}>
          Dicetak dari SI-PROFIL · {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>
    </div>
  );
}
