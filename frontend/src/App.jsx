import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import RequireCouple from "./components/RequireCouple";
import { Login, Register, ForgotPassword, ResetPassword, VerifyEmail } from "./pages/AuthPages";
import CoupleSetup from "./pages/CoupleSetup";
import Dashboard from "./pages/Dashboard";
import Gallery from "./pages/Gallery";
import { Albums, AlbumDetail } from "./pages/Albums";
import Timeline from "./pages/Timeline";
import Favorites from "./pages/Favorites";
import Dates from "./pages/Dates";
import Trash from "./pages/Trash";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

export default function App() {
  return <Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace/>}/>
    <Route path="/login" element={<Login/>}/>
    <Route path="/register" element={<Register/>}/>
    <Route path="/forgot-password" element={<ForgotPassword/>}/>
    <Route path="/reset-password" element={<ResetPassword/>}/>
    <Route path="/verify-email" element={<VerifyEmail/>}/>
    <Route element={<ProtectedRoute/>}>
      <Route element={<AppLayout/>}>
        <Route path="/couple" element={<CoupleSetup/>}/>
        <Route path="/notifications" element={<Notifications/>}/>
        <Route path="/settings" element={<Settings/>}/>
        <Route element={<RequireCouple/>}>
          <Route path="/dashboard" element={<Dashboard/>}/>
          <Route path="/gallery" element={<Gallery/>}/>
          <Route path="/albums" element={<Albums/>}/>
          <Route path="/albums/:albumId" element={<AlbumDetail/>}/>
          <Route path="/timeline" element={<Timeline/>}/>
          <Route path="/favorites" element={<Favorites/>}/>
          <Route path="/dates" element={<Dates/>}/>
          <Route path="/trash" element={<Trash/>}/>
        </Route>
      </Route>
    </Route>
    <Route path="*" element={<NotFound/>}/>
  </Routes>;
}
