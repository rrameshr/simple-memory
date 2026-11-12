import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, LogOut, ShieldCheck, Heart, TriangleAlert } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useCouple } from "../context/CoupleContext";
import { useToast } from "../context/ToastContext";
import ConfirmDialog from "../components/ConfirmDialog";
import { Avatar, ErrorNote, PageHeader } from "../components/ui";
import { fmtDay, getError, utcDateInput } from "../utils/format";

function PasswordConfirm({ value, onChange, error }) {
  return <label className="form-label">Confirm with your password
    <input type="password" autoFocus autoComplete="current-password" value={value} onChange={(e) => onChange(e.target.value)} className="plain-input"/><ErrorNote>{error}</ErrorNote></label>;
}

function SettingsInner() {
  const { user, setUser } = useAuth();
  const { couple, partner, active, refresh, setCouple } = useCouple();
  const toast = useToast();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [profile, setProfile] = useState({ name: user.name, bio: user.bio || "", birthday: utcDateInput(user.birthday) });
  const [space, setSpace] = useState({ name: couple?.name || "", anniversary: utcDateInput(couple?.anniversary) });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const [busy, setBusy] = useState("");
  const [dialog, setDialog] = useState(null); // "leave" | "delete"
  const [confirmPw, setConfirmPw] = useState("");
  const [dialogError, setDialogError] = useState("");

  const run = async (key, fn, success) => {
    setBusy(key);
    try { await fn(); if (success) toast.success(success); } catch (e) { toast.error(getError(e)); }
    setBusy("");
  };

  const saveProfile = (e) => { e.preventDefault(); run("profile", async () => { const { data } = await api.patch("/users/me", profile); setUser(data.user); }, "Profile saved."); };
  const saveSpace = (e) => { e.preventDefault(); run("space", async () => { const { data } = await api.patch(`/couples/${couple._id}`, space); setCouple(data.couple); }, "Space updated."); };
  const changePassword = (e) => {
    e.preventDefault();
    run("pw", async () => { await api.put("/users/me/password", pw); setPw({ currentPassword: "", newPassword: "" }); }, "Password changed. Other devices were signed out.");
  };
  const uploadAvatar = (e) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Choose an image under 5 MB.");
    const body = new FormData(); body.append("avatar", file);
    run("avatar", async () => { const { data } = await api.post("/users/me/avatar", body, { headers: { "Content-Type": "multipart/form-data" } }); setUser(data.user); }, "Profile photo updated.");
  };
  const signOutAll = () => run("all", async () => { await api.post("/auth/logout-all"); setUser(null); navigate("/login"); });

  const closeDialog = () => { setDialog(null); setConfirmPw(""); setDialogError(""); };
  const confirmDialog = async () => {
    setBusy("dialog"); setDialogError("");
    try {
      if (dialog === "leave") { await api.post(`/couples/${couple._id}/leave`, { password: confirmPw }); await refresh(); toast.success("You left the space."); closeDialog(); navigate("/couple"); }
      else { await api.delete("/users/me", { data: { password: confirmPw } }); setUser(null); navigate("/register"); }
    } catch (e) { setDialogError(getError(e)); }
    setBusy("");
  };

  return <section className="page narrow">
    <PageHeader eyebrow="PREFERENCES" title="Settings"/>

    <form className="panel form" onSubmit={saveProfile}>
      <h3>Profile</h3>
      <div className="avatar-row"><Avatar user={user} size={64}/><div><button type="button" className="button secondary" onClick={() => fileRef.current?.click()} disabled={busy === "avatar"}><Camera size={15}/>{busy === "avatar" ? "Uploading..." : "Change photo"}</button><small className="hint">JPG, PNG or WebP up to 5 MB</small></div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={uploadAvatar}/></div>
      <label>Name<input required maxLength={80} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })}/></label>
      <label>Email<input value={user.email} disabled/><small className="hint">{user.emailVerified ? "Verified ✓" : "Not verified yet"}</small></label>
      <label>Bio<input maxLength={200} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} placeholder="A line about you"/></label>
      <label>Birthday<input type="date" value={profile.birthday} onChange={(e) => setProfile({ ...profile, birthday: e.target.value })}/><small className="hint">Your partner gets a reminder on Our dates.</small></label>
      <button className="button primary" disabled={busy === "profile"}>{busy === "profile" ? "Saving..." : "Save profile"}</button>
    </form>

    {couple && <form className="panel form" onSubmit={saveSpace}>
      <h3><Heart size={17}/> Couple space</h3>
      <label>Space name<input required maxLength={80} value={space.name} onChange={(e) => setSpace({ ...space, name: e.target.value })}/></label>
      <label>Anniversary<input type="date" value={space.anniversary} max={utcDateInput(new Date())} onChange={(e) => setSpace({ ...space, anniversary: e.target.value })}/><small className="hint">{space.anniversary ? `Together since ${fmtDay(space.anniversary)}` : "Used for the days-together counter on your dashboard."}</small></label>
      <p className="muted small">Members: <b>{user.name}</b>{active && partner ? <> &amp; <b>{partner.name}</b></> : " (waiting for your partner)"}</p>
      <div className="row-gap"><button className="button primary" disabled={busy === "space"}>{busy === "space" ? "Saving..." : "Save space"}</button>
        {active && <button type="button" className="button danger-soft" onClick={() => setDialog("leave")}>Leave space</button>}</div>
    </form>}

    <form className="panel form" onSubmit={changePassword}>
      <h3><ShieldCheck size={17}/> Security</h3>
      <label>Current password<input type="password" autoComplete="current-password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}/></label>
      <label>New password<input type="password" autoComplete="new-password" required minLength={8} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}/><small className="hint">8+ characters with a letter and a number.</small></label>
      <div className="row-gap"><button className="button primary" disabled={busy === "pw"}>{busy === "pw" ? "Updating..." : "Change password"}</button>
        <button type="button" className="button secondary" onClick={signOutAll} disabled={busy === "all"}><LogOut size={15}/> Sign out everywhere</button></div>
    </form>

    <div className="panel danger-zone">
      <h3><TriangleAlert size={17}/> Danger zone</h3>
      <p className="muted">Deleting your account permanently removes your profile and every memory you uploaded. Your partner keeps their own memories and the space.</p>
      <button className="button danger" onClick={() => setDialog("delete")}>Delete my account</button>
    </div>

    {dialog && <ConfirmDialog danger busy={busy === "dialog"} title={dialog === "leave" ? "Leave this couple space?" : "Delete your account?"} confirmLabel={dialog === "leave" ? "Leave space" : "Delete account"} onCancel={closeDialog} onConfirm={confirmDialog}
      message={dialog === "leave" ? "The memories you uploaded to this space are deleted for good. Your partner keeps the rest and can invite someone new." : "This permanently deletes your account and everything you uploaded. This can't be undone."}>
      <PasswordConfirm value={confirmPw} onChange={setConfirmPw} error={dialogError}/>
    </ConfirmDialog>}
  </section>;
}

export default function Settings() {
  const { loading } = useCouple();
  if (loading) return <div className="skeleton skeleton-banner tall"/>; // wait so the forms start with real values
  return <SettingsInner/>;
}
