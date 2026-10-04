import { createContext, useContext } from 'react';
export const RegistrarShellCtx = createContext({ toast: () => {} });
export function useRegistrarShell() {
  return useContext(RegistrarShellCtx);
}
