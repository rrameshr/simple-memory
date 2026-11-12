import { useEffect, useState } from "react";
import api from "../services/api";
import { useCouple } from "../context/CoupleContext";
import { useToast } from "../context/ToastContext";
import { getError } from "../utils/format";
import Modal from "./Modal";

/** Choose an existing album (or create one) and add the given memory ids to it. */
export default function AlbumPickerModal({ ids, onClose, onDone }) {
  const { couple } = useCouple();
  const toast = useToast();
  const [albums, setAlbums] = useState(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get(`/albums/${couple._id}`).then(({ data }) => setAlbums(data.albums)).catch(() => setAlbums([])); }, [couple._id]);

  const add = async (album) => {
    setBusy(true);
    try {
      await api.post(`/albums/${couple._id}/${album._id}/memories`, { ids });
      toast.success(`Added ${ids.length} to “${album.name}”`);
      onDone?.(album);
      onClose();
    } catch (e) { toast.error(getError(e)); setBusy(false); }
  };
  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try { const { data } = await api.post(`/albums/${couple._id}`, { name }); await add(data.album); }
    catch (err) { toast.error(getError(err)); setBusy(false); }
  };

  return <Modal title={`Add ${ids.length} to album`} onClose={onClose}>
    {albums === null ? <div className="skeleton skeleton-banner"/> : <ul className="pick-list">
      {albums.map((a) => <li key={a._id}><button disabled={busy} onClick={() => add(a)}><span>{a.name}</span><small>{a.count} memories</small></button></li>)}
      {!albums.length && <li className="muted small">No albums yet. Create your first one below.</li>}
    </ul>}
    <form className="row-gap" onSubmit={create}>
      <input className="grow-input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="New album name"/>
      <button className="button primary" disabled={busy || !name.trim()}>Create &amp; add</button>
    </form>
  </Modal>;
}
