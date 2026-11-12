import { useCallback, useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Heart, Download, Pencil, Trash2, MapPin, Send, FolderPlus, Calendar } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useCouple } from "../context/CoupleContext";
import { useToast } from "../context/ToastContext";
import { useMemoryActions } from "../hooks/useMemoryActions";
import { REACTIONS } from "../utils/constants";
import { dateInputToISO, fmtDate, getError, timeAgo, toDateInput } from "../utils/format";
import { Avatar } from "./ui";
import ConfirmDialog from "./ConfirmDialog";

/**
 * Full-screen viewer. `items` is the list currently on screen; the parent owns it and gets
 * onPatch / onRemove callbacks so grids stay in sync after favorite, edit or delete.
 */
export default function Lightbox({ items, index, onIndex, onClose, onPatch, onRemove }) {
  const { user } = useAuth();
  const { couple } = useCouple();
  const toast = useToast();
  const { toggleFavorite, moveToTrash, base } = useMemoryActions();
  const memory = items[index];

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [albums, setAlbums] = useState([]);

  const go = useCallback((delta) => {
    const next = index + delta;
    if (next >= 0 && next < items.length) { setEditing(false); onIndex(next); }
  }, [index, items.length, onIndex]);

  // keep the index valid after an item is removed
  useEffect(() => {
    if (!items.length) onClose();
    else if (index >= items.length) onIndex(items.length - 1);
  }, [items.length, index, onClose, onIndex]);

  useEffect(() => {
    const onKey = (e) => {
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName);
      if (e.key === "Escape" && !confirmDelete) onClose();
      if (!typing && e.key === "ArrowLeft") go(-1);
      if (!typing && e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [go, onClose, confirmDelete]);

  useEffect(() => {
    api.get(`/albums/${couple._id}`).then(({ data }) => setAlbums(data.albums)).catch(() => {});
  }, [couple._id]);

  useEffect(() => {
    if (!memory) return;
    setComments([]);
    api.get(`${base}/${memory._id}/comments`).then(({ data }) => setComments(data.comments)).catch(() => {});
  }, [memory?._id, base]);

  if (!memory) return null;
  const patch = (id, p) => onPatch(id, p);

  const startEdit = () => {
    setForm({ title: memory.title || "", caption: memory.caption || "", location: memory.location || "", tags: (memory.tags || []).join(", "), date: toDateInput(memory.takenAt), scope: memory.scope });
    setEditing(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { title: form.title, caption: form.caption, location: form.location, tags: form.tags, scope: form.scope };
      if (form.date && form.date !== toDateInput(memory.takenAt)) body.takenAt = dateInputToISO(form.date);
      const { data } = await api.patch(`${base}/${memory._id}`, body);
      patch(memory._id, data.memory);
      setEditing(false);
      toast.success("Memory updated.");
    } catch (err) { toast.error(getError(err, "Could not save changes.")); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    setDeleting(true);
    if (await moveToTrash(memory)) { setConfirmDelete(false); onRemove([memory._id]); }
    setDeleting(false);
  };

  const react = async (emoji) => {
    try {
      const { data } = await api.post(`${base}/${memory._id}/react`, { emoji });
      patch(memory._id, { reactions: data.reactions, myReaction: data.myReaction });
    } catch (err) { toast.error(getError(err)); }
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const { data } = await api.post(`${base}/${memory._id}/comments`, { text: commentText });
      setComments((c) => [...c, data.comment]);
      setCommentText("");
      patch(memory._id, { commentCount: (memory.commentCount || 0) + 1 });
    } catch (err) { toast.error(getError(err)); }
  };

  const removeComment = async (c) => {
    try {
      await api.delete(`${base}/${memory._id}/comments/${c._id}`);
      setComments((list) => list.filter((x) => x._id !== c._id));
      patch(memory._id, { commentCount: Math.max(0, (memory.commentCount || 1) - 1) });
    } catch (err) { toast.error(getError(err)); }
  };

  const inAlbums = albums.filter((a) => memory.albumIds?.includes(a._id));
  const otherAlbums = albums.filter((a) => !memory.albumIds?.includes(a._id));
  const changeAlbum = async (album, add) => {
    try {
      await (add
        ? api.post(`/albums/${couple._id}/${album._id}/memories`, { ids: [memory._id] })
        : api.delete(`/albums/${couple._id}/${album._id}/memories`, { data: { ids: [memory._id] } }));
      patch(memory._id, { albumIds: add ? [...(memory.albumIds || []), album._id] : memory.albumIds.filter((id) => id !== album._id) });
      toast.success(add ? `Added to “${album.name}”` : `Removed from “${album.name}”`);
    } catch (err) { toast.error(getError(err)); }
  };

  return <div className="lightbox" role="dialog" aria-modal="true" aria-label="Memory viewer">
    <div className="lb-stage" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <button className="lb-close" onClick={onClose} aria-label="Close"><X size={22}/></button>
      {index > 0 && <button className="lb-nav prev" onClick={() => go(-1)} aria-label="Previous"><ChevronLeft size={26}/></button>}
      {index < items.length - 1 && <button className="lb-nav next" onClick={() => go(1)} aria-label="Next"><ChevronRight size={26}/></button>}
      {memory.mediaType === "video"
        ? <video key={memory._id} src={memory.mediaUrl} controls autoPlay playsInline className="lb-media"/>
        : <img key={memory._id} src={memory.mediaUrl} alt={memory.title || memory.caption || "Memory"} className="lb-media"/>}
      <span className="lb-count">{index + 1} / {items.length}</span>
    </div>

    <aside className="lb-panel">
      <div className="lb-who"><Avatar user={memory.uploadedBy} size={34}/><div><strong>{memory.uploadedBy?.name}</strong><small>Added {timeAgo(memory.createdAt)} · {memory.scope === "shared" ? "Ours" : "Personal"}</small></div></div>

      {editing ? <form className="form lb-edit" onSubmit={save}>
        <label>Title<input value={form.title} maxLength={100} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Sunset in Goa"/></label>
        <label>Caption<textarea rows={3} maxLength={500} value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} placeholder="Tell the story..."/></label>
        <label>Location<input value={form.location} maxLength={100} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Where was this?"/></label>
        <label>Date taken<input type="date" max={toDateInput(new Date())} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}/></label>
        <label>Tags (comma separated)<input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="beach, birthday"/></label>
        <label>Visible in<select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}><option value="personal">Personal</option><option value="shared">Ours (shared)</option></select></label>
        <div className="row-gap"><button type="button" className="button secondary" onClick={() => setEditing(false)}>Cancel</button><button className="button primary" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button></div>
      </form> : <div className="lb-details">
        {memory.title && <h3>{memory.title}</h3>}
        {memory.caption ? <p>{memory.caption}</p> : !memory.title && <p className="muted">No caption yet.</p>}
        <div className="chips">
          <span className="chip"><Calendar size={12}/>{fmtDate(memory.takenAt, { day: "numeric", month: "long", year: "numeric" })}</span>
          {memory.location && <span className="chip"><MapPin size={12}/>{memory.location}</span>}
          {memory.tags?.map((t) => <span key={t} className="chip tag">#{t}</span>)}
        </div>
      </div>}

      <div className="lb-actions">
        <button className={`button secondary ${memory.isFavorite ? "active-fav" : ""}`} onClick={() => toggleFavorite(memory, patch)}><Heart size={15} fill={memory.isFavorite ? "currentColor" : "none"}/>{memory.isFavorite ? "Favorited" : "Favorite"}</button>
        <a className="button secondary" href={memory.downloadUrl} download><Download size={15}/>Download</a>
        {memory.isOwner && !editing && <>
          <button className="button secondary" onClick={startEdit}><Pencil size={15}/>Edit</button>
          <button className="button danger-soft" onClick={() => setConfirmDelete(true)}><Trash2 size={15}/>Delete</button>
        </>}
      </div>

      <div className="lb-section">
        <div className="lb-label">Reactions</div>
        <div className="reactions">{REACTIONS.map((emoji) => {
          const count = memory.reactions?.find((r) => r.emoji === emoji)?.count || 0;
          return <button key={emoji} className={`reaction ${memory.myReaction === emoji ? "on" : ""}`} onClick={() => react(emoji)} aria-pressed={memory.myReaction === emoji}>{emoji}{count > 0 && <b>{count}</b>}</button>;
        })}</div>
      </div>

      <div className="lb-section">
        <div className="lb-label">Albums</div>
        <div className="chips">
          {inAlbums.map((a) => <span key={a._id} className="chip album">{a.name}<button onClick={() => changeAlbum(a, false)} aria-label={`Remove from ${a.name}`}><X size={11}/></button></span>)}
          {otherAlbums.length > 0 && <label className="chip add"><FolderPlus size={12}/>
            <select value="" onChange={(e) => { const a = albums.find((x) => x._id === e.target.value); if (a) changeAlbum(a, true); }} aria-label="Add to album">
              <option value="">Add to album</option>{otherAlbums.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
            </select></label>}
          {!albums.length && <small className="muted">No albums yet. Create one from the Albums page.</small>}
        </div>
      </div>

      <div className="lb-section grow">
        <div className="lb-label">Comments ({comments.length})</div>
        <ul className="comments">
          {comments.map((c) => <li key={c._id}><Avatar user={c.author} size={26}/><div><b>{c.author?.name}</b> <small>{timeAgo(c.createdAt)}</small><p>{c.text}</p></div>
            {String(c.author?._id) === String(user.id) && <button className="icon-btn tiny" onClick={() => removeComment(c)} aria-label="Delete comment"><Trash2 size={13}/></button>}</li>)}
          {!comments.length && <li className="muted small">Be the first to say something sweet 💬</li>}
        </ul>
        <form className="comment-form" onSubmit={addComment}>
          <input value={commentText} maxLength={1000} onChange={(e) => setCommentText(e.target.value)} placeholder="Write a comment..."/>
          <button className="icon-btn send" disabled={!commentText.trim()} aria-label="Send"><Send size={16}/></button>
        </form>
      </div>
    </aside>

    {confirmDelete && <ConfirmDialog danger title="Move to Trash?" confirmLabel="Move to Trash" busy={deleting} onCancel={() => setConfirmDelete(false)} onConfirm={remove}
      message="This memory will be hidden from you and your partner. You can restore it from Trash within 30 days, after which it is permanently deleted."/>}
  </div>;
}
