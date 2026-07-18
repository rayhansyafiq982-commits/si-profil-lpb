'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { supabase, generateNextUmkmId, catatLog, LEGALITAS_OPSI } from '../lib/supabase';

const BIDANG_OPSI = ['Kuliner', 'Pertanian', 'Peternakan', 'Perikanan', 'Kerajinan', 'Jasa', 'Lainnya'];

export default function UmkmForm({ mode, existingData }) {
  // mode: 'baru' | 'update'
  const isUpdate = mode === 'update';

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selesai, setSelesai] = useState(false);
  const [hasilLink, setHasilLink] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);

  const [profil, setProfil] = useState({
    nama_umkm: existingData?.umkm?.nama_umkm || '',
    nama_pemilik: existingData?.umkm?.nama_pemilik || '',
    no_hp: existingData?.umkm?.no_hp || '',
    daerah: existingData?.umkm?.daerah || '',
    wilayah: existingData?.umkm?.wilayah || '',
    tahun_masuk: existingData?.umkm?.tahun_masuk || '',
    bidang_usaha: existingData?.umkm?.bidang_usaha || '',
    spesialisasi: existingData?.umkm?.spesialisasi || '',
    produk_unggulan: existingData?.umkm?.produk_unggulan || '',
  });
  const [legalitasChips, setLegalitasChips] = useState(
    (existingData?.legalitas || []).map((l) => l.jenis_legalitas).filter((v) => LEGALITAS_OPSI.includes(v))
  );
  const [catatanLegalitas, setCatatanLegalitas] = useState(
    (existingData?.legalitas || []).find((l) => l.catatan)?.catatan || ''
  );
  const [produkList, setProdukList] = useState(
    existingData?.produk?.length ? existingData.produk : [{ nama_produk: '', kategori: '', varian: '' }]
  );
  const [kemasanList, setKemasanList] = useState(
    existingData?.kemasan?.length ? existingData.kemasan : [{ jenis_kemasan: '', ukuran: '' }]
  );

  const now = new Date();
  const bulanNama = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const bulanIni = now.getMonth() + 1;
  const tahunIni = now.getFullYear();
  const [omzetInput, setOmzetInput] = useState('');
  const [profitInput, setProfitInput] = useState('');
  const [omzetDilewati, setOmzetDilewati] = useState(false);
  const riwayatOmzet = existingData?.omzetRiwayat || [];
  const [pelatihanList, setPelatihanList] = useState(['']);
  function updatePelatihan(i, value) {
    setPelatihanList((prev) => prev.map((p, idx) => idx === i ? value : p));
  }

  // Honeypot anti-bot: field ini disembunyikan dari mata manusia lewat CSS,
  // tapi bot yang isi form otomatis biasanya tetap mengisinya.
  const [honeypot, setHoneypot] = useState('');

  // Simpan draft otomatis ke perangkat ini supaya isian tidak hilang kalau sinyal putus di tengah jalan.
  const draftKey = `siprofil_draft_${mode}_${existingData?.umkm?.id_umkm || 'baru'}`;
  const [draftDipulihkan, setDraftDipulihkan] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const d = JSON.parse(saved);
        if (d.profil) setProfil(d.profil);
        if (d.legalitasChips) setLegalitasChips(d.legalitasChips);
        if (d.catatanLegalitas) setCatatanLegalitas(d.catatanLegalitas);
        if (d.produkList) setProdukList(d.produkList);
        if (d.kemasanList) setKemasanList(d.kemasanList);
        if (d.pelatihanList) setPelatihanList(d.pelatihanList);
        if (d.step) setStep(d.step);
        setDraftDipulihkan(true);
      }
    } catch (e) { /* abaikan kalau localStorage tidak tersedia */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selesai) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({ step, profil, legalitasChips, catatanLegalitas, produkList, kemasanList, pelatihanList }));
    } catch (e) { /* abaikan kalau localStorage penuh/tidak tersedia */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, profil, legalitasChips, catatanLegalitas, produkList, kemasanList, pelatihanList]);

  function hapusDraft() {
    try { localStorage.removeItem(draftKey); } catch (e) {}
  }

  function toggleLegalitas(opsi) {
    setLegalitasChips((prev) => prev.includes(opsi) ? prev.filter((o) => o !== opsi) : [...prev, opsi]);
  }
  function updateProduk(i, field, value) {
    setProdukList((prev) => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
  }
  function updateKemasan(i, field, value) {
    setKemasanList((prev) => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
  }

  async function submitSemua() {
    if (honeypot) {
      // Kemungkinan besar bot — hentikan diam-diam tanpa kasih tahu detail deteksinya.
      setSelesai(true);
      return;
    }
    if (isUpdate && !omzetDilewati && omzetInput && parseFloat(omzetInput) > 0 && parseFloat(omzetInput) < 1000) {
      const dugaan = (parseFloat(omzetInput) * 1000000).toLocaleString('id-ID');
      const lanjut = window.confirm(
        `Omzet yang diisi (${omzetInput}) kelihatan kecil sekali.\n\nApakah maksudnya Rp${dugaan} (${omzetInput} juta)?\n\nKalau ya, klik OK lalu ubah isian jadi angka penuh dulu (mis. ${Math.round(parseFloat(omzetInput) * 1000000)}). Kalau memang benar segitu, klik Cancel untuk tetap simpan apa adanya.`
      );
      if (lanjut) return;
    }
    setLoading(true);
    setError('');
    try {
      let finalId = existingData?.umkm?.id_umkm;
      let finalToken = existingData?.umkm?.akses_token;

      if (isUpdate) {
        const { error: updErr } = await supabase.from('master_umkm').update({
          ...profil, tahun_masuk: profil.tahun_masuk ? parseInt(profil.tahun_masuk, 10) : null,
          updated_at: new Date().toISOString(),
        }).eq('id_umkm', finalId);
        if (updErr) throw updErr;
        await catatLog(finalId, 'Update Data', 'Profil diperbarui via link pribadi');
      } else {
        finalId = await generateNextUmkmId();
        const { data: inserted, error: insErr } = await supabase.from('master_umkm').insert({
          id_umkm: finalId, ...profil, tahun_masuk: profil.tahun_masuk ? parseInt(profil.tahun_masuk, 10) : null,
        }).select('akses_token').single();
        if (insErr) throw insErr;
        finalToken = inserted.akses_token;
        await catatLog(finalId, 'Daftar Baru', `UMKM baru: ${profil.nama_umkm}`);
      }

      await supabase.from('legalitas').delete().eq('id_umkm', finalId);
      if (legalitasChips.length > 0 || catatanLegalitas) {
        const rows = legalitasChips.length > 0
          ? legalitasChips.map((jenis) => ({ id_umkm: finalId, jenis_legalitas: jenis, catatan: catatanLegalitas || null }))
          : [{ id_umkm: finalId, jenis_legalitas: null, catatan: catatanLegalitas }];
        await supabase.from('legalitas').insert(rows);
      }

      await supabase.from('produk').delete().eq('id_umkm', finalId);
      const produkValid = produkList.filter((p) => p.nama_produk.trim());
      if (produkValid.length > 0) {
        await supabase.from('produk').insert(produkValid.map((p) => ({ id_umkm: finalId, nama_produk: p.nama_produk, kategori: p.kategori, varian: p.varian })));
      }

      await supabase.from('kemasan').delete().eq('id_umkm', finalId);
      const kemasanValid = kemasanList.filter((k) => k.jenis_kemasan.trim());
      if (kemasanValid.length > 0) {
        await supabase.from('kemasan').insert(kemasanValid.map((k) => ({ id_umkm: finalId, jenis_kemasan: k.jenis_kemasan, ukuran: k.ukuran })));
      }

      if (!isUpdate) {
        const pelatihanValid = pelatihanList.filter((p) => p.trim());
        if (pelatihanValid.length > 0) {
          await supabase.from('program_aktivitas').insert(pelatihanValid.map((nama) => ({
            id_umkm: finalId, kategori: 'Pelatihan', nama_program: nama, tahun: tahunIni, sumber: 'UMKM',
          })));
        }
      }

      if (isUpdate && !omzetDilewati && (omzetInput || profitInput)) {
        await supabase.from('omzet_bulanan').upsert({
          id_umkm: finalId, tahun: tahunIni, bulan: bulanIni,
          omzet: omzetInput ? parseFloat(omzetInput) : null,
          profit: profitInput ? parseFloat(profitInput) : null,
        }, { onConflict: 'id_umkm,tahun,bulan' });
        await catatLog(finalId, 'Input Omzet', `${bulanNama[bulanIni - 1]} ${tahunIni}: Rp${omzetInput || 0}`);
      }

      if (!isUpdate) {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const link = `${origin}/f/${finalId}/${finalToken}`;
        setHasilLink(link);
        const qr = await QRCode.toDataURL(link, { width: 320, margin: 1, color: { dark: '#0B3B3C', light: '#FFFFFF' } });
        setQrDataUrl(qr);
      }

      setSelesai(true);
      hapusDraft();
    } catch (e) {
      setError('Gagal menyimpan data: ' + (e.message || 'error tidak diketahui'));
    }
    setLoading(false);
  }

  if (selesai) {
    return (
      <div style={{ maxWidth: 480, margin: '40px auto', textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2>Data berhasil disimpan</h2>
        <p style={{ color: 'var(--ink-soft)', marginTop: 8 }}>
          Terima kasih, data UMKM <strong>{profil.nama_umkm}</strong> sudah {isUpdate ? 'diperbarui' : 'terdaftar'}.
        </p>

        {hasilLink && (
          <div className="card" style={{ marginTop: 24, textAlign: 'left' }}>
            <h4 style={{ fontSize: 14, marginBottom: 10 }}>🔗 Link Pribadi UMKM Ini</h4>
            <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 12 }}>
              Simpan atau bagikan link/QR ini ke UMKM. Ini kunci permanen mereka untuk update data kapan saja — tidak bergantung nomor HP.
            </p>
            {qrDataUrl && <img src={qrDataUrl} alt="QR Code" style={{ width: '100%', maxWidth: 220, display: 'block', margin: '0 auto 12px' }} />}
            <div style={{ background: 'var(--cream)', padding: '10px 12px', borderRadius: 8, fontSize: 11.5, wordBreak: 'break-all', fontFamily: 'JetBrains Mono, monospace' }}>
              {hasilLink}
            </div>
            <button className="btn-secondary" style={{ width: '100%', marginTop: 10 }} onClick={() => navigator.clipboard.writeText(hasilLink)}>
              📋 Salin Link
            </button>
          </div>
        )}

        {!isUpdate && (
          <button className="btn-secondary" style={{ marginTop: 20 }} onClick={() => window.location.reload()}>
            Daftarkan UMKM Lain
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 20px 80px' }}>
      {/* Honeypot anti-bot — tidak terlihat manusia, bot form-filler biasanya tetap mengisi ini */}
      <input
        type="text" name="website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)}
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
        tabIndex={-1} autoComplete="off" aria-hidden="true"
      />

      {draftDipulihkan && (
        <div style={{ background: 'var(--gold-100)', color: '#6b4e10', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 12.5 }}>
          📝 Draf isian sebelumnya dipulihkan otomatis dari perangkat ini.
        </div>
      )}

      {error && (
        <div style={{ background: '#f6deda', color: '#9c3b26', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        {isUpdate ? (
          <span className="badge ok">🔄 Update Data — {existingData.umkm.id_umkm}</span>
        ) : (
          <span className="badge warn">🆕 UMKM Baru — isi data lengkap</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {(isUpdate ? ['Profil', 'Legalitas', 'Produk', 'Kemasan', 'Omzet'] : ['Profil', 'Legalitas', 'Produk', 'Kemasan', 'Pelatihan']).map((label, i) => (
          <div key={label} style={{ flex: 1, height: 4, borderRadius: 2, background: step >= i + 1 ? 'var(--gold-500)' : 'var(--line)' }} />
        ))}
      </div>

      {step === 1 && (
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: 17 }}>1. Profil UMKM</h3>
          <div className="field"><label>Nama UMKM</label><input value={profil.nama_umkm} onChange={(e) => setProfil({ ...profil, nama_umkm: e.target.value })} /></div>
          <div className="field"><label>Nama Pemilik</label><input value={profil.nama_pemilik} onChange={(e) => setProfil({ ...profil, nama_pemilik: e.target.value })} /></div>
          <div className="field">
            <label>Nomor WhatsApp / HP {isUpdate && <span style={{ fontWeight: 400, color: 'var(--ink-soft)' }}>(boleh diperbarui)</span>}</label>
            <input value={profil.no_hp} onChange={(e) => setProfil({ ...profil, no_hp: e.target.value })} placeholder="08xxxxxxxxxx" />
            <div className="hint">Hanya untuk keperluan kontak — bukan lagi kunci pencarian data.</div>
          </div>
          <div className="field"><label>Daerah</label><input value={profil.daerah} onChange={(e) => setProfil({ ...profil, daerah: e.target.value })} /></div>
          <div className="field"><label>Wilayah</label><input value={profil.wilayah} onChange={(e) => setProfil({ ...profil, wilayah: e.target.value })} /></div>
          <div className="field"><label>Tahun Bergabung</label><input type="number" value={profil.tahun_masuk} onChange={(e) => setProfil({ ...profil, tahun_masuk: e.target.value })} /></div>
          <div className="field">
            <label>Bidang Usaha</label>
            <select value={profil.bidang_usaha} onChange={(e) => setProfil({ ...profil, bidang_usaha: e.target.value })}>
              <option value="">Pilih bidang usaha</option>
              {BIDANG_OPSI.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="field"><label>Spesialisasi</label><input value={profil.spesialisasi} onChange={(e) => setProfil({ ...profil, spesialisasi: e.target.value })} /></div>
          <div className="field"><label>Produk Unggulan</label><input value={profil.produk_unggulan} onChange={(e) => setProfil({ ...profil, produk_unggulan: e.target.value })} /></div>
          <button className="btn-primary" style={{ width: '100%' }} onClick={() => setStep(2)} disabled={!profil.nama_umkm}>Lanjut ke Legalitas</button>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: 17 }}>2. Legalitas</h3>
          <div className="field">
            <label>Jenis Legalitas yang dimiliki</label>
            <div className="chip-row">
              {LEGALITAS_OPSI.map((opsi) => (
                <span key={opsi} className={`chip ${legalitasChips.includes(opsi) ? 'on' : ''}`} onClick={() => toggleLegalitas(opsi)} style={{ cursor: 'pointer' }}>{opsi}</span>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Catatan Legalitas (opsional)</label>
            <input value={catatanLegalitas} onChange={(e) => setCatatanLegalitas(e.target.value)} placeholder="mis. PIRT sedang proses perpanjangan" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" onClick={() => setStep(1)}>Kembali</button>
            <button className="btn-primary" style={{ flex: 1 }} onClick={() => setStep(3)}>Lanjut ke Produk</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: 17 }}>3. Produk</h3>
          {produkList.map((p, i) => (
            <div key={i} style={{ borderBottom: i < produkList.length - 1 ? '1px solid var(--line)' : 'none', paddingBottom: 12, marginBottom: 12 }}>
              <div className="field"><label>Nama Produk</label><input value={p.nama_produk} onChange={(e) => updateProduk(i, 'nama_produk', e.target.value)} /></div>
              <div className="field"><label>Kategori</label><input value={p.kategori} onChange={(e) => updateProduk(i, 'kategori', e.target.value)} /></div>
              <div className="field"><label>Varian</label><input value={p.varian} onChange={(e) => updateProduk(i, 'varian', e.target.value)} /></div>
            </div>
          ))}
          <button className="btn-ghost" onClick={() => setProdukList([...produkList, { nama_produk: '', kategori: '', varian: '' }])}>+ Tambah produk lain</button>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn-secondary" onClick={() => setStep(2)}>Kembali</button>
            <button className="btn-primary" style={{ flex: 1 }} onClick={() => setStep(4)}>Lanjut ke Kemasan</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: 17 }}>4. Kemasan</h3>
          {kemasanList.map((k, i) => (
            <div key={i} style={{ borderBottom: i < kemasanList.length - 1 ? '1px solid var(--line)' : 'none', paddingBottom: 12, marginBottom: 12 }}>
              <div className="field"><label>Jenis Kemasan</label><input value={k.jenis_kemasan} onChange={(e) => updateKemasan(i, 'jenis_kemasan', e.target.value)} /></div>
              <div className="field"><label>Ukuran</label><input value={k.ukuran} onChange={(e) => updateKemasan(i, 'ukuran', e.target.value)} /></div>
            </div>
          ))}
          <button className="btn-ghost" onClick={() => setKemasanList([...kemasanList, { jenis_kemasan: '', ukuran: '' }])}>+ Tambah kemasan lain</button>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn-secondary" onClick={() => setStep(3)}>Kembali</button>
            <button className="btn-primary" style={{ flex: 1 }} onClick={() => setStep(5)} disabled={loading}>
              {isUpdate ? 'Lanjut ke Omzet' : 'Lanjut ke Program Pelatihan'}
            </button>
          </div>
        </div>
      )}
      {step === 5 && !isUpdate && (
        <div className="card">
          <h3 style={{ marginBottom: 8, fontSize: 17 }}>5. Program Pelatihan</h3>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 16 }}>
            Program pelatihan apa yang pernah/sedang diikuti UMKM ini? Boleh dikosongkan kalau belum ada.
          </p>
          {pelatihanList.map((nama, i) => (
            <div key={i} className="field">
              <label>Nama Pelatihan {i + 1}</label>
              <input value={nama} onChange={(e) => updatePelatihan(i, e.target.value)} placeholder="mis. Pelatihan Higiene & Sertifikasi PIRT" />
            </div>
          ))}
          <button className="btn-ghost" onClick={() => setPelatihanList([...pelatihanList, ''])}>+ Tambah pelatihan lain</button>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn-secondary" onClick={() => setStep(4)}>Kembali</button>
            <button className="btn-primary" style={{ flex: 1 }} onClick={submitSemua} disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan & Selesai'}
            </button>
          </div>
        </div>
      )}

      {step === 5 && isUpdate && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 17 }}>5. Omzet {bulanNama[bulanIni - 1]} {tahunIni}</h3>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Omzet (Rp)</label>
              <input type="number" value={omzetInput} onChange={(e) => setOmzetInput(e.target.value)} placeholder="cth. 12000000" />
              <div className="hint">Tulis angka penuh, bukan singkatan juta. Contoh: 12 juta rupiah ditulis <strong>12000000</strong>, bukan 12.5.</div>
            </div>
          </div>
          <div className="field"><label>Profit (Rp) — opsional</label><input type="number" value={profitInput} onChange={(e) => setProfitInput(e.target.value)} placeholder="cth. 7200000" /></div>

          {riwayatOmzet.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ fontSize: 12.5, color: 'var(--teal-900)', marginBottom: 8 }}>Riwayat omzet tercatat</h4>
              {riwayatOmzet.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '6px 0', borderBottom: '1px solid var(--line)', color: 'var(--ink-soft)' }}>
                  <span>{bulanNama[r.bulan - 1]} {r.tahun}</span>
                  <span>{r.omzet != null ? `Rp ${Number(r.omzet).toLocaleString('id-ID')}` : '-'}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <button className="btn-secondary" onClick={() => { setOmzetDilewati(true); submitSemua(); }} disabled={loading}>Lewati</button>
            <button className="btn-primary" style={{ flex: 1 }} onClick={submitSemua} disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan & Selesai'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
