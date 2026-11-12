import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, UploadCloud, Star, Heart, Trash2, FolderPlus, Users, X, CheckCheck, Images } from "lucide-react";
import api from "../services/api";
import { useCouple } from "../context/CoupleContext";
import { useDebounce } from "../hooks/useDebounce";
import { useMemories } from "../hooks/useMemories";
import { useMemoryActions } from "../hooks/useMemoryActions";
import MemoryGrid from "../components/MemoryGrid";
import Lightbox from "../components/Lightbox";
import UploadModal from "../components/UploadModal";
import AlbumPickerModal from "../components/AlbumPickerModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { Empty, PageHeader, SkeletonGrid, ErrorNote } from "../components/ui";

const TAB_PARAMS = {
  mine: { owner: "mine", scope: "personal" },
  hers: { owner: "partner", scope: "personal" },
  ours: { scope: "shared" }
};
const DEFAULT_FILTERS = { q: "", mediaType: "", sort: "newest", tag: "", favorite: false, from: "", to: "" };

export default function Gallery() {
  const { couple, partner } = useCouple();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TAB_PARAMS[searchParams.get("tab")] ? searchParams.get("tab") : "mine";
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const q = useDebounce(filters.q);
  const [tags, setTags] = useState([]);
  const [viewer, setViewer] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [albumPicker, setAlbumPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const params = useMemo(() => ({
    ...TAB_PARAMS[tab], q, mediaType: filters.mediaType, sort: filters.sort, tag: filters.tag,
    favorite: filters.favorite ? "true" : "", from: filters.from, to: filters.to, limit: 24
  }), [tab, q, filters.mediaType, filters.sort, filters.tag, filters.favorite, filters.from, filters.to]);

  const list = useMemories(couple._id, params);
  const { toggleFavorite, bulk } = useMemoryActions();
  const filtersActive = JSON.stringify({ ...filters, sort: "newest" }) !== JSON.stringify(DEFAULT_FILTERS);
  const partnerName = partner?.name?.split(" ")[0];
  const tabs = [["mine", "Mine"], ["hers", partnerName ? `${partnerName}'s` : "Partner's"], ["ours", "Ours"]];

  const loadTags = () => api.get(`/memories/${couple._id}/tags`).then(({ data }) => setTags(data.tags)).catch(() => {});
  useEffect(() => { loadTags(); }, [couple._id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setSelected(new Set()); setSelectMode(false); }, [tab]);

  const setTab = (id) => setSearchParams({ tab: id }, { replace: true });
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const toggleSelect = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const exitSelect = () => { setSelectMode(false); setSelected(new Set()); };

  const afterUpload = (_memories, scope) => {
    const target = scope === "shared" ? "ours" : "mine";
    if (target !== tab) setTab(target); else list.reload();
    loadTags();
  };

  const runBulk = async (action, extra) => {
    setBusy(true);
    const res = await bulk(action, [...selected], extra);
    setBusy(false);
    if (res) { exitSelect(); list.reload(); loadTags(); }
    setConfirmDelete(false);
  };

  return <section className="page">
    <PageHeader eyebrow="YOUR COLLECTION" title="Gallery" subtitle="All the moments, kept together."
      actions={<>
        <button className={`button secondary ${selectMode ? "active-fav" : ""}`} onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}><CheckCheck size={16}/>{selectMode ? "Done" : "Select"}</button>
        <button className="button primary" onClick={() => setUploadOpen(true)}><UploadCloud size={16}/> Add memories</button>
      </>}/>

    <div className="tabs">{tabs.map(([id, label]) => <button key={id} className={tab === id ? "tab active" : "tab"} onClick={() => setTab(id)}>{label}</button>)}</div>

    <div className="filter-bar">
      <label className="search"><Search size={15}/><input type="search" value={filters.q} onChange={(e) => set("q", e.target.value)} placeholder="Search captions, places, tags..." aria-label="Search memories"/></label>
      <select value={filters.mediaType} onChange={(e) => set("mediaType", e.target.value)} aria-label="Media type"><option value="">Photos &amp; videos</option><option value="image">Photos</option><option value="video">Videos</option></select>
      <select value={filters.sort} onChange={(e) => set("sort", e.target.value)} aria-label="Sort"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="uploaded">Recently added</option></select>
      <select value={filters.tag} onChange={(e) => set("tag", e.target.value)} aria-label="Tag"><option value="">All tags</option>{tags.map((t) => <option key={t.tag} value={t.tag}>#{t.tag} ({t.count})</option>)}</select>
      <label className="date-filter">From<input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => set("from", e.target.value)}/></label>
      <label className="date-filter">To<input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => set("to", e.target.value)}/></label>
      <button className={`button secondary ${filters.favorite ? "active-fav" : ""}`} onClick={() => set("favorite", !filters.favorite)} aria-pressed={filters.favorite}><Star size={15} fill={filters.favorite ? "currentColor" : "none"}/>Favorites</button>
      {filtersActive && <button className="button ghost" onClick={() => setFilters(DEFAULT_FILTERS)}><X size={14}/>Clear</button>}
    </div>

    <ErrorNote>{list.error}</ErrorNote>
    {list.loading ? <SkeletonGrid/> : list.items.length ? <>
      <p className="result-count">{list.total} {list.total === 1 ? "memory" : "memories"}{filtersActive ? " match your filters" : ""}</p>
      <MemoryGrid items={list.items} onOpen={setViewer} onFavorite={(m) => toggleFavorite(m, list.patchItem)} selectMode={selectMode} selected={selected} onSelect={toggleSelect}/>
      {list.hasMore && <div className="load-more"><button className="button secondary" onClick={list.loadMore} disabled={list.loadingMore}>{list.loadingMore ? "Loading..." : "Load more"}</button></div>}
    </> : <Empty icon={filtersActive ? Search : Images} title={filtersActive ? "Nothing matches those filters" : `No memories in ${tabs.find(([id]) => id === tab)[1]} yet`}
      text={filtersActive ? "Try a different search or clear the filters." : "When photos or videos are uploaded, they'll appear here."}
      action={!filtersActive && <button className="button primary" onClick={() => setUploadOpen(true)}><UploadCloud size={16}/> Upload the first one</button>}/>}

    {selectMode && <div className="selection-bar" role="toolbar" aria-label="Bulk actions">
      <b>{selected.size} selected</b>
      <button className="button secondary" disabled={!selected.size || busy} onClick={() => runBulk("favorite")}><Heart size={15}/>Favorite</button>
      <button className="button secondary" disabled={!selected.size || busy} onClick={() => setAlbumPicker(true)}><FolderPlus size={15}/>Album</button>
      <button className="button secondary" disabled={!selected.size || busy} onClick={() => runBulk("scope", { scope: tab === "ours" ? "personal" : "shared" })}><Users size={15}/>{tab === "ours" ? "Make personal" : "Share to Ours"}</button>
      <button className="button danger" disabled={!selected.size || busy} onClick={() => setConfirmDelete(true)}><Trash2 size={15}/>Delete</button>
      <button className="icon-btn" onClick={exitSelect} aria-label="Cancel selection"><X size={17}/></button>
    </div>}

    {viewer !== null && <Lightbox items={list.items} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} onPatch={list.patchItem} onRemove={(ids) => { list.removeItems(ids); loadTags(); }}/>}
    {uploadOpen && <UploadModal defaultScope={tab === "ours" ? "shared" : "personal"} onClose={() => setUploadOpen(false)} onUploaded={afterUpload}/>}
    {albumPicker && <AlbumPickerModal ids={[...selected]} onClose={() => setAlbumPicker(false)} onDone={exitSelect}/>}
    {confirmDelete && <ConfirmDialog danger title={`Delete ${selected.size} ${selected.size === 1 ? "memory" : "memories"}?`} confirmLabel="Move to Trash" busy={busy} onCancel={() => setConfirmDelete(false)} onConfirm={() => runBulk("delete")}
      message="They move to Trash for 30 days and can be restored. Memories uploaded by your partner are skipped."/>}
  </section>;
}
