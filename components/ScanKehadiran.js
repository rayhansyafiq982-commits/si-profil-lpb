'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase, catatLog, KATEGORI_PROGRAM } from '../lib/supabase';

export default function ScanKehadiran({ umkmList, onSelesai }) {
  const [mode, setMode] = useState('setup'); // 'setup' | 'scanning'
  const [kategori, setKategori] = useState('Pelatihan');
  const [namaProgram, setNamaProgram] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));

  const [tercatat, setTercatat] = useState([]); // {id_umkm, nama_umkm, waktu}
  const [pesan, setPesan] = useState(null); // {tipe: 'ok'|'warn'|'error', teks}
  const [cariManual, setCariManual] = useState('');
  const scannerRef = useRef(null);
  const sudahDicatatRef = useRef(new Set());

  const namaMap = {};
  umkmList.forEach((u) => { namaMap[u.id_umkm] = u.nama_umkm; });

  useEffect(() => {
    if (mode !== 'scanning') return;
    let html5QrCode;
    let batal = false;

    (async () => {
      // Muat data yang sudah tercatat sebelumnya untuk sesi ini (kalau melanjutkan sesi lama)
      const { data: sudahAda } = await supabase
        .from('program_aktivitas').select('id_umkm')
        .eq('kategori', kategori).eq('nama_program', namaProgram.trim()).eq('tanggal', tanggal);
      (sudahAda || []).forEach((r) => sudahDicatatRef.current.add(r.id_umkm));

      if (batal) return;
      const { Html5Qrcode } = await import('html5-qrcode');
      html5QrCode = new Html5Qrcode('qr-reader-area');
      scannerRef.current = html5QrCode;
      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => prosesHasilScan(decodedText),
          () => {} // abaikan frame yang belum ketemu QR, ini dipanggil terus-menerus
        );
      } catch (e) {
        setPesan({ tipe: 'error', teks: 'Gagal buka kamera. Pastikan izin kamera diaktifkan untuk browser ini.' });
      }
    })();

    return () => {
      batal = true;
      if (html5QrCode) {
        html5QrCode.stop().then(() => html5QrCode.clear()).catch(() => {});
      }
    };
  }, [mode]);

  async function prosesHasilScan(decodedText) {
    const match = decodedText.match(/\/f\/(UMKM-\d+)\//);
    if (!match) {
      setPesan({ tipe: 'error', teks: 'QR tidak dikenali — ini bukan link pribadi SI-PROFIL.' });
      if (navigator.vibrate) navigator.vibrate(200);
      return;
    }
    const idUmkm = match[1];
    const nama = namaMap[idUmkm];
    if (!nama) {
      setPesan({ tipe: 'error', teks: `${idUmkm} tidak ditemukan di data UMKM.` });
      return;
    }
    if (sudahDicatatRef.current.has(idUmkm)) {
      setPesan({ tipe: 'warn', teks: `${nama} sudah tercatat sebelumnya di sesi ini — dilewati.` });
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      return;
    }
    await simpanKehadiran(idUmkm, nama);
  }

  async function simpanKehadiran(idUmkm, nama) {
    sudahDicatatRef.current.add(idUmkm);
    await supabase.from('program_aktivitas').insert({
      id_umkm: idUmkm, kategori, nama_program: namaProgram.trim(),
      tahun: parseInt(tanggal.slice(0, 4), 10), tanggal, sumber: 'Fasilitator',
    });
    catatLog(idUmkm, 'Catat Kehadiran (Scan)', `${kategori}: ${namaProgram.trim()}`);
    setTercatat((prev) => [{ id_umkm: idUmkm, nama_umkm: nama, waktu: new Date() }, ...prev]);
    setPesan({ tipe: 'ok', teks: `${nama} berhasil dicatat ✅` });
    if (navigator.vibrate) navigator.vibrate(80);
  }

  const cariHasil = cariManual.trim()
    ? umkmList.filter((u) =>
        (u.nama_umkm.toLowerCase().includes(cariManual.toLowerCase()) || u.id_umkm.toLowerCase().includes(cariManual.toLowerCase()))
        && !sudahDicatatRef.current.has(u.id_umkm)
      ).slice(0, 8)
    : [];

  function mulaiScan() {
    if (!namaProgram.trim()) return;
    sudahDicatatRef.current = new Set();
    setTercatat([]);
    setPesan(null);
    setMode('scanning');
  }

  function selesai() {
    setMode('setup');
    onSelesai();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,59,60,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16 }}>
      <div className="card" style={{ maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        {mode === 'setup' ? (
          <>
            <h3 style={{ fontSize: 17, marginBottom: 6 }}>📷 Scan Kehadiran Program</h3>
            <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 16 }}>Isi info sesi dulu, lalu scan QR/link pribadi tiap UMKM yang hadir — otomatis tercatat tanpa perlu cari nama satu-satu.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Kategori</label>
                <select value={kategori} onChange={(e) => setKategori(e.target.value)}>
                  {KATEGORI_PROGRAM.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Tanggal</label>
                <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
              </div>
            </div>
            <div className="field"><label>Nama Program</label><input value={namaProgram} onChange={(e) => setNamaProgram(e.target.value)} placeholder="mis. Pelatihan QCC" /></div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="btn-secondary" onClick={onSelesai}>Batal</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={mulaiScan} disabled={!namaProgram.trim()}>📷 Mulai Scan</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal-900)' }}>{namaProgram} <span className="badge ok">{kategori}</span></div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{new Date(tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>

            <div id="qr-reader-area" style={{ width: '100%', borderRadius: 12, overflow: 'hidden', background: '#000', minHeight: 240 }} />

            {pesan && (
              <div style={{
                marginTop: 10, padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: pesan.tipe === 'ok' ? '#e4eee3' : pesan.tipe === 'warn' ? 'var(--gold-100)' : '#f6deda',
                color: pesan.tipe === 'ok' ? '#3f5c3b' : pesan.tipe === 'warn' ? '#6b4e10' : '#9c3b26',
              }}>
                {pesan.teks}
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--teal-900)', display: 'block', marginBottom: 5 }}>UMKM belum punya QR? Cari manual:</label>
              <input value={cariManual} onChange={(e) => setCariManual(e.target.value)} placeholder="🔍 Cari nama UMKM..." style={{ width: '100%', padding: '9px 10px', border: '1.4px solid var(--line)', borderRadius: 8, fontSize: 13 }} />
              {cariHasil.length > 0 && (
                <div style={{ marginTop: 6, border: '1.4px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
                  {cariHasil.map((u) => (
                    <div key={u.id_umkm} onClick={() => { simpanKehadiran(u.id_umkm, u.nama_umkm); setCariManual(''); }}
                      style={{ padding: '8px 10px', fontSize: 12.5, cursor: 'pointer', borderTop: '1px solid var(--line)' }}>
                      {u.nama_umkm} <span style={{ color: 'var(--ink-soft)' }}>({u.wilayah || '-'})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--teal-900)', marginBottom: 6 }}>Sudah tercatat ({tercatat.length})</div>
              <div style={{ maxHeight: 140, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {tercatat.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Belum ada yang di-scan.</div>
                ) : tercatat.map((t, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 8px', background: 'var(--cream)', borderRadius: 6 }}>
                    <span>{t.nama_umkm}</span>
                    <span style={{ color: 'var(--ink-soft)' }}>{t.waktu.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              </div>
            </div>

            <button className="btn-primary" style={{ width: '100%', marginTop: 14 }} onClick={selesai}>✅ Selesai ({tercatat.length} tercatat)</button>
          </>
        )}
      </div>
    </div>
  );
}
