import { NextResponse } from 'next/server';

// Proteksi /admin sekarang ditangani di sisi client (lihat app/admin/layout.js)
// karena memakai sesi Supabase Auth, bukan cookie password sederhana.
export function middleware(req) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
