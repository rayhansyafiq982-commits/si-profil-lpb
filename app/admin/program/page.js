'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase, catatLog, KATEGORI_PROGRAM } from '../../../lib/supabase';

export default function ProgramManagement() {
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState([]);
  const [umkmList, setUmkmList] = useState([]);
  const [tahunPilih, setTahunPilih] = useState(2026);
  const [expandedProgram, setExpandedProgram] = useState({});

  const [showForm, setShowForm] = useState(false);
  const [formKategori, setFormKategori] = useState('Pelatihan');
  const [formNama, setFormNama] = useState('');
  const [formTanggal, setFormTanggal] = useState('');
  const [formTahun, setFormTahun] = useState(2026);
  const [cariUmkm, setCariUmkm] = useState('');
  const [dipilih, setDipilih] = useState(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [p, u] = await Promise.all([
      supabase.from('program_aktivitas').select('id_umkm, kategori, nama_program, tahun, tanggal, sumber').order('tanggal', { ascending: false }),
      supabase.from('master_umkm').select('id_umkm, nama_umkm, wilayah').order('nama_umkm'),
    ]);
    setProgram(p.data || []);
    setUmkmList(u.data || []);
    setLoading(false);
  }

  const tahunTersedia = useMemo(() => {
    const set = new Set(program.map((p) => p.tahun));
    set.add(2026);
    set.add(new Date().getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [program]);

  const namaMap = useMemo(() => {
    const m = {};
    umkmList.forEach((u) => { m[u.id_umkm] = u.nama_umkm; });
    return m;
  }, [umkmList]);

  const programTahunIni = useMemo(() => program.filter((p) => p.tahun === tahunPilih), [program, tahunPilih]);

  const groupedByKategori = useMemo(() => {
    const result = {};
    KATEGORI_PROGRAM.forEach((kat) => {
      const items = programTahunIni.filter((p) => p.kategori === kat);
      const byNama = {};
      items.forEach((p) => {
        if (!byNama[p.nama_program]) byNama[p.nama_program] = [];
        byNama[p.nama_program].push(p);
      });
      result[kat] = Object.entries(byNama).map(([nama, rows]) => ({
        nama, rows, count: rows.length,
        tanggalTerbaru: rows.map((r) => r.tanggal).filter(Boolean).sort().reverse()[0],
      })).sort((a, b) => b.count - a.count);
    });
    return result;
  }, [programTahunIni]);

  const totalProgramTahunIni = Object.values(groupedByKategori).reduce((s, arr) => s + arr.length, 0);
  const totalPesertaTahunIni = programTahunIni.length;

  const umkmTersaring = useMemo(() => {
    if (!cariUmkm.trim()) return umkmList.slice(0, 50);
    const q = cariUmkm.toLowerCase();
    return umkmList.filter((u) => u.nama_umkm.toLowerCase().includes(q) || u.id_umkm.toLowerCase().includes(q) || (u.wilayah || '').toLowerCase().includes(q)).slice(0, 50);
  }, [cariUmkm, umkmList]);

  function toggleUmkm(id) {
    const next = new Set(dipilih);
    if (next.has(id)) next.delete(id); else next.add(id);
    setDipilih(next);
  }

  function bukaForm() {
    setFormKategori('Pelatihan');
    setFormNama('');
    setFormTanggal('');
    setFormTahun(tahunPilih);
    setCariUmkm('');
    setDipilih(new Set());
    setShowForm(true);
  }

  async function simpanProgram() {
    if (!formNama.trim() || dipilih.size === 0) return;
    setSaving(true);
    const rows = Array.from(dipilih).map((id_umkm) => ({
      id_umkm, kategori: formKategori, nama_program: formNama.trim(),
      tahun: formTahun, tanggal: formTanggal || null, sumber: 'Fasilitator',
    }));
    await supabase.from('program_aktivitas').insert(rows);
    await Promise.all(
      Array.from(dipilih).map((id_umkm) => catatLog(id_umkm, 'Tambah Program', `${formKategori}: ${formNama.trim()} (ditambahkan massal)`))
    );
    setSaving(false);
    setShowForm(false);
    loadAll();
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-soft)' }}>Memuat data program...</div>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22 }}>Program Pembinaan</h2>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 3 }}>Katalog program yang sudah dilaksanakan, per tahun</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select value={tahunPilih} onChange={(e) => setTahunPilih(parseInt(e.target.value))} style={{ padding: '10px 14px', border: '1.4px solid var(--line)', borderRadius: 8, fontSize: 14, fontWeight: 700, color: 'var(--teal-900)' }}>
            {tahunTersedia.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button className="btn-primary" onClick={bukaForm}>+ Tambah Program</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 20 }}>
        <div className="card"><div style={{ fontFamily: 'Fraunces, serif', fontSize: 28, color: 'var(--teal-900)' }}>{totalProgramTahunIni}</div><div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Jenis program berjalan di {tahunPilih}</div></div>
        <div className="card"><div style={{ fontFamily: 'Fraunces, serif', fontSize: 28, color: 'var(--sage)' }}>{totalPesertaTahunIni}</div><div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Total keikutsertaan UMKM di {tahunPilih}</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        {KATEGORI_PROGRAM.map((kat) => (
          <div key={kat} className="card">
            <h4 style={{ fontSize: 15, marginBottom: 12 }}>{kat}</h4>
            {groupedByKategori[kat].length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Belum ada program {kat.toLowerCase()} di tahun {tahunPilih}.</div>
            ) : groupedByKategori[kat].map((g, i) => {
              const key = kat + '|' + g.nama;
              const isOpen = expandedProgram[key];
              return (
                <div key={key} style={{ padding: '8px 0', borderTop: i > 0 ? '1px solid var(--line)' : 'none' }}>
                  <div onClick={() => setExpandedProgram({ ...expandedProgram, [key]: !isOpen })} style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{g.nama}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{g.count} UMKM {g.tanggalTerbaru && `· terakhir ${new Date(g.tanggalTerbaru).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`}</div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                  {isOpen && (
                    <div style={{ marginTop: 6, paddingLeft: 10, borderLeft: '2px solid var(--line)', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {g.rows.map((r, j) => (
                        <span key={j} className="badge ok" style={{ fontSize: 10.5 }}>{namaMap[r.id_umkm] || r.id_umkm}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,59,60,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }} onClick={() => setShowForm(false)}>
          <div className="card" style={{ maxWidth: 560, width: '100%', maxHeight: '85vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 17, marginBottom: 16 }}>+ Tambah Program Baru</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Kategori</label>
                <select value={formKategori} onChange={(e) => setFormKategori(e.target.value)}>
                  {KATEGORI_PROGRAM.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Tahun</label>
                <input type="number" value={formTahun} onChange={(e) => setFormTahun(parseInt(e.target.value) || tahunPilih)} />
              </div>
            </div>
            <div className="field"><label>Nama Program</label><input value={formNama} onChange={(e) => setFormNama(e.target.value)} placeholder="mis. Pelatihan Digital Marketing Dasar" /></div>
            <div className="field"><label>Tanggal (opsional)</label><input type="date" value={formTanggal} onChange={(e) => {
              const tgl = e.target.value;
              setFormTanggal(tgl);
              if (tgl) setFormTahun(parseInt(tgl.slice(0, 4), 10));
            }} /></div>

            <div className="field">
              <label>Pilih UMKM yang ikut ({dipilih.size} dipilih)</label>
              <input value={cariUmkm} onChange={(e) => setCariUmkm(e.target.value)} placeholder="🔍 Cari nama / ID / wilayah..." style={{ marginBottom: 8 }} />
              <div style={{ maxHeight: 220, overflowY: 'auto', border: '1.4px solid var(--line)', borderRadius: 8, padding: 8 }}>
                {umkmTersaring.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', padding: 8 }}>Tidak ada UMKM cocok.</div>
                ) : umkmTersaring.map((u) => (
                  <label key={u.id_umkm} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', fontSize: 12.5, cursor: 'pointer' }}>
                    <input type="checkbox" checked={dipilih.has(u.id_umkm)} onChange={() => toggleUmkm(u.id_umkm)} />
                    <span>{u.nama_umkm} <span style={{ color: 'var(--ink-soft)' }}>({u.wilayah || '-'})</span></span>
                  </label>
                ))}
              </div>
              {cariUmkm.trim() === '' && <div style={{ fontSize: 10.5, color: 'var(--ink-soft)', marginTop: 4 }}>Menampilkan 50 UMKM pertama — ketik untuk mencari yang lain.</div>}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={simpanProgram} disabled={saving || !formNama.trim() || dipilih.size === 0}>
                {saving ? 'Menyimpan...' : `Simpan untuk ${dipilih.size} UMKM`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
