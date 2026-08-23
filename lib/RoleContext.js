'use client';

import { createContext, useContext } from 'react';

const RoleContext = createContext({ role: null, isAdmin: false, isViewer: false });

export function RoleProvider({ value, children }) {
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

/**
 * Panggil ini di halaman/komponen manapun di dalam /admin untuk tahu role user yang login.
 * isAdmin: bisa tambah/edit/hapus. isViewer: cuma bisa lihat (misal Tim CSR PAMA INDO).
 */
export function useRole() {
  return useContext(RoleContext);
}
