import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { ROLE_DASHBOARD_MAP } from '../constants/roles';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchUser() {
      try {
        const res = await api.get('/auth/me');
        if (!cancelled) {
          setUser(res.data.user || res.data);
        }
      } catch (err) {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchUser();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(
    async (email, password, keepSignedIn = false) => {
      const res = await api.post('/auth/signin', { email, password, keepSignedIn });
      const userData = res.data.user || res.data;
      // Fetch a fresh, stable CSRF token immediately after login.
      // This avoids the race condition where concurrent GET responses each
      // issued a new token+cookie pair, invalidating each other and causing
      // EBADCSRFTOKEN on the next POST.
      try { await api.get('/csrf-token'); } catch (_) {}
      const dashboardPath = ROLE_DASHBOARD_MAP[userData.role] || '/signin';
      // Full page navigation so the JWT cookie is already set
      // when ProtectedRoute checks auth on the next render
      window.location.href = dashboardPath;
      return userData;
    },
    []
  );

  const signUp = useCallback(
    async (data) => {
      const res = await api.post('/auth/signup', data);
      const userData = res.data.user || res.data;
      const dashboardPath = ROLE_DASHBOARD_MAP[userData.role] || '/signin';
      // Server already set a valid auth cookie; redirect straight to the dashboard
      window.location.href = dashboardPath;
      return userData;
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore errors — clear local state regardless
    }
    setUser(null);
    window.location.href = '/signin';
  }, []);

  const updateUser = useCallback((partialUser) => {
    setUser((prev) => (prev ? { ...prev, ...partialUser } : null));
  }, []);

  const value = {
    user,
    loading,
    signIn,
    signOut,
    signUp,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;