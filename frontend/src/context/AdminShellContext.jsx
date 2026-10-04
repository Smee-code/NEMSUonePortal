import { createContext, useContext } from 'react';

export const AdminShellCtx = createContext(null);

export function useAdminShell() {
  const ctx = useContext(AdminShellCtx);
  if (!ctx) throw new Error('useAdminShell must be used inside AdminShell');
  return ctx;
}
