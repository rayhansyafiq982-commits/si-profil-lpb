'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import PieChart, { PieLegend } from '../../../components/PieChart';

const TAHUN_OPSI = [2023, 2024, 2025, 2026];

const WARNA_KELAS = {
  Mandiri: '#0f5257',
  'Pra Mandiri': '#177a7e',
  Madya: '#d9a441',
  Pemula: '#c15b3c',
  '-': '#cfc9b8',
};

const WARNA_STATUS = {
  Aktif: '#7a9b76',
  'Tidak Aktif': '#c15b3c',
  '-': '#cfc9b8',
};

const WARNA_KATEGORI = {
  Pelatihan: '#0f5257',
  Pendampingan: '#177a7e',
  Pemasaran: '#d9a441',
  Pembiayaan: '#c15b3c',
};

function BarRow({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5 }}>
      <span style={{ width: 92, flexShrink: 0, color: 'var(--ink)' }}>{label}</span>
      <div style={{ flex: 1, background: 'var(--line)', borderRadius: 6, height: 14, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 6 }} />
      </div>
      <span style={{ width: 34, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, color: 'var(--ink-soft)' }}>{value}</span>
    </div>
  );
}

// Menghasilkan warna berbeda-beda untuk kategori dinamis (bidang usaha, wilayah)
function warnaDinamis(i, total) {
  const hue = Math.round((360 / Math.max(total, 1)) * i);
  return `hsl(${hue}, 45%, 45%)`;
}

function CardChart({ title, subtitle, data }) {
  return (
    <div style={{
      background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14,
      padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div>
        <h3 style={{ fontSize: 16, marginBottom: 2 }}>{title}</h3>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{subtitle}</div>}
      </div>
      {data.every((d) => d.value === 0) ? (
        <div style={{ textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13, padding: '30px 0' }}>
          Belum ada data untuk tahun ini.
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <PieChart data={data} size={190} />
          <div style={{ flex: 1, minWidth: 160 }}>
            <PieLegend data={data} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function StatistikDashboard() {
  const [loading, setLoading] = useState(true);
  const [tahun, setTahun] = useState(2026);
  const [jenisPenilai, setJenisPenilai] = useState('PAMA');

  const [umkmList, setUmkmList] = useState([]);
  const [statusRows, setStatusRows] = useState([]);
  const [kelasRows, setKelasRows] = useState([]);
  const [programRows, setProgramRows] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: umkm }, { data: status }, { data: kelas }, { data: program }] = await Promise.all([
      supabase.from('master_umkm').select('id_umkm, bidang_usaha, wilayah, tahun_masuk'),
      supabase.from('status_tahunan').select('id_umkm, tahun, status'),
      supabase.from('kelas_kemandirian').select('id_umkm, tahun, jenis_penilai, kelas'),
      supabase.from('program_aktivitas').select('id_umkm, kategori, tahun'),
    ]);
    setUmkmList(umkm || []);
    setStatusRows(status || []);
    setKelasRows(kelas || []);
    setProgramRows(program || []);
    setLoading(false);
  }

  // --- 1. Distribusi Kelas Kemandirian (tahun + jenis penilai terpilih) ---
  const dataKelas = useMemo(() => {
    const hitung = { Pemula: 0, Madya: 0, 'Pra Mandiri': 0, Mandiri: 0 };
    kelasRows
      .filter((k) => k.tahun === tahun && k.jenis_penilai === jenisPenilai)
      .forEach((k) => { if (hitung[k.kelas] !== undefined) hitung[k.kelas] += 1; });
    return Object.entries(hitung).map(([label, value]) => ({ label, value, color: WARNA_KELAS[label] }));
  }, [kelasRows, tahun, jenisPenilai]);

  // --- 2. Distribusi Status Aktif / Tidak Aktif (tahun terpilih) ---
  const dataStatus = useMemo(() => {
    const hitung = { Aktif: 0, 'Tidak Aktif': 0 };
    statusRows.filter((s) => s.tahun === tahun).forEach((s) => {
      if (hitung[s.status] !== undefined) hitung[s.status] += 1;
    });
    return Object.entries(hitung).map(([label, value]) => ({ label, value, color: WARNA_STATUS[label] }));
  }, [statusRows, tahun]);

  // --- 2b. Ringkasan jumlah Aktif / Tidak Aktif & persentase (tahun terpilih) ---
  const ringkasanStatus = useMemo(() => {
    const aktif = dataStatus.find((d) => d.label === 'Aktif')?.value || 0;
    const tidakAktif = dataStatus.find((d) => d.label === 'Tidak Aktif')?.value || 0;
    const total = aktif + tidakAktif;
    const pct = total > 0 ? ((aktif / total) * 100).toFixed(1) : '0.0';
    return { aktif, tidakAktif, total, pct };
  }, [dataStatus]);

  // --- Kategori program yang diikuti UMKM Aktif pada tahun terpilih ---
  const dataKategoriProgram = useMemo(() => {
    const idAktifTahunIni = new Set(
      statusRows.filter((s) => s.tahun === tahun && s.status === 'Aktif').map((s) => s.id_umkm)
    );
    const hitung = { Pelatihan: 0, Pendampingan: 0, Pemasaran: 0, Pembiayaan: 0 };
    const sudahDihitung = new Set(); // hindari ganda per id_umkm+kategori
    programRows
      .filter((p) => p.tahun === tahun && idAktifTahunIni.has(p.id_umkm))
      .forEach((p) => {
        const key = `${p.id_umkm}|${p.kategori}`;
        if (sudahDihitung.has(key)) return;
        sudahDihitung.add(key);
        if (hitung[p.kategori] !== undefined) hitung[p.kategori] += 1;
      });
    return hitung;
  }, [programRows, statusRows, tahun]);

  // --- UMKM yang "ada" pada tahun terpilih (untuk bidang usaha & wilayah, dihitung kumulatif berdasarkan tahun masuk) ---
  const umkmTahunIni = useMemo(
    () => umkmList.filter((u) => !u.tahun_masuk || u.tahun_masuk <= tahun),
    [umkmList, tahun]
  );

  // --- 3. Distribusi Bidang Usaha ---
  const dataBidang = useMemo(() => {
    const hitung = {};
    umkmTahunIni.forEach((u) => {
      const b = u.bidang_usaha || '(Tidak diketahui)';
      hitung[b] = (hitung[b] || 0) + 1;
    });
    const entries = Object.entries(hitung).sort((a, b) => b[1] - a[1]);
    return entries.map(([label, value], i) => ({ label, value, color: warnaDinamis(i, entries.length) }));
  }, [umkmTahunIni]);

  // --- 4. Distribusi Wilayah ---
  const dataWilayah = useMemo(() => {
    const hitung = {};
    umkmTahunIni.forEach((u) => {
      const w = u.wilayah || '(Tidak diketahui)';
      hitung[w] = (hitung[w] || 0) + 1;
    });
    const entries = Object.entries(hitung).sort((a, b) => b[1] - a[1]);
    return entries.map(([label, value], i) => ({ label, value, color: warnaDinamis(i, entries.length) }));
  }, [umkmTahunIni]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-soft)' }}>Memuat data...</div>;

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22 }}>Statistik Perkembangan UMKM</h2>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Sebaran data binaan LPB Pama Bessai Berinta per tahun</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>Tahun:</label>
          <select
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 14, fontWeight: 600, color: 'var(--teal-900)' }}
          >
            {TAHUN_OPSI.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 18 }}>
        <div className="kpi-card"><div className="kpi-val" style={{ color: 'var(--sage)' }}>{ringkasanStatus.aktif}</div><div className="kpi-lbl">UMKM Aktif ({tahun})</div></div>
        <div className="kpi-card"><div className="kpi-val" style={{ color: 'var(--clay)' }}>{ringkasanStatus.tidakAktif}</div><div className="kpi-lbl">UMKM Tidak Aktif ({tahun})</div></div>
        <div className="kpi-card"><div className="kpi-val" style={{ color: 'var(--teal-900)' }}>{ringkasanStatus.pct}%</div><div className="kpi-lbl">% Aktif dari total {ringkasanStatus.total}</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
        <CardChart
          title="Distribusi Kelas Kemandirian"
          subtitle={
            <span>
              Penilai:{' '}
              <select
                value={jenisPenilai}
                onChange={(e) => setJenisPenilai(e.target.value)}
                style={{ fontSize: 12, padding: '2px 8px', borderRadius: 6, border: '1px solid var(--line)', fontWeight: 600 }}
              >
                <option value="PAMA">PAMA</option>
                <option value="YDBA">YDBA</option>
              </select>{' '}
              &middot; tahun {tahun}
            </span>
          }
          data={dataKelas}
        />
        <CardChart
          title="Distribusi Status Aktif / Tidak Aktif"
          subtitle={`Tahun ${tahun}`}
          data={dataStatus}
        />
        <CardChart
          title="Distribusi Bidang Usaha"
          subtitle={`UMKM terdaftar hingga tahun ${tahun} (${umkmTahunIni.length} UMKM)`}
          data={dataBidang}
        />
        <CardChart
          title="Distribusi Wilayah"
          subtitle={`UMKM terdaftar hingga tahun ${tahun} (${umkmTahunIni.length} UMKM)`}
          data={dataWilayah}
        />
        <div style={{
          background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14,
          padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <div>
            <h3 style={{ fontSize: 16, marginBottom: 2 }}>Program yang Diikuti UMKM Aktif</h3>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Tahun {tahun} &middot; {ringkasanStatus.aktif} UMKM aktif</div>
          </div>
          {ringkasanStatus.aktif === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13, padding: '30px 0' }}>
              Belum ada data untuk tahun ini.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(dataKategoriProgram).map(([label, value]) => (
                <BarRow key={label} label={label} value={value} max={ringkasanStatus.aktif} color={WARNA_KATEGORI[label]} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 18, fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
        Catatan: Kelas Kemandirian dan Status Aktif/Tidak Aktif dicatat per tahun secara langsung dari data historis.
        Bidang Usaha dan Wilayah tidak memiliki riwayat per tahun di sistem, sehingga grafiknya dihitung secara kumulatif —
        yaitu seluruh UMKM yang sudah terdaftar (tahun masuk) pada atau sebelum tahun yang dipilih.
      </div>
    </div>
  );
}
