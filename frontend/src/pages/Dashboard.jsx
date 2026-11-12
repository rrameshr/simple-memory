import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ImagePlus, Images, Video, Star, HardDrive, UploadCloud, CalendarHeart, History } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useCouple } from "../context/CoupleContext";
import { useMemoryActions } from "../hooks/useMemoryActions";
import MemoryGrid from "../components/MemoryGrid";
import Lightbox from "../components/Lightbox";
import { Avatar, Empty } from "../components/ui";
import { eventMeta } from "../utils/constants";
import { daysSince, fmtBytes, fmtDay } from "../utils/format";

function Stat({ icon: Icon, label, value }) {
  return <div className="stat-card"><div className="stat-icon"><Icon size={19}/></div><div><strong>{value}</strong><span>{label}</span></div></div>;
}

const countdown = (d) => (d === 0 ? "Today 🎉" : d === 1 ? "Tomorrow" : `in ${d} days`);

export default function Dashboard() {
  const { user } = useAuth();
  const { couple, partner } = useCouple();
  const { toggleFavorite } = useMemoryActions();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [viewer, setViewer] = useState(null); // { list: "recent" | "otd", index }

  useEffect(() => {
    const id = couple._id;
    Promise.allSettled([
      api.get(`/memories/${id}/stats`), api.get(`/memories/${id}`, { params: { limit: 6, sort: "newest" } }), api.get(`/events/${id}/upcoming`, { params: { days: 60 } })
    ]).then(([s, r, u]) => {
      if (s.status === "fulfilled") setStats(s.value.data);
      if (r.status === "fulfilled") setRecent(r.value.data.memories);
      if (u.status === "fulfilled") setUpcoming(u.value.data.upcoming);
    });
  }, [couple._id]);

  const patchIn = (setter) => (id, p) => setter((list) => list.map((m) => (m._id === id ? { ...m, ...p } : m)));
  const patchRecent = patchIn(setRecent);
  const patchOtd = (id, p) => setStats((s) => ({ ...s, onThisDay: s.onThisDay.map((m) => (m._id === id ? { ...m, ...p } : m)) }));
  const viewerItems = viewer?.list === "otd" ? stats?.onThisDay || [] : recent;
  const viewerPatch = viewer?.list === "otd" ? patchOtd : patchRecent;
  const removeFromViewer = (ids) => {
    if (viewer?.list === "otd") setStats((s) => ({ ...s, onThisDay: s.onThisDay.filter((m) => !ids.includes(m._id)) }));
    else setRecent((r) => r.filter((m) => !ids.includes(m._id)));
  };

  const t = stats?.totals;
  const monthMax = Math.max(1, ...(stats?.uploadsByMonth.map((m) => m.count) || [1]));

  return <section className="page">
    <div className="welcome-row"><div><div className="eyebrow">YOUR PRIVATE CORNER</div><h1>Welcome, {user?.name?.split(" ")[0]} <span className="pink">♡</span></h1><p className="muted">A little place for all the moments that matter.</p></div>
      <Link to="/gallery" className="button primary"><UploadCloud size={17}/> Add memories</Link></div>

    <div className="hero-banner">
      <div>
        <span className="eyebrow light-text">{couple.anniversary ? "TOGETHER FOR" : "MADE FOR YOUR MOMENTS"}</span>
        <h2>{couple.anniversary ? `${daysSince(couple.anniversary).toLocaleString()} days` : couple.name}</h2>
        <p>{couple.anniversary ? `${couple.name} · since ${fmtDay(couple.anniversary)}` : <>Add your anniversary in <Link className="light-link" to="/settings">Settings</Link> to count the days together.</>}</p>
      </div>
      <div className="hero-people"><Avatar user={user} size={52}/><Heart size={22} fill="currentColor"/><Avatar user={partner} size={52}/></div>
    </div>

    <div className="stats-grid five">
      <Stat icon={Images} label="Total memories" value={t?.total ?? "–"}/>
      <Stat icon={ImagePlus} label="Photos" value={t?.photos ?? "–"}/>
      <Stat icon={Video} label="Videos" value={t?.videos ?? "–"}/>
      <Stat icon={Star} label="Your favorites" value={stats?.favorites ?? "–"}/>
      <Stat icon={HardDrive} label="Storage used" value={t ? fmtBytes(t.storageBytes) : "–"}/>
    </div>

    <div className="dash-cols">
      <div className="panel">
        <div className="panel-title"><h3><CalendarHeart size={18}/> Coming up</h3><Link to="/dates">All dates →</Link></div>
        {upcoming.length ? <ul className="upcoming">{upcoming.slice(0, 4).map((e) => <li key={e.id}>
          <span className="emoji">{eventMeta(e.type).emoji}</span>
          <div><b>{e.title}{e.years ? ` · ${e.years} ${e.years === 1 ? "year" : "years"}` : ""}</b><small>{fmtDay(e.nextDate)}</small></div>
          <span className={`when ${e.daysAway <= 7 ? "soon" : ""}`}>{countdown(e.daysAway)}</span></li>)}</ul>
          : <p className="muted">Nothing in the next 60 days. <Link to="/dates">Add a special date</Link>.</p>}
      </div>
      <div className="panel">
        <div className="panel-title"><h3>Uploads by month</h3></div>
        {stats?.uploadsByMonth.length ? <div className="bars" role="img" aria-label="Memories per month">{stats.uploadsByMonth.map((m) => <div key={m.month} className="bar"><span style={{ height: `${(m.count / monthMax) * 100}%` }} title={`${m.count}`}/><small>{m.month.slice(5)}</small></div>)}</div>
          : <p className="muted">Your activity will show up here.</p>}
        {stats?.topTags.length > 0 && <div className="chips" style={{ marginTop: 14 }}>{stats.topTags.slice(0, 8).map((x) => <Link key={x.tag} to={`/gallery?tab=ours`} className="chip tag">#{x.tag} <b>{x.count}</b></Link>)}</div>}
      </div>
    </div>

    {stats?.onThisDay.length > 0 && <>
      <div className="section-heading"><div><h2><History size={20} style={{ verticalAlign: "-3px" }}/> On this day</h2><p className="muted">Memories from this date in past years.</p></div></div>
      <MemoryGrid items={stats.onThisDay} onOpen={(i) => setViewer({ list: "otd", index: i })} onFavorite={(m) => toggleFavorite(m, patchOtd)}/>
    </>}

    <div className="section-heading"><div><h2>Recent memories</h2><p className="muted">The latest moments you've saved.</p></div><Link to="/gallery">View gallery →</Link></div>
    {recent.length ? <MemoryGrid items={recent} onOpen={(i) => setViewer({ list: "recent", index: i })} onFavorite={(m) => toggleFavorite(m, patchRecent)}/>
      : <Empty title="Your gallery is waiting" text="Upload your first photo or video to get started." action={<Link to="/gallery" className="button primary">Add memories</Link>}/>}

    {viewer && <Lightbox items={viewerItems} index={viewer.index} onIndex={(i) => setViewer((v) => ({ ...v, index: i }))} onClose={() => setViewer(null)} onPatch={viewerPatch} onRemove={removeFromViewer}/>}
  </section>;
}
