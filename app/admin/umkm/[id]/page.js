'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase, catatLog, KATEGORI_PROGRAM, KELAS_OPSI, LEGALITAS_OPSI } from '../../../../lib/supabase';
import QRCode from 'qrcode';

export default function UmkmDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [umkm, setUmkm] = useState(null);
  const [legalitas, setLegalitas] = useState([]);
  const [produk, setProduk] = useState([]);
  const [kemasan, setKemasan] = useState([]);
  const [kelas, setKelas] = useState([]);
  const [omzet, setOmzet] = useState([]);
  const [program, setProgram] = useState([]);
  const [log, setLog] = useState([]);
  const [statusList, setStatusList] = useState([]);
  const [savingStatus, setSavingStatus] = useState(false);

  const [showProgramForm, setShowProgramForm] = useState(false);
  const [newProgram, setNewProgram] = useState({ kategori: 'Pelatihan', nama_program: '', tahun: 2026, tanggal: '', status: 'Selesai' });

  const [filterTahunProgram, setFilterTahunProgram] = useState('semua');
  const [showLinkBox, setShowLinkBox] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [linkPribadi, setLinkPribadi] = useState('');

  async function toggleStatus() {
    setSavingStatus(true);
    const statusSekarang = statusList.find((s) => s.tahun === 2026)?.status;
    const statusBaru = statusSekarang === 'Aktif' ? 'Tidak Aktif' : 'Aktif';
    await supabase.from('status_tahunan').upsert(
      { id_umkm: id, tahun: 2026, status: statusBaru },
      { onConflict: 'id_umkm,tahun' }
    );
    await catatLog(id, 'Ubah Status', `Status ${umkm.nama_umkm} diubah jadi ${statusBaru}`);
    setSavingStatus(false);
    loadAll();
  }

  async function bagikanLink() {
    const origin = window.location.origin;
    const link = `${origin}/f/${umkm.id_umkm}/${umkm.akses_token}`;
    setLinkPribadi(link);
    const qr = await QRCode.toDataURL(link, { width: 320, margin: 1, color: { dark: '#0B3B3C', light: '#FFFFFF' } });
    setQrDataUrl(qr);
    setShowLinkBox(true);

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('master_umkm').update({
      link_dibagikan_tanggal: new Date().toISOString(),
      link_dibagikan_oleh: user?.email || null,
    }).eq('id_umkm', id);
    await catatLog(id, 'Bagikan Link', `Link dibagikan oleh ${user?.email || 'Fasilitator'}`);
    loadAll();
  }

  const [showKelasForm, setShowKelasForm] = useState(false);
  const [newKelas, setNewKelas] = useState({ tahun: 2026, jenis_penilai: 'PAMA', kelas: 'Pemula' });

  const [editProfil, setEditProfil] = useState(false);
  const [profilForm, setProfilForm] = useState(null);
  const [savingProfil, setSavingProfil] = useState(false);

  const [editLegalitas, setEditLegalitas] = useState(false);
  const [legalitasChips, setLegalitasChips] = useState([]);
  const [catatanLegalitas, setCatatanLegalitas] = useState('');

  const [editProdukKemasan, setEditProdukKemasan] = useState(false);
  const [newProduk, setNewProduk] = useState({ nama_produk: '', kategori: '', varian: '' });
  const [newKemasan, setNewKemasan] = useState({ jenis_kemasan: '', ukuran: '' });

  function mulaiEditProfil() {
    setProfilForm({ ...umkm });
    setEditProfil(true);
  }

  async function simpanProfil() {
    setSavingProfil(true);
    await supabase.from('master_umkm').update({
      ...profilForm,
      tahun_masuk: profilForm.tahun_masuk ? parseInt(profilForm.tahun_masuk, 10) : null,
      updated_at: new Date().toISOString(),
    }).eq('id_umkm', id);
    await catatLog(id, 'Edit Profil (Admin)', 'Profil diperbarui oleh Fasilitator');
    setSavingProfil(false);
    setEditProfil(false);
    loadAll();
  }

  function mulaiEditLegalitas() {
    setLegalitasChips(legalitas.filter((l) => l.jenis_legalitas).map((l) => l.jenis_legalitas));
    setCatatanLegalitas(legalitas.find((l) => l.catatan)?.catatan || '');
    setEditLegalitas(true);
  }

  function toggleLegalitasChip(opsi) {
    setLegalitasChips((prev) => prev.includes(opsi) ? prev.filter((o) => o !== opsi) : [...prev, opsi]);
  }

  async function simpanLegalitas() {
    await supabase.from('legalitas').delete().eq('id_umkm', id);
    if (legalitasChips.length > 0 || catatanLegalitas) {
      const rows = legalitasChips.length > 0
        ? legalitasChips.map((jenis) => ({ id_umkm: id, jenis_legalitas: jenis, catatan: catatanLegalitas || null }))
        : [{ id_umkm: id, jenis_legalitas: null, catatan: catatanLegalitas }];
      await supabase.from('legalitas').insert(rows);
    }
    await catatLog(id, 'Edit Legalitas (Admin)', 'Legalitas diperbarui oleh Fasilitator');
    setEditLegalitas(false);
    loadAll();
  }

  async function tambahProdukAdmin() {
    if (!newProduk.nama_produk.trim()) return;
    await supabase.from('produk').insert({ id_umkm: id, ...newProduk });
    await catatLog(id, 'Tambah Produk (Admin)', newProduk.nama_produk);
    setNewProduk({ nama_produk: '', kategori: '', varian: '' });
    loadAll();
  }
  async function hapusProduk(produkId) {
    await supabase.from('produk').delete().eq('id', produkId);
    loadAll();
  }
  async function tambahKemasanAdmin() {
    if (!newKemasan.jenis_kemasan.trim()) return;
    await supabase.from('kemasan').insert({ id_umkm: id, ...newKemasan });
    await catatLog(id, 'Tambah Kemasan (Admin)', newKemasan.jenis_kemasan);
    setNewKemasan({ jenis_kemasan: '', ukuran: '' });
    loadAll();
  }
  async function hapusKemasan(kemasanId) {
    await supabase.from('kemasan').delete().eq('id', kemasanId);
    loadAll();
  }

  async function hapusProgram(programId) {
    await supabase.from('program_aktivitas').delete().eq('id', programId);
    await catatLog(id, 'Hapus Program', `Program dihapus (id: ${programId})`);
    loadAll();
  }

  useEffect(() => { if (id) loadAll(); }, [id]);

  async function loadAll() {
    setLoading(true);
    const [u, l, p, k, kl, o, pr, lg, st] = await Promise.all([
      supabase.from('master_umkm').select('*').eq('id_umkm', id).single(),
      supabase.from('legalitas').select('*').eq('id_umkm', id),
      supabase.from('produk').select('*').eq('id_umkm', id),
      supabase.from('kemasan').select('*').eq('id_umkm', id),
      supabase.from('kelas_kemandirian').select('*').eq('id_umkm', id).order('tahun'),
      supabase.from('omzet_bulanan').select('*').eq('id_umkm', id).order('tahun').order('bulan'),
      supabase.from('program_aktivitas').select('*').eq('id_umkm', id).order('tahun', { ascending: false }),
      supabase.from('log_perubahan').select('*').eq('id_umkm', id).order('created_at', { ascending: false }).limit(10),
      supabase.from('status_tahunan').select('*').eq('id_umkm', id).order('tahun'),
    ]);
    setUmkm(u.data);
    setLegalitas(l.data || []);
    setProduk(p.data || []);
    setKemasan(k.data || []);
    setKelas(kl.data || []);
    setOmzet(o.data || []);
    setProgram(pr.data || []);
    setLog(lg.data || []);
    setStatusList(st.data || []);
    setLoading(false);
  }

  async function tambahProgram() {
    if (!newProgram.nama_program.trim()) return;
    await supabase.from('program_aktivitas').insert({ id_umkm: id, ...newProgram, sumber: 'Fasilitator' });
    await catatLog(id, 'Tambah Program', `${newProgram.kategori}: ${newProgram.nama_program}`);
    setNewProgram({ kategori: 'Pelatihan', nama_program: '', tahun: 2026, tanggal: '', status: 'Selesai' });
    setShowProgramForm(false);
    loadAll();
  }

  async function tambahKelas() {
    await supabase.from('kelas_kemandirian').upsert({ id_umkm: id, ...newKelas }, { onConflict: 'id_umkm,tahun,jenis_penilai' });
    await catatLog(id, 'Update Kelas', `${newKelas.jenis_penilai} ${newKelas.tahun}: ${newKelas.kelas}`);
    setShowKelasForm(false);
    loadAll();
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-soft)' }}>Memuat...</div>;
  if (!umkm) return <div style={{ padding: 40 }}>UMKM tidak ditemukan.</div>;

  const omzetByYear = {};
  omzet.forEach((o) => {
    if (!omzetByYear[o.tahun]) omzetByYear[o.tahun] = [];
    omzetByYear[o.tahun].push(o);
  });

  const kelasByYear = {};
  kelas.forEach((k) => {
    if (!kelasByYear[k.tahun]) kelasByYear[k.tahun] = {};
    kelasByYear[k.tahun][k.jenis_penilai] = k.kelas;
  });

  const programFiltered = filterTahunProgram === 'semua' ? program : program.filter((p) => String(p.tahun) === String(filterTahunProgram));
  const programByKategori = {};
  KATEGORI_PROGRAM.forEach((k) => { programByKategori[k] = programFiltered.filter((p) => p.kategori === k); });

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <Link href="/admin" className="no-print btn-ghost" style={{ display: 'inline-block', marginBottom: 12 }}>← Kembali ke daftar</Link>

      <div className="card" style={{ marginBottom: 20 }}>
        {!editProfil ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div className="id-mono">{umkm.id_umkm}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <h2 style={{ fontSize: 24 }}>{umkm.nama_umkm}</h2>
                {(() => {
                  const statusTahunIni = statusList.find((s) => s.tahun === 2026)?.status || 'Belum ada data';
                  return <span className={`badge ${statusTahunIni === 'Aktif' ? 'ok' : 'bad'}`}>{statusTahunIni}</span>;
                })()}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>
                {umkm.nama_pemilik && <>Pemilik: {umkm.nama_pemilik} · </>}
                {umkm.wilayah} · Bergabung {umkm.tahun_masuk || '-'}
              </div>
              <button className="btn-ghost no-print" style={{ marginTop: 6, fontSize: 11.5 }} onClick={toggleStatus} disabled={savingStatus}>
                {savingStatus ? 'Menyimpan...' : '🔄 Ubah status Aktif / Tidak Aktif (tahun 2026)'}
              </button>
            </div>
            <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--ink-soft)' }}>
              <div>📞 {umkm.no_hp || 'Belum ada nomor'}</div>
              <div>{umkm.bidang_usaha} {umkm.spesialisasi && `· ${umkm.spesialisasi}`}</div>
              <div style={{ marginTop: 6 }}>
                {umkm.link_dibagikan_tanggal ? (
                  <span className="badge ok">✅ Link dibagikan {new Date(umkm.link_dibagikan_tanggal).toLocaleDateString('id-ID')}</span>
                ) : (
                  <span className="badge warn">⚠ Link belum pernah dibagikan</span>
                )}
              </div>
              <div className="no-print" style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button className="btn-secondary" style={{ fontSize: 12, padding: '8px 14px' }} onClick={mulaiEditProfil}>✏️ Edit Profil</button>
                <button className="btn-secondary" style={{ fontSize: 12, padding: '8px 14px' }} onClick={bagikanLink}>🔗 Bagikan Link Pribadi</button>
                <Link href={`/admin/umkm/${id}/kartu`} className="btn-secondary" style={{ fontSize: 12, padding: '8px 14px', textDecoration: 'none' }}>🖨️ Cetak Kartu</Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="no-print">
            <h4 style={{ fontSize: 15, marginBottom: 14 }}>Edit Profil UMKM</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field"><label>Nama UMKM</label><input value={profilForm.nama_umkm || ''} onChange={(e) => setProfilForm({ ...profilForm, nama_umkm: e.target.value })} /></div>
              <div className="field"><label>Nama Pemilik</label><input value={profilForm.nama_pemilik || ''} onChange={(e) => setProfilForm({ ...profilForm, nama_pemilik: e.target.value })} /></div>
              <div className="field"><label>No. HP</label><input value={profilForm.no_hp || ''} onChange={(e) => setProfilForm({ ...profilForm, no_hp: e.target.value })} /></div>
              <div className="field"><label>Tahun Bergabung</label><input type="number" value={profilForm.tahun_masuk || ''} onChange={(e) => setProfilForm({ ...profilForm, tahun_masuk: e.target.value })} /></div>
              <div className="field"><label>Daerah</label><input value={profilForm.daerah || ''} onChange={(e) => setProfilForm({ ...profilForm, daerah: e.target.value })} /></div>
              <div className="field"><label>Wilayah</label><input value={profilForm.wilayah || ''} onChange={(e) => setProfilForm({ ...profilForm, wilayah: e.target.value })} /></div>
              <div className="field"><label>Bidang Usaha</label><input value={profilForm.bidang_usaha || ''} onChange={(e) => setProfilForm({ ...profilForm, bidang_usaha: e.target.value })} /></div>
              <div className="field"><label>Spesialisasi</label><input value={profilForm.spesialisasi || ''} onChange={(e) => setProfilForm({ ...profilForm, spesialisasi: e.target.value })} /></div>
              <div className="field" style={{ gridColumn: '1 / -1' }}><label>Produk Unggulan</label><input value={profilForm.produk_unggulan || ''} onChange={(e) => setProfilForm({ ...profilForm, produk_unggulan: e.target.value })} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn-secondary" onClick={() => setEditProfil(false)}>Batal</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={simpanProfil} disabled={savingProfil}>{savingProfil ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
            </div>
          </div>
        )}
        {showLinkBox && (
          <div className="no-print" style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 16, display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {qrDataUrl && <img src={qrDataUrl} alt="QR" style={{ width: 140, height: 140, border: '1px solid var(--line)', borderRadius: 8 }} />}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 8 }}>
                Link permanen untuk <strong>{umkm.nama_umkm}</strong> update data sendiri — tidak bergantung nomor HP, tidak akan berubah meski nomor HP mereka ganti.
              </div>
              <div style={{ background: 'var(--cream)', padding: '10px 12px', borderRadius: 8, fontSize: 11.5, wordBreak: 'break-all', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>
                {linkPribadi}
              </div>
              <button className="btn-primary" style={{ fontSize: 12.5, padding: '9px 14px' }} onClick={() => navigator.clipboard.writeText(linkPribadi)}>📋 Salin Link</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h4 style={{ fontSize: 15 }}>Legalitas</h4>
            {!editLegalitas && <button className="btn-ghost no-print" onClick={mulaiEditLegalitas}>✏️ Edit</button>}
          </div>
          {!editLegalitas ? (
            <>
              {legalitas.length === 0 ? <div style={{ color: 'var(--ink-soft)', fontSize: 13 }}>Belum ada data legalitas.</div> : (
                <div className="chip-row">{legalitas.filter((l) => l.jenis_legalitas).map((l, i) => <span key={i} className="chip on">{l.jenis_legalitas}</span>)}</div>
              )}
              {legalitas.find((l) => l.catatan) && (
                <div style={{ marginTop: 10, background: 'var(--gold-100)', padding: '8px 12px', borderRadius: 8, fontSize: 12.5, color: '#6b4e10' }}>
                  💬 {legalitas.find((l) => l.catatan).catatan}
                </div>
              )}
            </>
          ) : (
            <div className="no-print">
              <div className="chip-row" style={{ marginBottom: 10 }}>
                {LEGALITAS_OPSI.map((opsi) => (
                  <span key={opsi} className={`chip ${legalitasChips.includes(opsi) ? 'on' : ''}`} style={{ cursor: 'pointer' }} onClick={() => toggleLegalitasChip(opsi)}>{opsi}</span>
                ))}
              </div>
              <div className="field"><label>Catatan</label><input value={catatanLegalitas} onChange={(e) => setCatatanLegalitas(e.target.value)} /></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-secondary" onClick={() => setEditLegalitas(false)}>Batal</button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={simpanLegalitas}>Simpan</button>
              </div>
            </div>
          )}
        </div>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h4 style={{ fontSize: 15 }}>Produk & Kemasan</h4>
            {!editProdukKemasan && <button className="btn-ghost no-print" onClick={() => setEditProdukKemasan(true)}>✏️ Edit</button>}
          </div>
          {produk.length === 0 ? <div style={{ color: 'var(--ink-soft)', fontSize: 13 }}>Belum ada data produk.</div> : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              {produk.map((p) => (
                <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span>{p.nama_produk} {p.varian && `(${p.varian})`}</span>
                  {editProdukKemasan && <button className="no-print" onClick={() => hapusProduk(p.id)} style={{ background: 'none', border: 'none', color: 'var(--clay)', fontSize: 11, cursor: 'pointer' }}>Hapus</button>}
                </li>
              ))}
            </ul>
          )}
          {kemasan.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--ink-soft)' }}>
              {kemasan.map((k) => (
                <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Kemasan: {k.jenis_kemasan}</span>
                  {editProdukKemasan && <button className="no-print" onClick={() => hapusKemasan(k.id)} style={{ background: 'none', border: 'none', color: 'var(--clay)', fontSize: 11, cursor: 'pointer' }}>Hapus</button>}
                </div>
              ))}
            </div>
          )}
          {editProdukKemasan && (
            <div className="no-print" style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <input placeholder="Nama produk baru" value={newProduk.nama_produk} onChange={(e) => setNewProduk({ ...newProduk, nama_produk: e.target.value })} style={{ flex: 1, padding: '8px 10px', border: '1.4px solid var(--line)', borderRadius: 6, fontSize: 12.5 }} />
                <button className="btn-secondary" style={{ fontSize: 11.5, padding: '6px 10px' }} onClick={tambahProdukAdmin}>+ Produk</button>
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <input placeholder="Jenis kemasan baru" value={newKemasan.jenis_kemasan} onChange={(e) => setNewKemasan({ ...newKemasan, jenis_kemasan: e.target.value })} style={{ flex: 1, padding: '8px 10px', border: '1.4px solid var(--line)', borderRadius: 6, fontSize: 12.5 }} />
                <button className="btn-secondary" style={{ fontSize: 11.5, padding: '6px 10px' }} onClick={tambahKemasanAdmin}>+ Kemasan</button>
              </div>
              <button className="btn-ghost" onClick={() => setEditProdukKemasan(false)}>Selesai edit</button>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ fontSize: 15 }}>Kelas Kemandirian</h4>
          <button className="btn-ghost no-print" onClick={() => setShowKelasForm(!showKelasForm)}>+ Update kelas</button>
        </div>
        {showKelasForm && (
          <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="field" style={{ margin: 0 }}>
              <label>Tahun</label>
              <input type="number" value={newKelas.tahun} onChange={(e) => setNewKelas({ ...newKelas, tahun: parseInt(e.target.value) })} style={{ width: 90 }} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Penilai</label>
              <select value={newKelas.jenis_penilai} onChange={(e) => setNewKelas({ ...newKelas, jenis_penilai: e.target.value })}>
                <option value="PAMA">PAMA</option><option value="YDBA">YDBA</option>
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Kelas</label>
              <select value={newKelas.kelas} onChange={(e) => setNewKelas({ ...newKelas, kelas: e.target.value })}>
                {KELAS_OPSI.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <button className="btn-primary" onClick={tambahKelas}>Simpan</button>
          </div>
        )}
        <table>
          <thead><tr><th>Tahun</th><th>PAMA</th><th>YDBA</th></tr></thead>
          <tbody>
            {Object.keys(kelasByYear).sort().map((tahun) => (
              <tr key={tahun}>
                <td>{tahun}</td>
                <td>{kelasByYear[tahun].PAMA ? <span className="badge ok">{kelasByYear[tahun].PAMA}</span> : '-'}</td>
                <td>{kelasByYear[tahun].YDBA ? <span className="badge ok">{kelasByYear[tahun].YDBA}</span> : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h4 style={{ fontSize: 15, marginBottom: 12 }}>Riwayat Omzet & Profit</h4>
        {Object.keys(omzetByYear).sort().reverse().map((tahun) => {
          const rows = omzetByYear[tahun].filter((r) => r.omzet !== null);
          if (rows.length === 0) return null;
          const totalOmzet = rows.reduce((s, r) => s + (r.omzet || 0), 0);
          const rataOmzet = totalOmzet / rows.length;
          return (
            <div key={tahun} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal-900)', marginBottom: 6 }}>
                {tahun} — Rata-rata Rp{Math.round(rataOmzet).toLocaleString('id-ID')}/bulan
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {rows.map((r) => (
                  <div key={r.bulan} title={`Bulan ${r.bulan}`} style={{ fontSize: 11, background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: 6, padding: '4px 8px' }}>
                    {r.bulan}: Rp{(r.omzet / 1000000).toFixed(1)}jt
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {omzet.every((o) => o.omzet === null) && <div style={{ color: 'var(--ink-soft)', fontSize: 13 }}>Belum ada data omzet.</div>}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <h4 style={{ fontSize: 15 }}>Program Aktivitas</h4>
          <div className="no-print" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={filterTahunProgram} onChange={(e) => setFilterTahunProgram(e.target.value)} style={{ padding: '7px 10px', border: '1.4px solid var(--line)', borderRadius: 8, fontSize: 12.5 }}>
              <option value="semua">Semua Tahun</option>
              {[...new Set(program.map((p) => p.tahun))].sort((a, b) => b - a).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button className="btn-ghost" onClick={() => setShowProgramForm(!showProgramForm)}>+ Catat program</button>
          </div>
        </div>
        {showProgramForm && (
          <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="field" style={{ margin: 0 }}>
              <label>Tahun</label>
              <input type="number" value={newProgram.tahun} onChange={(e) => setNewProgram({ ...newProgram, tahun: parseInt(e.target.value) || '' })} style={{ width: 90 }} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Kategori</label>
              <select value={newProgram.kategori} onChange={(e) => setNewProgram({ ...newProgram, kategori: e.target.value })}>
                {KATEGORI_PROGRAM.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0, flex: 1, minWidth: 180 }}>
              <label>Nama Program</label>
              <input value={newProgram.nama_program} onChange={(e) => setNewProgram({ ...newProgram, nama_program: e.target.value })} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Tanggal (opsional)</label>
              <input type="date" value={newProgram.tanggal} onChange={(e) => {
                const tgl = e.target.value;
                const tahunDariTanggal = tgl ? parseInt(tgl.slice(0, 4), 10) : newProgram.tahun;
                setNewProgram({ ...newProgram, tanggal: tgl, tahun: tahunDariTanggal });
              }} />
            </div>
            <button className="btn-primary" onClick={tambahProgram} disabled={!newProgram.tahun}>Simpan</button>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {KATEGORI_PROGRAM.map((kat) => (
            <div key={kat} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{kat}</div>
              {programByKategori[kat].length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Belum ada.</div>
              ) : programByKategori[kat].map((p, i) => (
                <div key={i} style={{ fontSize: 12, padding: '4px 0', borderTop: i > 0 ? '1px solid var(--line)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{p.nama_program} <span style={{ color: 'var(--ink-soft)' }}>({p.tahun})</span></span>
                  <button className="no-print" onClick={() => hapusProgram(p.id)} style={{ background: 'none', border: 'none', color: 'var(--clay)', fontSize: 11, cursor: 'pointer' }}>Hapus</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {log.length > 0 && (
        <div className="card no-print">
          <h4 style={{ fontSize: 15, marginBottom: 10 }}>Riwayat Perubahan Terakhir</h4>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
            {log.map((l, i) => (
              <div key={i} style={{ padding: '6px 0', borderTop: i > 0 ? '1px solid var(--line)' : 'none' }}>
                <strong>{l.aksi}</strong> — {l.detail} <span style={{ float: 'right' }}>{new Date(l.created_at).toLocaleString('id-ID')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
                }
