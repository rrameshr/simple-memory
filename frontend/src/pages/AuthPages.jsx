import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Heart } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { getError } from "../utils/format";
import { ErrorNote } from "../components/ui";

function AuthShell({ title, subtitle, children }) {
  return <div className="auth-page">
    <div className="auth-art"><div className="auth-art-content">
      <div className="brand light"><span className="brand-icon"><Heart size={19} fill="currentColor"/></span> memories.</div>
      <h1>Every moment<br/>has a place.</h1><p>Keep the little things close. Your photos, your stories, your shared world.</p><div className="art-orbit">♡</div>
    </div></div>
    <div className="auth-form-side"><div className="auth-card"><div className="auth-mobile-brand">♡ memories.</div><h2>{title}</h2><p className="muted">{subtitle}</p>{children}</div></div>
  </div>;
}

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setError(""); setBusy(true);
    try { await login(form); navigate("/dashboard"); } catch (err) { setError(getError(err, "Could not log in.")); setBusy(false); }
  };
  return <AuthShell title="Welcome back" subtitle="Your memories are right where you left them.">
    <form onSubmit={submit} className="form">
      <label>Email address<input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com"/></label>
      <label>Password<input type="password" required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Your password"/></label>
      <ErrorNote>{error}</ErrorNote>
      <button className="button primary full" disabled={busy}>{busy ? "Logging in..." : "Log in"}</button>
      <p className="form-foot"><Link to="/forgot-password">Forgot your password?</Link></p>
      <p className="form-foot">New here? <Link to="/register">Create an account</Link></p>
    </form>
  </AuthShell>;
}

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setError(""); setBusy(true);
    try { await register(form); navigate("/couple"); } catch (err) { setError(getError(err, "Could not create account.")); setBusy(false); }
  };
  return <AuthShell title="Make room for memories" subtitle="Create your account to start your private space.">
    <form onSubmit={submit} className="form">
      <label>Your name<input required maxLength={80} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name"/></label>
      <label>Email address<input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com"/></label>
      <label>Password<input type="password" minLength={8} required autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters"/><small className="hint">Use 8+ characters with a letter and a number.</small></label>
      <ErrorNote>{error}</ErrorNote>
      <button className="button primary full" disabled={busy}>{busy ? "Creating..." : "Create account"}</button>
      <p className="form-foot">Already have an account? <Link to="/login">Log in</Link></p>
    </form>
  </AuthShell>;
}

export function ForgotPassword() {
  const [email, setEmail] = useState(""); const [sent, setSent] = useState(false); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try { await api.post("/auth/forgot-password", { email }); setSent(true); } catch (err) { setError(getError(err)); } finally { setBusy(false); }
  };
  return <AuthShell title="Reset your password" subtitle="We'll email you a link to choose a new one.">
    {sent ? <p className="success-note">If an account exists for <b>{email}</b>, a reset link is on its way. It expires in one hour.</p> :
      <form onSubmit={submit} className="form">
        <label>Email address<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"/></label>
        <ErrorNote>{error}</ErrorNote>
        <button className="button primary full" disabled={busy}>{busy ? "Sending..." : "Send reset link"}</button>
      </form>}
    <p className="form-foot"><Link to="/login">Back to log in</Link></p>
  </AuthShell>;
}

export function ResetPassword() {
  const [params] = useSearchParams(); const navigate = useNavigate();
  const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try { await api.post("/auth/reset-password", { token: params.get("token") || "", password }); navigate("/login", { replace: true }); }
    catch (err) { setError(getError(err)); setBusy(false); }
  };
  return <AuthShell title="Choose a new password" subtitle="Pick something you haven't used before.">
    <form onSubmit={submit} className="form">
      <label>New password<input type="password" minLength={8} required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}/><small className="hint">8+ characters with a letter and a number.</small></label>
      <ErrorNote>{error}</ErrorNote>
      <button className="button primary full" disabled={busy}>{busy ? "Saving..." : "Update password"}</button>
    </form>
  </AuthShell>;
}

export function VerifyEmail() {
  const [params] = useSearchParams(); const { setUser } = useAuth();
  const [state, setState] = useState({ loading: true, message: "" });
  useEffect(() => {
    api.post("/auth/verify-email", { token: params.get("token") || "" })
      .then(({ data }) => { setState({ loading: false, message: data.message }); setUser((u) => (u ? { ...u, emailVerified: true } : u)); })
      .catch((err) => setState({ loading: false, error: true, message: getError(err) }));
  }, [params, setUser]);
  return <AuthShell title="Email verification" subtitle={state.loading ? "Checking your link..." : state.message}>
    {!state.loading && <Link className="button primary full" to="/dashboard">Continue</Link>}
  </AuthShell>;
}
