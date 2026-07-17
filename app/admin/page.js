'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase, KELAS_OPSI, LEGALITAS_OPSI, KATEGORI_PROGRAM } from '../../lib/supabase';

const BIDANG_OPSI = ['Kuliner', 'Pertanian', 'Peternakan', 'Perikanan', 'Kerajinan', 'Jasa', 'Lainnya'];
const PAGE_SIZE = 30;

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [umkmList, setUmkmList] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [statusTahunMap, setStatusTahunMap] = useState({});
  const [kelasMap, setKelasMap] = useState({});
  const [legalitasMap, setLegalitasMap] = useState({});
  const [produkCountMap, setProdukCountMap] = useState({});
  const [programCountMap, setProgramCountMap] = useState({});
  const [programKategoriMap, setProgramKategoriMap] = useState({});
  const [omzetTrendMap, setOmzetTrendMap] = useState({});

  // ---- filter state ----
  const [search, setSearch] = useState('');
  const [filterKelasPama, setFilterKelasPama] = useState('');
  const [filterKelasYdba, setFilterKelasYdba] = useState('');
  const [filterWilayah, setFilterWilayah] = useState('');
  const [filterBidang, setFilterBidang] = useState('');
  const [filterLegalitas, setFilterLegalitas] = useState('');
  const [filterTahunMasuk, setFilterTahunMasuk] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [filterPerhatian, setFilterPerhatian] = useState(false);
  const [filterLinkBelum, setFilterLinkBelum] = useState(false);
  const [sembunyikanTidakAktif, setSembunyikanTidakAktif] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // ---- view state ----
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'card'
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sortBy, setSortBy] = useState('id_umkm');
  const [sortDir, setSortDir] = useState('asc');

  const [tahunAktif] = useState(2026);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: umkm } = await supabase.from('master_umkm').select('*').order('id_umkm');
    setUmkmList(umkm || []);

    const { data: status } = await supabase.from('status_tahunan').select('*').order('tahun');
    const sMap = {}, sTahunMap = {};
    (status || []).forEach((s) => { sMap[s.id_umkm] = s.status; sTahunMap[s.id_umkm] = s.tahun; });
    setStatusMap(sMap);
    setStatusTahunMap(sTahunMap);

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

    const { data: program } = await supabase.from('program_aktivitas').select('id_umkm, kategori');
    const prMap = {}, prKatMap = {};
    (program || []).forEach((p) => {
      prMap[p.id_umkm] = (prMap[p.id_umkm] || 0) + 1;
      if (!prKatMap[p.id_umkm]) prKatMap[p.id_umkm] = new Set();
      prKatMap[p.id_umkm].add(p.kategori);
    });
    setProgramCountMap(prMap);
    setProgramKategoriMap(prKatMap);

    const { data: omzet } = await supabase.from('omzet_bulanan').select('id_umkm, tahun, bulan, omzet').not('omzet', 'is', null).order('tahun').order('bulan');
    const oMap = {};
    (omzet || []).forEach((o) => {
      if (!oMap[o.id_umkm]) oMap[o.id_umkm] = [];
      oMap[o.id_umkm].push(o.omzet);
    });
    setOmzetTrendMap(oMap);

    setLoading(false);
  }

  function alasanPerhatian(id) {
    const alasan = [];
    if (statusMap[id] === 'Tidak Aktif') alasan.push('Tidak Aktif');
    const trend = (omzetTrendMap[id] || []).slice(-3);
    if (trend.length === 3 && trend[0] > trend[1] && trend[1] > trend[2]) alasan.push('Omzet Turun');
    return alasan;
  }
  function isPerluPerhatian(id) { return alasanPerhatian(id).length > 0; }

  const wilayahOpsi = useMemo(() => Array.from(new Set(umkmList.map((u) => u.wilayah).filter(Boolean))).sort(), [umkmList]);
  const tahunMasukOpsi = useMemo(() => Array.from(new Set(umkmList.map((u) => u.tahun_masuk).filter(Boolean))).sort((a, b) => b - a), [umkmList]);

  const activeFilterCount = [
    filterKelasPama, filterKelasYdba, filterWilayah, filterBidang, filterLegalitas,
    filterTahunMasuk, filterProgram, filterPerhatian, filterLinkBelum,
  ].filter((v) => v === true || (typeof v === 'string' && v !== '')).length;

  function clearFilters() {
    setFilterKelasPama(''); setFilterKelasYdba(''); setFilterWilayah(''); setFilterBidang('');
    setFilterLegalitas(''); setFilterTahunMasuk(''); setFilterProgram('');
    setFilterPerhatian(false); setFilterLinkBelum(false);
  }

  const filtered = useMemo(() => {
    let list = umkmList.filter((u) => {
      if (search) {
        const q = search.toLowerCase();
        const match = (u.nama_umkm || '').toLowerCase().includes(q) ||
          (u.nama_pemilik || '').toLowerCase().includes(q) ||
          (u.id_umkm || '').toLowerCase().includes(q) ||
          (u.wilayah || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filterKelasPama && (kelasMap[u.id_umkm] || {}).PAMA !== filterKelasPama) return false;
      if (filterKelasYdba && (kelasMap[u.id_umkm] || {}).YDBA !== filterKelasYdba) return false;
      if (filterWilayah && u.wilayah !== filterWilayah) return false;
      if (filterBidang && u.bidang_usaha !== filterBidang) return false;
      if (filterTahunMasuk && String(u.tahun_masuk) !== String(filterTahunMasuk)) return false;
      if (filterLegalitas) {
        const leg = legalitasMap[u.id_umkm] || [];
        if (filterLegalitas === 'Belum ada') { if (leg.length > 0) return false; }
        else if (!leg.includes(filterLegalitas)) return false;
      }
      if (filterProgram) {
        const kats = programKategoriMap[u.id_umkm];
        if (filterProgram === 'Belum ikut') { if (kats && kats.size > 0) return false; }
        else if (!kats || !kats.has(filterProgram)) return false;
      }
      if (filterPerhatian && !isPerluPerhatian(u.id_umkm)) return false;
      if (filterLinkBelum && u.link_dibagikan_tanggal) return false;
      if (sembunyikanTidakAktif && statusMap[u.id_umkm] === 'Tidak Aktif') return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      let av, bv;
      switch (sortBy) {
        case 'nama_umkm': av = a.nama_umkm || ''; bv = b.nama_umkm || ''; break;
        case 'wilayah': av = a.wilayah || ''; bv = b.wilayah || ''; break;
        case 'kelas_pama': av = (kelasMap[a.id_umkm] || {}).PAMA || ''; bv = (kelasMap[b.id_umkm] || {}).PAMA || ''; break;
        case 'program': av = programCountMap[a.id_umkm] || 0; bv = programCountMap[b.id_umkm] || 0; break;
        case 'status': av = statusMap[a.id_umkm] || ''; bv = statusMap[b.id_umkm] || ''; break;
        default: av = a.id_umkm; bv = b.id_umkm;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [umkmList, search, filterKelasPama, filterKelasYdba, filterWilayah, filterBidang, filterLegalitas,
      filterTahunMasuk, filterProgram, filterPerhatian, filterLinkBelum, sembunyikanTidakAktif,
      kelasMap, statusMap, omzetTrendMap, legalitasMap, programKategoriMap, sortBy, sortDir, programCountMap]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search, filterKelasPama, filterKelasYdba, filterWilayah, filterBidang, filterLegalitas, filterTahunMasuk, filterProgram, filterPerhatian, filterLinkBelum, sembunyikanTidakAktif]);

  const visible = filtered.slice(0, visibleCount);

  const kpi = useMemo(() => {
    const total = umkmList.length;
    const lengkap = umkmList.filter((u) => (legalitasMap[u.id_umkm] || []).length > 0 && (produkCountMap[u.id_umkm] || 0) > 0).length;
    const perhatian = umkmList.filter((u) => isPerluPerhatian(u.id_umkm)).length;
    const aktif = umkmList.filter((u) => statusMap[u.id_umkm] === 'Aktif').length;
    const linkBelum = umkmList.filter((u) => !u.link_dibagikan_tanggal).length;
    return { total, lengkap, perhatian, aktif, linkBelum };
  }, [umkmList, legalitasMap, produkCountMap, statusMap, omzetTrendMap]);

  function exportCSV() {
    const headers = ['ID', 'Nama UMKM', 'Nama Pemilik', 'No HP', 'Wilayah', 'Bidang Usaha', 'Status', 'Kelas PAMA', 'Kelas YDBA', 'Legalitas', 'Jumlah Produk', 'Program Diikuti'];
    const rows = filtered.map((u) => [
      u.id_umkm, u.nama_umkm, u.nama_pemilik || '', u.no_hp || '', u.wilayah || '', u.bidang_usaha || '',
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

  function toggleSort(field) {
    if (sortBy === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  }

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div className="skeleton-pulse" style={{ width: 40, height: 40, borderRadius: '50%', margin: '0 auto 16px' }} />
        <div style={{ color: 'var(--ink-soft)', fontSize: 13 }}>Memuat data UMKM binaan...</div>
      </div>
    );
  }

  return (
    <div className="dash-wrap">
      <div className="dash-header">
        <div>
          <h2 style={{ fontSize: 23 }}>UMKM Binaan</h2>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 3 }}>LPB Pama Bessai Berinta · Data tahun {tahunAktif}</div>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => window.print()}>🖨 Print</button>
          <button className="btn-primary" onClick={exportCSV}>⬇ Export CSV</button>
        </div>
      </div>

      <div className="kpi-row">
        <div className="kpi-card"><div className="kpi-val" style={{ color: 'var(--teal-900)' }}>{kpi.total}</div><div className="kpi-lbl">Total UMKM</div></div>
        <div className="kpi-card"><div className="kpi-val" style={{ color: 'var(--sage)' }}>{kpi.aktif}</div><div className="kpi-lbl">Status aktif</div></div>
        <div className="kpi-card"><div className="kpi-val" style={{ color: 'var(--teal-900)' }}>{kpi.lengkap}</div><div className="kpi-lbl">Data lengkap</div></div>
        <div className="kpi-card" style={{ borderColor: kpi.perhatian > 0 ? 'var(--clay)' : 'var(--line)' }}>
          <div className="kpi-val" style={{ color: 'var(--clay)' }}>{kpi.perhatian}</div><div className="kpi-lbl">⚠ Perlu perhatian</div>
        </div>
        <div className="kpi-card"><div className="kpi-val" style={{ color: 'var(--gold-500)' }}>{kpi.linkBelum}</div><div className="kpi-lbl">🔗 Link belum dibagikan</div></div>
      </div>

      <div className="no-print toolbar">
        <input className="search-input" placeholder="🔍 Cari nama / ID / wilayah..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className={`btn-filter-toggle ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
          ⚙️ Filter {activeFilterCount > 0 && <span className="filter-badge">{activeFilterCount}</span>}
        </button>
        <div className="view-toggle">
          <button className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')} title="Tampilan Tabel">☰</button>
          <button className={viewMode === 'card' ? 'active' : ''} onClick={() => setViewMode('card')} title="Tampilan Kartu">▦</button>
        </div>
      </div>

      {showFilters && (
        <div className="no-print filter-panel">
          <div className="filter-grid">
            <div className="filter-item">
              <label>Kelas PAMA</label>
              <select value={filterKelasPama} onChange={(e) => setFilterKelasPama(e.target.value)}>
                <option value="">Semua</option>
                {KELAS_OPSI.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="filter-item">
              <label>Kelas YDBA</label>
              <select value={filterKelasYdba} onChange={(e) => setFilterKelasYdba(e.target.value)}>
                <option value="">Semua</option>
                {KELAS_OPSI.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="filter-item">
              <label>Wilayah</label>
              <select value={filterWilayah} onChange={(e) => setFilterWilayah(e.target.value)}>
                <option value="">Semua</option>
                {wilayahOpsi.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div className="filter-item">
              <label>Bidang Usaha</label>
              <select value={filterBidang} onChange={(e) => setFilterBidang(e.target.value)}>
                <option value="">Semua</option>
                {BIDANG_OPSI.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="filter-item">
              <label>Legalitas</label>
              <select value={filterLegalitas} onChange={(e) => setFilterLegalitas(e.target.value)}>
                <option value="">Semua</option>
                {LEGALITAS_OPSI.filter((l) => l !== 'Belum ada').map((l) => <option key={l} value={l}>{l}</option>)}
                <option value="Belum ada">Belum ada legalitas</option>
              </select>
            </div>
            <div className="filter-item">
              <label>Tahun Bergabung</label>
              <select value={filterTahunMasuk} onChange={(e) => setFilterTahunMasuk(e.target.value)}>
                <option value="">Semua</option>
                {tahunMasukOpsi.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="filter-item">
              <label>Program Diikuti</label>
              <select value={filterProgram} onChange={(e) => setFilterProgram(e.target.value)}>
                <option value="">Semua</option>
                {KATEGORI_PROGRAM.map((k) => <option key={k} value={k}>{k}</option>)}
                <option value="Belum ikut">Belum ikut program apapun</option>
              </select>
            </div>
          </div>
          <div className="filter-toggles">
            <label className="chip-toggle">
              <input type="checkbox" checked={filterPerhatian} onChange={(e) => setFilterPerhatian(e.target.checked)} />
              ⚠ Perlu perhatian saja
            </label>
            <label className="chip-toggle">
              <input type="checkbox" checked={filterLinkBelum} onChange={(e) => setFilterLinkBelum(e.target.checked)} />
              🔗 Link belum dibagikan
            </label>
            <label className="chip-toggle">
              <input type="checkbox" checked={!sembunyikanTidakAktif} onChange={(e) => setSembunyikanTidakAktif(!e.target.checked)} />
              Tampilkan yang tidak aktif
            </label>
            {activeFilterCount > 0 && <button className="btn-ghost" onClick={clearFilters}>✕ Hapus semua filter</button>}
          </div>
        </div>
      )}

      {viewMode === 'table' ? (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <div style={{ minWidth: 900 }}>
            <div className="grid-row grid-head">
              <div onClick={() => toggleSort('id_umkm')} className="sortable">ID {sortBy === 'id_umkm' && (sortDir === 'asc' ? '▲' : '▼')}</div>
              <div onClick={() => toggleSort('nama_umkm')} className="sortable">Nama UMKM {sortBy === 'nama_umkm' && (sortDir === 'asc' ? '▲' : '▼')}</div>
              <div onClick={() => toggleSort('wilayah')} className="sortable">Wilayah {sortBy === 'wilayah' && (sortDir === 'asc' ? '▲' : '▼')}</div>
              <div onClick={() => toggleSort('kelas_pama')} className="sortable">Kelas PAMA {sortBy === 'kelas_pama' && (sortDir === 'asc' ? '▲' : '▼')}</div>
              <div>Kelas YDBA</div>
              <div>Legalitas</div>
              <div onClick={() => toggleSort('program')} className="sortable">Program {sortBy === 'program' && (sortDir === 'asc' ? '▲' : '▼')}</div>
              <div onClick={() => toggleSort('status')} className="sortable">Status {sortBy === 'status' && (sortDir === 'asc' ? '▲' : '▼')}</div>
            </div>
            {visible.map((u) => {
              const status = statusMap[u.id_umkm] || '-';
              const kelas = kelasMap[u.id_umkm] || {};
              const legalitas = legalitasMap[u.id_umkm] || [];
              const alasan = alasanPerhatian(u.id_umkm);
              const perhatian = alasan.length > 0;
              return (
                <Link key={u.id_umkm} href={`/admin/umkm/${u.id_umkm}`} className="grid-row grid-body" style={{ background: perhatian ? '#fdf3ef' : undefined }}>
                  <div className="id-mono">{u.id_umkm} {u.link_dibagikan_tanggal ? <span title="Link sudah dibagikan">🔗</span> : <span title="Link belum dibagikan" style={{ opacity: 0.3 }}>🔗</span>}</div>
                  <div>{u.nama_umkm}{alasan.map((a) => <span key={a} className="badge" style={{ background: '#f6deda', color: '#9c3b26', marginLeft: 4, fontSize: 9 }}>⚠ {a}</span>)}</div>
                  <div>{u.wilayah || '-'}</div>
                  <div>{kelas.PAMA ? <span className="badge ok">{kelas.PAMA}</span> : '-'}</div>
                  <div>{kelas.YDBA ? <span className="badge ok">{kelas.YDBA}</span> : '-'}</div>
                  <div>{legalitas.length ? legalitas.join(', ') : <span className="badge bad">Belum ada</span>}</div>
                  <div>{programCountMap[u.id_umkm] || 0}</div>
                  <div>
                    <span className={`badge ${status === 'Aktif' ? 'ok' : 'bad'}`}>{status}</span>
                    {statusTahunMap[u.id_umkm] && statusTahunMap[u.id_umkm] !== 2026 && <span style={{ fontSize: 9.5, color: 'var(--ink-soft)', marginLeft: 4 }}>({statusTahunMap[u.id_umkm]})</span>}
                  </div>
                </Link>
              );
            })}
          </div>
          {filtered.length === 0 && <div className="empty-state">Tidak ada UMKM yang cocok dengan filter ini.</div>}
        </div>
      ) : (
        <div className="card-grid">
          {visible.map((u) => {
            const status = statusMap[u.id_umkm] || '-';
            const kelas = kelasMap[u.id_umkm] || {};
            const legalitas = legalitasMap[u.id_umkm] || [];
            const alasan = alasanPerhatian(u.id_umkm);
            const perhatian = alasan.length > 0;
            return (
              <Link key={u.id_umkm} href={`/admin/umkm/${u.id_umkm}`} className="umkm-card" style={{ borderColor: perhatian ? 'var(--clay)' : 'var(--line)' }}>
                <div className="umkm-card-top">
                  <span className="id-mono">{u.id_umkm}</span>
                  <span className={`badge ${status === 'Aktif' ? 'ok' : 'bad'}`}>{status}</span>
                </div>
                <div className="umkm-card-name">{u.nama_umkm}</div>
                <div className="umkm-card-sub">{u.wilayah || '-'} {u.bidang_usaha && `· ${u.bidang_usaha}`}</div>
                <div className="umkm-card-badges">
                  {kelas.PAMA && <span className="badge ok">PAMA: {kelas.PAMA}</span>}
                  {kelas.YDBA && <span className="badge ok">YDBA: {kelas.YDBA}</span>}
                  {legalitas.length > 0 ? legalitas.slice(0, 3).map((l) => <span key={l} className="chip on" style={{ fontSize: 10.5, padding: '3px 8px' }}>{l}</span>) : <span className="badge bad">Belum ada legalitas</span>}
                </div>
                <div className="umkm-card-footer">
                  <span>{u.link_dibagikan_tanggal ? '🔗 Link terkirim' : '⚠ Link belum'}</span>
                  <span>{programCountMap[u.id_umkm] || 0} program</span>
                </div>
                {alasan.length > 0 && (
                  <div className="umkm-card-warn">{alasan.map((a) => <span key={a} className="badge" style={{ background: '#f6deda', color: '#9c3b26' }}>⚠ {a}</span>)}</div>
                )}
              </Link>
            );
          })}
          {filtered.length === 0 && <div className="empty-state" style={{ gridColumn: '1 / -1' }}>Tidak ada UMKM yang cocok dengan filter ini.</div>}
        </div>
      )}

      <div className="no-print list-footer">
        <span>Menampilkan {visible.length} dari {filtered.length} UMKM (total {umkmList.length})</span>
        {visibleCount < filtered.length && (
          <button className="btn-secondary" onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}>Tampilkan lebih banyak ↓</button>
        )}
      </div>
    </div>
  );
    }
