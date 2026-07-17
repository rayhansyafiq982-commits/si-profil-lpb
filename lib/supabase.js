import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const KELAS_OPSI = ['Pemula', 'Madya', 'Pra Mandiri', 'Mandiri'];
export const LEGALITAS_OPSI = ['PIRT', 'Halal', 'BPOM', 'NIB', 'Belum ada'];
export const KATEGORI_PROGRAM = ['Pelatihan', 'Pendampingan', 'Pemasaran', 'Pembiayaan'];

// Generate ID UMKM baru berikutnya, format UMKM-001, UMKM-002, dst.
export async function generateNextUmkmId() {
  const { data, error } = await supabase
    .from('master_umkm')
    .select('id_umkm')
    .order('id_umkm', { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return 'UMKM-001';
  const lastNum = parseInt(data[0].id_umkm.split('-')[1], 10);
  const nextNum = lastNum + 1;
  return `UMKM-${String(nextNum).padStart(3, '0')}`;
}

export async function catatLog(id_umkm, aksi, detail) {
  await supabase.from('log_perubahan').insert({ id_umkm, aksi, detail });
}
