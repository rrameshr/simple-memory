import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useAuth } from "./AuthContext";

const CoupleContext = createContext(null);

export function CoupleProvider({ children }) {
  const { user } = useAuth();
  const [couple, setCouple] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/couples/mine");
      setCouple(data.couples.find((c) => c.status === "active") || data.couples[0] || null);
    } catch { setCouple(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo(() => {
    const active = couple?.status === "active";
    const partner = couple?.members?.find((m) => String(m._id) !== String(user?.id)) || null;
    return { couple, partner, active, loading, refresh, setCouple };
  }, [couple, loading, refresh, user?.id]);

  return <CoupleContext.Provider value={value}>{children}</CoupleContext.Provider>;
}

export const useCouple = () => useContext(CoupleContext);
