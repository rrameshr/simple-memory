import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CoupleProvider } from "../context/CoupleContext";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-screen">Loading your memories...</div>;
  return user ? <CoupleProvider><Outlet /></CoupleProvider> : <Navigate to="/login" replace />;
}
