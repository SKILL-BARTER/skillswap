import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      return null;
    }
    try {
      const data = await api('/auth/me');
      setUser(data.user);
      return data.user;
    } catch {
      setToken(null);
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const value = {
    user,
    loading,
    refresh,
    setUser,
    async login(email, password) {
      const data = await api('/auth/login', { method: 'POST', body: { email, password } });
      setToken(data.token);
      setUser(data.user);
      return data.user;
    },
    async register(payload) {
      const data = await api('/auth/register', { method: 'POST', body: payload });
      setToken(data.token);
      setUser(data.user);
      return data.user;
    },
    async loginWithGoogle(idToken) {
      const data = await api('/auth/google', { method: 'POST', body: { idToken } });
      setToken(data.token);
      setUser(data.user);
      return data.user;
    },
    async logout() {
      try {
        await api('/auth/logout', { method: 'POST' });
      } catch {
        // Session already gone — fine.
      }
      setToken(null);
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
