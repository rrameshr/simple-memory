import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FolderHeart, Plus, ArrowLeft, Pencil, Trash2, ImagePlus, X, Image as ImageIcon } from "lucide-react";
import api from "../services/api";
import { useCouple } from "../context/CoupleContext";
import { useToast } from "../context/ToastContext";
import { useMemories } from "../hooks/useMemories";
import { useMemoryActions } from "../hooks/useMemoryActions";
import MemoryGrid from "../components/MemoryGrid";
import Lightbox from "../components/Lightbox";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { Empty, PageHeader, SkeletonGrid, ErrorNote } from "../components/ui";
import { getError } from "../utils/format";

function AlbumForm({ album, onClose, onSaved }) {
  const { couple } = useCouple();
  const toast = useToast();
  const [form, setForm] = useState({ name: album?.name || "", description: album?.description || "" });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const { data } = album ? await api.patch(`/albums/${couple._id}/${album._id}`, form) : await api.post(`/albums/${couple._id}`, form);
      toast.success(album ? "Album updated." : "Album created."); onSaved(data.album); onClose();
    } catch (err) { toast.error(getError(err)); setBusy(false); }
  };
  return <Modal title={album ? "Edit album" : "New album"} onClose={onClose}>
    <form className="form" onSubmit={submit}>
      <label>Name<input value={form.name} maxLength={80} required autoFocus onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Goa 2026, Anniversaries"/></label>
      <label>Description (optional)<textarea rows={3} maxLength={300} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/></label>
      <div className="row-gap end"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy || !form.name.trim()}>{busy ? "Saving..." : "Save"}</button></div>
    </form>
  </Modal>;
}

export function Albums() {
  const { couple } = useCouple();
  const [albums, setAlbums] = useState(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const load = () => api.get(`/albums/${couple._id}`).then(({ data }) => setAlbums(data.albums)).catch((e) => { setError(getError(e)); setAlbums([]); });
  useEffect(() => { load(); }, [couple._id]); // eslint-disable-line react-hooks/exhaustive-deps

  return <section className="page">
    <PageHeader eyebrow="YOUR SPACE" title="Albums" subtitle="Collections for trips, birthdays, anniversaries and everyday moments."
      actions={<button className="button primary" onClick={() => setCreating(true)}><Plus size={16}/> New album</button>}/>
    <ErrorNote>{error}</ErrorNote>
    {albums === null ? <SkeletonGrid count={3}/> : albums.length ? <div className="album-grid">
      {albums.map((a) => <Link key={a._id} to={`/albums/${a._id}`} className="album-card">
        <div className="album-cover">{a.coverUrl ? <img src={a.coverUrl} alt="" loading="lazy"/> : <ImageIcon size={30}/>}</div>
        <div className="album-info"><b>{a.name}</b><small>{a.count} {a.count === 1 ? "memory" : "memories"}</small></div>
      </Link>)}
    </div> : <Empty icon={FolderHeart} title="No albums yet" text="Group your favourite memories into albums like “Goa trip” or “First year”."
      action={<button className="button primary" onClick={() => setCreating(true)}><Plus size={16}/> Create an album</button>}/>}
    {creating && <AlbumForm onClose={() => setCreating(false)} onSaved={load}/>}
  </section>;
}

function MemoryPicker({ album, onClose, onAdded }) {
  const { couple } = useCouple();
  const toast = useToast();
  const list = useMemories(couple._id, { sort: "newest", limit: 36 });
  const [picked, setPicked] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const candidates = list.items.filter((m) => !m.albumIds?.includes(album._id));
  const toggle = (id) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const add = async () => {
    setBusy(true);
    try { await api.post(`/albums/${couple._id}/${album._id}/memories`, { ids: [...picked] }); toast.success(`Added ${picked.size} to the album.`); onAdded(); onClose(); }
    catch (e) { toast.error(getError(e)); setBusy(false); }
  };
  return <Modal wide title={`Add to “${album.name}”`} onClose={onClose} footer={<><button className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={!picked.size || busy} onClick={add}>{busy ? "Adding..." : `Add ${picked.size || ""}`}</button></>}>
    {list.loading ? <SkeletonGrid count={6}/> : candidates.length ? <>
      <MemoryGrid items={candidates} onOpen={() => {}} selectMode selected={picked} onSelect={toggle}/>
      {list.hasMore && <div className="load-more"><button className="button secondary" onClick={list.loadMore} disabled={list.loadingMore}>Load more</button></div>}
    </> : <p className="muted">Everything is already in this album.</p>}
  </Modal>;
}

export function AlbumDetail() {
  const { albumId } = useParams();
  const { couple } = useCouple();
  const toast = useToast();
  const navigate = useNavigate();
  const [album, setAlbum] = useState(null);
  const [missing, setMissing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [picking, setPicking] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const params = useMemo(() => ({ album: albumId, sort: "newest", limit: 24 }), [albumId]);
  const list = useMemories(couple._id, params);
  const { toggleFavorite } = useMemoryActions();

  const loadAlbum = () => api.get(`/albums/${couple._id}/${albumId}`).then(({ data }) => setAlbum(data.album)).catch(() => setMissing(true));
  useEffect(() => { loadAlbum(); }, [albumId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSelect = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const exitSelect = () => { setSelectMode(false); setSelected(new Set()); };
  const refreshAll = () => { list.reload(); loadAlbum(); };

  const removeSelected = async () => {
    try { await api.delete(`/albums/${couple._id}/${albumId}/memories`, { data: { ids: [...selected] } }); toast.success("Removed from album. The memories themselves are kept."); exitSelect(); refreshAll(); }
    catch (e) { toast.error(getError(e)); }
  };
  const setCover = async () => {
    try { await api.patch(`/albums/${couple._id}/${albumId}`, { coverMemory: [...selected][0] }); toast.success("Cover updated."); exitSelect(); loadAlbum(); }
    catch (e) { toast.error(getError(e)); }
  };
  const deleteAlbum = async () => {
    try { await api.delete(`/albums/${couple._id}/${albumId}`); toast.success("Album deleted."); navigate("/albums"); }
    catch (e) { toast.error(getError(e)); }
  };

  if (missing) return <section className="page"><Empty title="Album not found" text="It may have been deleted." action={<Link className="button primary" to="/albums">Back to albums</Link>}/></section>;
  if (!album) return <div className="skeleton skeleton-banner"/>;

  return <section className="page">
    <Link to="/albums" className="back-link"><ArrowLeft size={15}/> All albums</Link>
    <PageHeader eyebrow="ALBUM" title={album.name} subtitle={album.description || `${album.count} ${album.count === 1 ? "memory" : "memories"}`}
      actions={<>
        <button className="button primary" onClick={() => setPicking(true)}><ImagePlus size={16}/> Add memories</button>
        <button className={`button secondary ${selectMode ? "active-fav" : ""}`} onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}>{selectMode ? "Done" : "Select"}</button>
        <button className="icon-btn" onClick={() => setEditing(true)} aria-label="Edit album"><Pencil size={17}/></button>
        <button className="icon-btn danger" onClick={() => setConfirmDelete(true)} aria-label="Delete album"><Trash2 size={17}/></button>
      </>}/>
    <ErrorNote>{list.error}</ErrorNote>
    {list.loading ? <SkeletonGrid/> : list.items.length ? <>
      <MemoryGrid items={list.items} onOpen={setViewer} onFavorite={(m) => toggleFavorite(m, list.patchItem)} selectMode={selectMode} selected={selected} onSelect={toggleSelect}/>
      {list.hasMore && <div className="load-more"><button className="button secondary" onClick={list.loadMore} disabled={list.loadingMore}>{list.loadingMore ? "Loading..." : "Load more"}</button></div>}
    </> : <Empty icon={FolderHeart} title="This album is empty" text="Add memories from your gallery." action={<button className="button primary" onClick={() => setPicking(true)}><ImagePlus size={16}/> Add memories</button>}/>}

    {selectMode && <div className="selection-bar"><b>{selected.size} selected</b>
      <button className="button secondary" disabled={selected.size !== 1} onClick={setCover}>Set as cover</button>
      <button className="button danger-soft" disabled={!selected.size} onClick={removeSelected}>Remove from album</button>
      <button className="icon-btn" onClick={exitSelect} aria-label="Cancel"><X size={17}/></button></div>}

    {viewer !== null && <Lightbox items={list.items} index={viewer} onIndex={setViewer} onClose={() => { setViewer(null); loadAlbum(); }} onPatch={list.patchItem} onRemove={(ids) => { list.removeItems(ids); loadAlbum(); }}/>}
    {picking && <MemoryPicker album={album} onClose={() => setPicking(false)} onAdded={refreshAll}/>}
    {editing && <AlbumForm album={album} onClose={() => setEditing(false)} onSaved={setAlbum}/>}
    {confirmDelete && <ConfirmDialog danger title="Delete this album?" confirmLabel="Delete album" onCancel={() => setConfirmDelete(false)} onConfirm={deleteAlbum} message="Only the album is removed. All of its photos and videos stay in your gallery."/>}
  </section>;
}
