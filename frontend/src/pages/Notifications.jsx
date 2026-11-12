import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import api from "../services/api";
import { Empty, PageHeader } from "../components/ui";
import { timeAgo } from "../utils/format";

const ICONS = { "partner-joined": "💞", "memory-added": "📸", comment: "💬", reaction: "❤️", event: "📅" };

export default function Notifications() {
  const { setUnread, refreshUnread } = useOutletContext();
  const navigate = useNavigate();
  const [items, setItems] = useState(null);

  useEffect(() => { api.get("/notifications").then(({ data }) => { setItems(data.notifications); setUnread(data.unread); }).catch(() => setItems([])); }, [setUnread]);

  const open = async (n) => {
    if (!n.read) { setItems((l) => l.map((x) => (x._id === n._id ? { ...x, read: true } : x))); api.patch(`/notifications/${n._id}/read`).then(refreshUnread).catch(() => {}); }
    if (n.link) navigate(n.link);
  };
  const markAll = async () => { await api.post("/notifications/read-all"); setItems((l) => l.map((x) => ({ ...x, read: true }))); setUnread(0); };
  const clear = async () => { await api.delete("/notifications"); setItems([]); setUnread(0); };
  const hasUnread = items?.some((n) => !n.read);

  return <section className="page narrow">
    <PageHeader eyebrow="YOUR SPACE" title="Notifications" subtitle="What's new between the two of you."
      actions={items?.length > 0 && <><button className="button secondary" onClick={markAll} disabled={!hasUnread}><CheckCheck size={15}/> Mark all read</button><button className="button ghost" onClick={clear}><Trash2 size={15}/> Clear</button></>}/>
    {items === null ? <div className="skeleton skeleton-banner tall"/> : items.length ? <ul className="notif-list">
      {items.map((n) => <li key={n._id}><button className={n.read ? "" : "unread"} onClick={() => open(n)}>
        <span className="emoji">{ICONS[n.type] || "💜"}</span><div><b>{n.message}</b><small>{timeAgo(n.createdAt)}</small></div>{!n.read && <i className="unread-dot" aria-label="Unread"/>}</button></li>)}
    </ul> : <Empty icon={Bell} title="You're all caught up" text="Invitations, new memories, comments and reactions will appear here."/>}
  </section>;
}
