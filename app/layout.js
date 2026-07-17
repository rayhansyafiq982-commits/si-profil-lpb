import './globals.css';

export const metadata = {
  title: 'SI-PROFIL — UMKM Binaan LPB',
  description: 'Sistem Informasi Profil UMKM Binaan LPB Pama Bessai Berinta',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport = {
  themeColor: '#0B3B3C',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
