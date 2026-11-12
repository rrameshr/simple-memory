import { useEffect, useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import api from "../services/api";
import { useCouple } from "../context/CoupleContext";
import { useToast } from "../context/ToastContext";
import ConfirmDialog from "../components/ConfirmDialog";
import { Empty, PageHeader, SkeletonGrid } from "../components/ui";
import { fmtDate, getError } from "../utils/format";

const daysLeft = (purgeAt) => Math.max(0, Math.ceil((new Date(purgeAt) - Date.now()) / 86_400_000));

export default function Trash() {
  const { couple } = useCouple();
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [days, setDays] = useState(30);
  const [confirm, setConfirm] = useState(null); // { type: "one" | "all", memory? }
  const [busy, setBusy] = useState(false);
  const base = `/memories/${couple._id}`;

  useEffect(() => { api.get(`${base}/trash`).then(({ data }) => { setItems(data.memories); setDays(data.retentionDays); }).catch(() => setItems([])); }, [base]);

  const restore = async (m) => {
    try { await api.post(`${base}/${m._id}/restore`); setItems((l) => l.filter((x) => x._id !== m._id)); toast.success("Memory restored."); }
    catch (e) { toast.error(getError(e)); }
  };
  const destroy = async () => {
    setBusy(true);
    try {
      if (confirm.type === "all") { await api.delete(`${base}/trash`); setItems([]); toast.success("Trash emptied."); }
      else { await api.delete(`${base}/${confirm.memory._id}/permanent`); setItems((l) => l.filter((x) => x._id !== confirm.memory._id)); toast.success("Permanently deleted."); }
      setConfirm(null);
    } catch (e) { toast.error(getError(e)); }
    setBusy(false);
  };

  return <section className="page">
    <PageHeader eyebrow="YOUR SPACE" title="Trash" subtitle={`Deleted memories stay here for ${days} days, then are removed forever. Only you can see yours.`}
      actions={items?.length > 0 && <button className="button danger-soft" onClick={() => setConfirm({ type: "all" })}><Trash2 size={15}/> Empty Trash</button>}/>
    {items === null ? <SkeletonGrid count={3}/> : items.length ? <div className="memory-grid">
      {items.map((m) => <article key={m._id} className="memory-tile">
        <div className="tile-media static">{m.mediaType === "video" && m.thumbUrl === m.mediaUrl ? <video src={m.mediaUrl} preload="metadata" muted/> : <img src={m.thumbUrl} alt="" loading="lazy"/>}</div>
        <div className="memory-caption"><span>{m.title || m.caption || "A little moment"}</span><small>{daysLeft(m.purgeAt)}d left</small></div>
        <div className="tile-actions"><button className="button secondary" onClick={() => restore(m)}><RotateCcw size={14}/> Restore</button><button className="button danger-soft" onClick={() => setConfirm({ type: "one", memory: m })}><Trash2 size={14}/> Delete</button></div>
        <div className="tile-meta"><span>Deleted {fmtDate(m.deletedAt)}</span></div>
      </article>)}
    </div> : <Empty icon={Trash2} title="Trash is empty" text="Anything you delete will wait here before it's gone for good."/>}
    {confirm && <ConfirmDialog danger busy={busy} title={confirm.type === "all" ? "Empty Trash?" : "Delete forever?"} confirmLabel="Delete forever" onCancel={() => setConfirm(null)} onConfirm={destroy}
      message={confirm.type === "all" ? `All ${items.length} memories in Trash will be permanently deleted. This can't be undone.` : "This memory will be permanently deleted. This can't be undone."}/>}
  </section>;
}
