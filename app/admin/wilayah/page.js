'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';

export default function RekapWilayah() {
  const [loading, setLoading] = useState(true);
  const [umkmList, setUmkmList] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [kelasMap, setKelasMap] = useState({});
  const [omzetTerakhirMap, setOmzetTerakhirMap] = useState({});

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: umkm } = await supabase.from('master_umkm').select('id_umkm, wilayah').order('wilayah');
    setUmkmList(umkm || []);

    const { data: status } = await supabase.from('status_tahunan').select('*').eq('tahun', 2026);
    const sMap = {};
    (status || []).forEach((s) => { sMap[s.id_umkm] = s.status; });
    setStatusMap(sMap);

    const { data: kelas } = await supabase.from('kelas_kemandirian').select('*').eq('tahun', 2026).eq('jenis_penilai', 'PAMA');
    const kMap = {};
    (kelas || []).forEach((k) => { kMap[k.id_umkm] = k.kelas; });
    setKelasMap(kMap);

    const { data: omzet } = await supabase.from('omzet_bulanan').select('id_umkm, tahun, bulan, omzet').not('omzet', 'is', null).order('tahun').order('bulan');
    const oMap = {};
    (omzet || []).forEach((o) => { oMap[o.id_umkm] = o.omzet; }); // baris terakhir akan menimpa, jadi hasil akhirnya bulan terbaru
    setOmzetTerakhirMap(oMap);

    setLoading(false);
  }

  const rekap = useMemo(() => {
    const grup = {};
    umkmList.forEach((u) => {
      const w = u.wilayah || '(Tidak diketahui)';
      if (!grup[w]) grup[w] = { total: 0, aktif: 0, omzetTotal: 0, omzetCount: 0, kelas: { Pemula: 0, Madya: 0, 'Pra Mandiri': 0, Mandiri: 0, '-': 0 } };
      grup[w].total += 1;
      if (statusMap[u.id_umkm] !== 'Tidak Aktif') grup[w].aktif += 1;
      const k = kelasMap[u.id_umkm] || '-';
      grup[w].kelas[k] = (grup[w].kelas[k] || 0) + 1;
      const o = omzetTerakhirMap[u.id_umkm];
      if (o) { grup[w].omzetTotal += Number(o); grup[w].omzetCount += 1; }
    });
    return Object.entries(grup).map(([wilayah, d]) => ({
      wilayah, ...d,
      omzetRata: d.omzetCount > 0 ? Math.round(d.omzetTotal / d.omzetCount) : null,
    })).sort((a, b) => b.total - a.total);
  }, [umkmList, statusMap, kelasMap, omzetTerakhirMap]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-soft)' }}>Memuat data...</div>;

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22 }}>Rekap per Wilayah</h2>
        <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 3 }}>Agregat {umkmList.length} UMKM binaan, dikelompokkan berdasarkan wilayah</div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <div style={{ minWidth: 700 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '22% 12% 12% 18% 18% 18%', gap: 8, padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-soft)', borderBottom: '1.4px solid var(--line)' }}>
            <div>Wilayah</div><div>Total UMKM</div><div>Aktif</div><div>Rata-rata Omzet Terakhir</div><div>Kelas Terbanyak</div><div>Distribusi Kelas</div>
          </div>
          {rekap.map((r) => {
            const kelasTerbanyak = Object.entries(r.kelas).filter(([k]) => k !== '-').sort((a, b) => b[1] - a[1])[0];
            return (
              <div key={r.wilayah} style={{ display: 'grid', gridTemplateColumns: '22% 12% 12% 18% 18% 18%', gap: 8, padding: '13px 16px', fontSize: 13, borderBottom: '1px solid var(--line)' }}>
                <div style={{ fontWeight: 600 }}>{r.wilayah}</div>
                <div>{r.total}</div>
                <div>{r.aktif}</div>
                <div>{r.omzetRata ? `Rp ${r.omzetRata.toLocaleString('id-ID')}` : '-'}</div>
                <div>{kelasTerbanyak ? <span className="badge ok">{kelasTerbanyak[0]} ({kelasTerbanyak[1]})</span> : '-'}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                  P:{r.kelas.Pemula} M:{r.kelas.Madya} PM:{r.kelas['Pra Mandiri']} MD:{r.kelas.Mandiri}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
