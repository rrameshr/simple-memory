import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarHeart, Plus, Pencil, Trash2, Repeat } from "lucide-react";
import api from "../services/api";
import { useCouple } from "../context/CoupleContext";
import { useToast } from "../context/ToastContext";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { Empty, PageHeader } from "../components/ui";
import { EVENT_TYPES, eventMeta } from "../utils/constants";
import { fmtDay, getError, utcDateInput } from "../utils/format";

const countdown = (d) => (d === 0 ? "Today 🎉" : d === 1 ? "Tomorrow" : `in ${d} days`);

function EventForm({ event, onClose, onSaved }) {
  const { couple } = useCouple();
  const toast = useToast();
  const [form, setForm] = useState({
    title: event?.title || "", date: event ? utcDateInput(event.date) : "", type: event?.type || "other", recurring: event?.recurring ?? true, notes: event?.notes || ""
  });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      event ? await api.patch(`/events/${couple._id}/${event._id}`, form) : await api.post(`/events/${couple._id}`, form);
      toast.success(event ? "Date updated." : "Date added 💜"); onSaved(); onClose();
    } catch (err) { toast.error(getError(err)); setBusy(false); }
  };
  return <Modal title={event ? "Edit date" : "Add a special date"} onClose={onClose}>
    <form className="form" onSubmit={submit}>
      <label>Title<input required autoFocus maxLength={100} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. First date, Trip to Ooty"/></label>
      <div className="grid-2">
        <label>Date<input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}/></label>
        <label>Type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{EVENT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}</select></label>
      </div>
      <label className="check-row"><input type="checkbox" checked={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })}/> Repeats every year</label>
      <label>Notes (optional)<textarea rows={3} maxLength={500} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}/></label>
      <div className="row-gap end"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy ? "Saving..." : "Save"}</button></div>
    </form>
  </Modal>;
}

export default function Dates() {
  const { couple } = useCouple();
  const toast = useToast();
  const [events, setEvents] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [form, setForm] = useState(null); // null | "new" | event
  const [deleting, setDeleting] = useState(null);

  const load = () => Promise.all([api.get(`/events/${couple._id}`), api.get(`/events/${couple._id}/upcoming`, { params: { days: 366 } })])
    .then(([e, u]) => { setEvents(e.data.events); setUpcoming(u.data.upcoming); }).catch(() => setEvents([]));
  useEffect(() => { load(); }, [couple._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async () => {
    try { await api.delete(`/events/${couple._id}/${deleting._id}`); toast.success("Date removed."); setDeleting(null); load(); }
    catch (e) { toast.error(getError(e)); }
  };

  return <section className="page">
    <PageHeader eyebrow="YOUR SPACE" title="Our dates" subtitle="Anniversaries, birthdays, trips and every day worth remembering."
      actions={<button className="button primary" onClick={() => setForm("new")}><Plus size={16}/> Add date</button>}/>

    {events === null ? <div className="skeleton skeleton-banner tall"/> : <>
      <div className="section-heading"><h2>Coming up</h2></div>
      {upcoming.length ? <div className="event-grid">{upcoming.slice(0, 6).map((e) => <div key={e.id} className={`event-card ${e.daysAway <= 7 ? "soon" : ""}`}>
        <span className="emoji">{eventMeta(e.type).emoji}</span>
        <b>{e.title}{e.years ? ` · ${e.years}${e.years === 1 ? " year" : " years"}` : ""}</b>
        <small>{fmtDay(e.nextDate, { weekday: "short" })}</small>
        <span className="when">{countdown(e.daysAway)}</span></div>)}</div>
        : <p className="muted">Nothing coming up in the next year. Add your anniversary and birthdays in <Link to="/settings">Settings</Link>, or add a date here.</p>}

      <div className="section-heading" style={{ marginTop: 34 }}><h2>All saved dates</h2></div>
      {events.length ? <ul className="event-list">{events.map((e) => <li key={e._id}>
        <span className="emoji">{eventMeta(e.type).emoji}</span>
        <div><b>{e.title}</b><small>{fmtDay(e.date)}{e.recurring && <> · <Repeat size={11}/> yearly</>}</small>{e.notes && <p>{e.notes}</p>}</div>
        <button className="icon-btn" onClick={() => setForm(e)} aria-label={`Edit ${e.title}`}><Pencil size={16}/></button>
        <button className="icon-btn danger" onClick={() => setDeleting(e)} aria-label={`Delete ${e.title}`}><Trash2 size={16}/></button></li>)}</ul>
        : <Empty icon={CalendarHeart} title="No dates saved yet" text="Save your first date, your anniversary, a trip or a milestone." action={<button className="button primary" onClick={() => setForm("new")}><Plus size={16}/> Add a date</button>}/>}
    </>}

    {form && <EventForm event={form === "new" ? null : form} onClose={() => setForm(null)} onSaved={load}/>}
    {deleting && <ConfirmDialog danger title="Remove this date?" confirmLabel="Remove" onCancel={() => setDeleting(null)} onConfirm={remove} message={`“${deleting.title}” will be removed for both of you.`}/>}
  </section>;
}
