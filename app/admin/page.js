'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [umkmList, setUmkmList] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [kelasMap, setKelasMap] = useState({});
  const [legalitasMap, setLegalitasMap] = useState({});
  const [produkCountMap, setProdukCountMap] = useState({});
  const [programCountMap, setProgramCountMap] = useState({});
  const [omzetTrendMap, setOmzetTrendMap] = useState({});

  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterWilayah, setFilterWilayah] = useState('');
  const [filterPerhatian, setFilterPerhatian] = useState(false);
  const [filterLinkBelum, setFilterLinkBelum] = useState(false);
  const [tahunAktif, setTahunAktif] = useState(2026);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: umkm } = await supabase.from('master_umkm').select('*').order('id_umkm');
    setUmkmList(umkm || []);

    const { data: status } = await supabase.from('status_tahunan').select('*').eq('tahun', 2026);
    const sMap = {};
    (status || []).forEach((s) => { sMap[s.id_umkm] = s.status; });
    setStatusMap(sMap);

    const { data: kelas } = await supabase.from('kelas_kemandirian').select('*').eq('tahun', 2026);
    const kMap = {};
    (kelas || []).forEach((k) => {
      if (!kMap[k.id_umkm]) kMap[k.id_umkm] = {};
      kMap[k.id_umkm][k.jenis_penilai] = k.kelas;
    });
    setKelasMap(kMap);

    const { data: legalitas } = await supabase.from('legalitas').select('id_umkm, jenis_legalitas');
    const lMap = {};
    (legalitas || []).forEach((l) => {
      if (!lMap[l.id_umkm]) lMap[l.id_umkm] = [];
      if (l.jenis_legalitas) lMap[l.id_umkm].push(l.jenis_legalitas);
    });
    setLegalitasMap(lMap);

    const { data: produk } = await supabase.from('produk').select('id_umkm');
    const pMap = {};
    (produk || []).forEach((p) => { pMap[p.id_umkm] = (pMap[p.id_umkm] || 0) + 1; });
    setProdukCountMap(pMap);

    const { data: program } = await supabase.from('program_aktivitas').select('id_umkm');
    const prMap = {};
    (program || []).forEach((p) => { prMap[p.id_umkm] = (prMap[p.id_umkm] || 0) + 1; });
    setProgramCountMap(prMap);

    // Omzet 3 bulan terakhir untuk deteksi "perlu perhatian" (turun terus)
    const { data: omzet } = await supabase.from('omzet_bulanan').select('id_umkm, tahun, bulan, omzet').not('omzet', 'is', null).order('tahun').order('bulan');
    const oMap = {};
    (omzet || []).forEach((o) => {
      if (!oMap[o.id_umkm]) oMap[o.id_umkm] = [];
      oMap[o.id_umkm].push(o.omzet);
    });
    setOmzetTrendMap(oMap);

    setLoading(false);
  }

  function isPerluPerhatian(id) {
    if (statusMap[id] === 'Tidak Aktif') return true;
    const trend = (omzetTrendMap[id] || []).slice(-3);
    if (trend.length === 3 && trend[0] > trend[1] && trend[1] > trend[2]) return true;
    return false;
  }

  const wilayahOpsi = useMemo(() => {
    const set = new Set(umkmList.map((u) => u.wilayah).filter(Boolean));
    return Array.from(set).sort();
  }, [umkmList]);

  const filtered = useMemo(() => {
    return umkmList.filter((u) => {
      if (search) {
        const q = search.toLowerCase();
        const match = (u.nama_umkm || '').toLowerCase().includes(q) ||
          (u.nama_pemilik || '').toLowerCase().includes(q) ||
          (u.id_umkm || '').toLowerCase().includes(q) ||
          (u.wilayah || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filterKelas) {
        const k = kelasMap[u.id_umkm];
        if (!k || (k.PAMA !== filterKelas && k.YDBA !== filterKelas)) return false;
      }
      if (filterWilayah && u.wilayah !== filterWilayah) return false;
      if (filterPerhatian && !isPerluPerhatian(u.id_umkm)) return false;
      if (filterLinkBelum && u.link_dibagikan_tanggal) return false;
      return true;
    });
  }, [umkmList, search, filterKelas, filterWilayah, filterPerhatian, filterLinkBelum, kelasMap, statusMap, omzetTrendMap]);

  const kpi = useMemo(() => {
    const total = umkmList.length;
    const lengkap = umkmList.filter((u) => (legalitasMap[u.id_umkm] || []).length > 0 && (produkCountMap[u.id_umkm] || 0) > 0).length;
    const perhatian = umkmList.filter((u) => isPerluPerhatian(u.id_umkm)).length;
    const aktif = umkmList.filter((u) => statusMap[u.id_umkm] !== 'Tidak Aktif').length;
    const linkBelum = umkmList.filter((u) => !u.link_dibagikan_tanggal).length;
    return { total, lengkap, perhatian, aktif, linkBelum };
  }, [umkmList, legalitasMap, produkCountMap, statusMap, omzetTrendMap]);

  function exportCSV() {
    const headers = ['ID', 'Nama UMKM', 'Nama Pemilik', 'No HP', 'Wilayah', 'Status', 'Kelas PAMA', 'Kelas YDBA', 'Legalitas', 'Jumlah Produk', 'Program Diikuti'];
    const rows = filtered.map((u) => [
      u.id_umkm, u.nama_umkm, u.nama_pemilik || '', u.no_hp || '', u.wilayah || '',
      statusMap[u.id_umkm] || '-', kelasMap[u.id_umkm]?.PAMA || '-', kelasMap[u.id_umkm]?.YDBA || '-',
      (legalitasMap[u.id_umkm] || []).join('; '), produkCountMap[u.id_umkm] || 0, programCountMap[u.id_umkm] || 0,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SI-PROFIL_rekap_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-soft)' }}>Memuat data...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22 }}>UMKM Binaan — LPB Pama Bessai Berinta</h2>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 3 }}>Data tahun {tahunAktif}</div>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => window.print()}>🖨 Print</button>
          <button className="btn-primary" onClick={exportCSV}>⬇ Export CSV</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 22 }}>
        <div className="card"><div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, color: 'var(--teal-900)' }}>{kpi.total}</div><div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Total UMKM binaan</div></div>
        <div className="card"><div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, color: 'var(--sage)' }}>{kpi.aktif}</div><div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Status aktif</div></div>
        <div className="card"><div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, color: 'var(--teal-900)' }}>{kpi.lengkap}</div><div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Data lengkap</div></div>
        <div className="card" style={{ borderColor: kpi.perhatian > 0 ? 'var(--clay)' : 'var(--line)' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, color: 'var(--clay)' }}>{kpi.perhatian}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>⚠ Perlu perhatian</div>
        </div>
        <div className="card">
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, color: 'var(--gold-500)' }}>{kpi.linkBelum}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>🔗 Link belum dibagikan</div>
        </div>
      </div>

      <div className="no-print" style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input placeholder="🔍 Cari nama / ID / wilayah..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 2, minWidth: 220, padding: '10px 14px', border: '1.4px solid var(--line)', borderRadius: 8 }} />
        <select value={filterKelas} onChange={(e) => setFilterKelas(e.target.value)} style={{ padding: '10px 14px', border: '1.4px solid var(--line)', borderRadius: 8 }}>
          <option value="">Semua Kelas</option>
          <option value="Pemula">Pemula</option>
          <option value="Madya">Madya</option>
          <option value="Pra Mandiri">Pra Mandiri</option>
          <option value="Mandiri">Mandiri</option>
        </select>
        <select value={filterWilayah} onChange={(e) => setFilterWilayah(e.target.value)} style={{ padding: '10px 14px', border: '1.4px solid var(--line)', borderRadius: 8 }}>
          <option value="">Semua Wilayah</option>
          {wilayahOpsi.map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '0 8px' }}>
          <input type="checkbox" checked={filterPerhatian} onChange={(e) => setFilterPerhatian(e.target.checked)} />
          ⚠ Perlu perhatian saja
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '0 8px' }}>
          <input type="checkbox" checked={filterLinkBelum} onChange={(e) => setFilterLinkBelum(e.target.checked)} />
          🔗 Link belum dibagikan
        </label>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <div style={{ minWidth: 860 }}>
          <div className="grid-row grid-head">
            <div>ID</div><div>Nama UMKM</div><div>Wilayah</div><div>Kelas PAMA</div><div>Kelas YDBA</div>
            <div>Legalitas</div><div>Produk</div><div>Program</div><div>Status</div>
          </div>
          {filtered.map((u) => {
            const status = statusMap[u.id_umkm] || '-';
            const kelas = kelasMap[u.id_umkm] || {};
            const legalitas = legalitasMap[u.id_umkm] || [];
            const perhatian = isPerluPerhatian(u.id_umkm);
            return (
              <Link key={u.id_umkm} href={`/admin/umkm/${u.id_umkm}`} className="grid-row grid-body" style={{ background: perhatian ? '#fdf3ef' : undefined }}>
                <div className="id-mono">{u.id_umkm} {u.link_dibagikan_tanggal ? <span title="Link sudah dibagikan">🔗</span> : <span title="Link belum dibagikan" style={{ opacity: 0.3 }}>🔗</span>}</div>
                <div>{perhatian && '⚠ '}{u.nama_umkm}</div>
                <div>{u.wilayah || '-'}</div>
                <div>{kelas.PAMA ? <span className="badge ok">{kelas.PAMA}</span> : '-'}</div>
                <div>{kelas.YDBA ? <span className="badge ok">{kelas.YDBA}</span> : '-'}</div>
                <div>{legalitas.length ? legalitas.join(', ') : <span className="badge bad">Belum ada</span>}</div>
                <div>{produkCountMap[u.id_umkm] || 0}</div>
                <div>{programCountMap[u.id_umkm] || 0}</div>
                <div><span className={`badge ${status === 'Aktif' ? 'ok' : 'bad'}`}>{status}</span></div>
              </Link>
            );
          })}
        </div>
        {filtered.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: 'var(--ink-soft)' }}>Tidak ada UMKM yang cocok dengan filter.</div>}
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 10 }}>Menampilkan {filtered.length} dari {umkmList.length} UMKM binaan</div>
    </div>
  );
}
