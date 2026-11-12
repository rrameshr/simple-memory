import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Heart, LayoutDashboard, Images, FolderHeart, CalendarDays, Star, Settings, LogOut, Bell, CalendarHeart, Trash2, MailWarning } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api from "../services/api";
import { Avatar } from "./ui";
import { getError } from "../utils/format";

const links = [
  ["/dashboard", "Overview", LayoutDashboard],
  ["/gallery", "Gallery", Images],
  ["/albums", "Albums", FolderHeart],
  ["/timeline", "Timeline", CalendarDays],
  ["/favorites", "Favorites", Star],
  ["/dates", "Our dates", CalendarHeart],
  ["/trash", "Trash", Trash2],
  ["/notifications", "Notifications", Bell],
  ["/settings", "Settings", Settings]
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  const refreshUnread = useCallback(() => api.get("/notifications/unread-count").then(({ data }) => setUnread(data.unread)).catch(() => {}), []);
  useEffect(() => {
    refreshUnread();
    const id = setInterval(refreshUnread, 60_000);
    return () => clearInterval(id);
  }, [refreshUnread]);

  const signOut = async () => { await logout(); navigate("/login"); };
  const resend = async () => { try { await api.post("/auth/resend-verification"); toast.success("Verification email sent."); } catch (e) { toast.error(getError(e)); } };

  return <div className="app-shell">
    <aside className="sidebar">
      <Link className="brand" to="/dashboard"><span className="brand-icon"><Heart size={19} fill="currentColor"/></span> memories<span className="brand-dot">.</span></Link>
      <div className="side-label">YOUR SPACE</div>
      <nav>{links.map(([to, label, Icon]) => <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
        <Icon size={18}/><span>{label}</span>{to === "/notifications" && unread > 0 && <b className="badge">{unread > 9 ? "9+" : unread}</b>}
      </NavLink>)}</nav>
      <div className="sidebar-bottom">
        <div className="user-chip"><Avatar user={user}/><div><strong>{user?.name}</strong><small>{user?.email}</small></div></div>
        <button className="nav-link logout" onClick={signOut}><LogOut size={18}/>Sign out</button>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <span className="mobile-brand">♡ memories.</span>
        <span className="topbar-note">A little place for your favourite moments</span>
        <div className="top-actions">
          <Link to="/notifications" className="icon-btn bell" aria-label="Notifications"><Bell size={18}/>{unread > 0 && <b className="badge dot">{unread > 9 ? "9+" : unread}</b>}</Link>
          <Link to="/settings" aria-label="Profile"><Avatar user={user} size={32}/></Link>
        </div>
      </header>
      {user && !user.emailVerified && <div className="banner"><MailWarning size={16}/> Please verify your email address.<button onClick={resend}>Resend link</button></div>}
      <div className="page-content"><Outlet context={{ unread, setUnread, refreshUnread }}/></div>
    </main>
    <nav className="bottom-nav" aria-label="Main">{links.map(([to, label, Icon]) => <NavLink key={to} to={to} className={({ isActive }) => `bn-link ${isActive ? "active" : ""}`}>
      <Icon size={19}/><span>{label}</span>{to === "/notifications" && unread > 0 && <b className="badge dot">{unread > 9 ? "9+" : unread}</b>}
    </NavLink>)}</nav>
  </div>;
}
