import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Plus, Copy, Users, RefreshCw } from "lucide-react";
import api from "../services/api";
import { useCouple } from "../context/CoupleContext";
import { useToast } from "../context/ToastContext";
import { getError } from "../utils/format";
import { ErrorNote } from "../components/ui";
import ConfirmDialog from "../components/ConfirmDialog";

export default function CoupleSetup() {
  const { couple, active, loading, refresh, setCouple } = useCouple();
  const toast = useToast();
  const [name, setName] = useState("Our Memories");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (loading) return <div className="skeleton skeleton-banner"/>;
  if (active) return <Navigate to="/dashboard" replace/>;

  const run = async (fn, fallback) => { setError(""); setBusy(true); try { await fn(); } catch (err) { setError(getError(err, fallback)); } finally { setBusy(false); } };
  const create = (e) => { e.preventDefault(); run(async () => { await api.post("/couples", { name }); await refresh(); }, "Could not create space."); };
  const join = (e) => { e.preventDefault(); run(async () => { await api.post("/couples/join", { inviteCode: code }); await refresh(); toast.success("You're connected 💞"); }, "Could not join space."); };
  const regenerate = () => run(async () => { const { data } = await api.post(`/couples/${couple._id}/invite`); setCouple((c) => ({ ...c, inviteCode: data.couple.inviteCode })); }, "Could not create a new code.");
  const cancel = () => run(async () => { await api.delete(`/couples/${couple._id}`); setCouple(null); setConfirmCancel(false); }, "Could not cancel.");
  const copy = async () => { await navigator.clipboard.writeText(couple.inviteCode); toast.success("Invitation code copied"); };

  if (couple?.status === "pending") return <section className="page narrow">
    <div className="eyebrow">ALMOST THERE</div><h1>Invite your partner</h1>
    <p className="muted">Share this single-use code. Your space unlocks the moment they join.</p>
    <div className="panel"><div className="invite-code">{couple.inviteCode}</div>
      <div className="row-gap"><button className="button secondary" onClick={copy}><Copy size={15}/> Copy code</button><button className="button secondary" onClick={regenerate} disabled={busy}><RefreshCw size={15}/> New code</button><button className="button danger-soft" onClick={() => setConfirmCancel(true)}>Cancel space</button></div>
      <p className="muted small">The page updates once your partner joins. <button className="link-btn" onClick={refresh}>Check now</button></p></div>
    <ErrorNote>{error}</ErrorNote>
    {confirmCancel && <ConfirmDialog danger title="Cancel this space?" confirmLabel="Cancel space" busy={busy} onCancel={() => setConfirmCancel(false)} onConfirm={cancel} message="The invitation code will stop working. You can create a new space or join your partner's space afterwards."/>}
  </section>;

  return <section className="page narrow"><div className="eyebrow">ONE SPACE, TWO PEOPLE</div><h1>Start your shared story.</h1>
    <p className="muted">Create a space and invite your partner, or join with their invitation code.</p>
    <div className="panel"><h3><Plus size={18}/> Create a space</h3>
      <form className="form" onSubmit={create}><label>Space name<input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} required/></label><button className="button primary" disabled={busy}>Create space</button></form></div>
    <div className="panel"><h3><Users size={18}/> Join a space</h3>
      <form className="form" onSubmit={join}><label>Invitation code<input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter partner's code" required/></label><button className="button secondary" disabled={busy}>Join space</button></form></div>
    <ErrorNote>{error}</ErrorNote>
    <p className="muted small"><Link to="/settings">Account settings</Link></p>
  </section>;
}
