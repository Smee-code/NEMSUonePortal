import { createContext, useContext } from 'react';

export const FacultyShellCtx = createContext({ toast: () => {} });

export function useFacultyShell() {
  return useContext(FacultyShellCtx);
}
