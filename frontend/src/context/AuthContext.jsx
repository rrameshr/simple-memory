import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/auth/me").then(({ data }) => setUser(data.user)).catch(() => setUser(null)).finally(() => setLoading(false));
    const expired = () => setUser(null);
    window.addEventListener("auth:expired", expired);
    return () => window.removeEventListener("auth:expired", expired);
  }, []);

  const register = useCallback(async (payload) => { const { data } = await api.post("/auth/register", payload); setUser(data.user); }, []);
  const login = useCallback(async (payload) => { const { data } = await api.post("/auth/login", payload); setUser(data.user); }, []);
  const logout = useCallback(async () => { try { await api.post("/auth/logout"); } finally { setUser(null); } }, []);

  const value = useMemo(() => ({ user, loading, register, login, logout, setUser }), [user, loading, register, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
