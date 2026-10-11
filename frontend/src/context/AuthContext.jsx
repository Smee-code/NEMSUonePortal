import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/axios';
import { clearAccessToken, setAccessToken } from '../api/tokenStore';

const AuthContext = createContext(null);

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return {};
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  /**
   * loading = true while we check whether the HttpOnly refresh cookie
   * can restore a previous session. Until resolved, protected routes
   * must not redirect — they would falsely bounce a logged-in user.
   */
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const res = await api.post('/auth/token/refresh/');
        setAccessToken(res.data.access);
        const payload = parseJwt(res.data.access);
        setUser({
          id: payload.user_id,
          role: payload.role,
          full_name: payload.full_name,
          needs_academic_setup: !!payload.needs_academic_setup,
        });
      } catch {
        // No valid refresh cookie — user must log in
        clearAccessToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = useCallback(async (credentials) => {
    const res = await api.post('/auth/login/', credentials);
    // Access token stored in memory only — never in localStorage/sessionStorage
    setAccessToken(res.data.access);
    setUser(res.data.user);
    return res.data;
  }, []);

  const loginWithToken = useCallback((accessToken) => {
    setAccessToken(accessToken);
    const payload = parseJwt(accessToken);
    setUser({
      id: payload.user_id,
      role: payload.role,
      full_name: payload.full_name,
      needs_academic_setup: !!payload.needs_academic_setup,
    });
  }, []);

  // Merge fields into the in-memory user (e.g. clear the academic-setup gate
  // after the student completes it, without waiting for a token refresh).
  const updateUser = useCallback((patch) => {
    setUser(prev => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout/');
    } catch {
      // Proceed with local logout even if the server call fails
    }
    clearAccessToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithToken, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
