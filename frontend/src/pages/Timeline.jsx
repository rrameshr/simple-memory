import { useMemo, useState } from "react";
import { CalendarDays, MapPin, Play } from "lucide-react";
import { useCouple } from "../context/CoupleContext";
import { useMemories } from "../hooks/useMemories";
import Lightbox from "../components/Lightbox";
import { Empty, PageHeader, ErrorNote } from "../components/ui";
import { fmtDate, groupByMonth } from "../utils/format";

export default function Timeline() {
  const { couple } = useCouple();
  const [scope, setScope] = useState("");
  const params = useMemo(() => ({ sort: "newest", scope, limit: 60 }), [scope]);
  const list = useMemories(couple._id, params);
  const [viewer, setViewer] = useState(null);
  const groups = useMemo(() => groupByMonth(list.items), [list.items]);
  const indexOf = (id) => list.items.findIndex((m) => m._id === id);

  return <section className="page">
    <PageHeader eyebrow="YOUR STORY" title="Timeline" subtitle="Your memories in the order they happened."
      actions={<div className="seg compact">{[["", "All"], ["shared", "Ours"], ["personal", "Personal"]].map(([v, l]) => <button key={v} className={scope === v ? "on" : ""} onClick={() => setScope(v)}>{l}</button>)}</div>}/>
    <ErrorNote>{list.error}</ErrorNote>
    {list.loading ? <div className="skeleton skeleton-banner tall"/> : groups.length ? <div className="timeline">
      {groups.map((g) => <div key={g.label} className="tl-group">
        <h2 className="tl-month">{g.label}<small>{g.items.length}</small></h2>
        {g.items.map((m) => <button key={m._id} className="tl-item" onClick={() => setViewer(indexOf(m._id))}>
          <span className="tl-dot"/>
          <div className="tl-thumb">{m.mediaType === "video" && m.thumbUrl === m.mediaUrl ? <video src={m.mediaUrl} preload="metadata" muted/> : <img src={m.thumbUrl} alt="" loading="lazy"/>}{m.mediaType === "video" && <span className="play-badge"><Play size={11} fill="currentColor"/></span>}</div>
          <div className="tl-text"><b>{m.title || m.caption || "A little moment"}</b>
            <small>{fmtDate(m.takenAt, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}{m.location && <> · <MapPin size={11}/> {m.location}</>}</small>
            {m.title && m.caption && <p>{m.caption}</p>}</div>
        </button>)}
      </div>)}
      {list.hasMore && <div className="load-more"><button className="button secondary" onClick={list.loadMore} disabled={list.loadingMore}>{list.loadingMore ? "Loading..." : "Load earlier memories"}</button></div>}
    </div> : <Empty icon={CalendarDays} title="Your timeline is empty" text="Upload memories and they'll line up here by the date they were taken."/>}
    {viewer !== null && <Lightbox items={list.items} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} onPatch={list.patchItem} onRemove={list.removeItems}/>}
  </section>;
}
