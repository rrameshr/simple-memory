import { useEffect, useRef, useState } from "react";
import { UploadCloud, X, Film, Image as ImageIcon } from "lucide-react";
import api from "../services/api";
import { useCouple } from "../context/CoupleContext";
import { useToast } from "../context/ToastContext";
import { MAX_FILES, MAX_FILE_MB } from "../utils/constants";
import { dateInputToISO, fmtBytes, getError, toDateInput } from "../utils/format";
import Modal from "./Modal";
import { ErrorNote } from "./ui";

export default function UploadModal({ defaultScope = "personal", onClose, onUploaded }) {
  const { couple } = useCouple();
  const toast = useToast();
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]); // [{ id, file, preview }]
  const [scope, setScope] = useState(defaultScope);
  const [meta, setMeta] = useState({ title: "", caption: "", location: "", tags: "", date: "" });
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = (list) => {
    const incoming = Array.from(list);
    const problems = [];
    const accepted = [];
    for (const file of incoming) {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) problems.push(`${file.name}: only images and videos are supported`);
      else if (file.size > MAX_FILE_MB * 1024 * 1024) problems.push(`${file.name}: larger than ${MAX_FILE_MB} MB`);
      else accepted.push({ id: `${file.name}-${file.size}-${file.lastModified}`, file, preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "" });
    }
    setFiles((prev) => {
      const merged = [...prev, ...accepted.filter((a) => !prev.some((p) => p.id === a.id))];
      if (merged.length > MAX_FILES) problems.push(`You can upload up to ${MAX_FILES} files at a time`);
      return merged.slice(0, MAX_FILES);
    });
    setError(problems.join(". "));
  };

  const removeFile = (id) => setFiles((prev) => { const f = prev.find((x) => x.id === id); if (f?.preview) URL.revokeObjectURL(f.preview); return prev.filter((x) => x.id !== id); });

  const submit = async (e) => {
    e.preventDefault();
    if (!files.length) return;
    setBusy(true); setError(""); setProgress(0);
    const body = new FormData();
    files.forEach((f) => body.append("files", f.file));
    body.append("scope", scope);
    ["title", "caption", "location", "tags"].forEach((k) => meta[k] && body.append(k, meta[k]));
    if (meta.date) body.append("takenAt", dateInputToISO(meta.date));
    else body.append("lastModified", JSON.stringify(files.map((f) => f.file.lastModified))); // use each photo's own date
    try {
      const { data } = await api.post(`/memories/${couple._id}`, body, {
        headers: { "Content-Type": "multipart/form-data" }, timeout: 0,
        onUploadProgress: (ev) => ev.total && setProgress(Math.round((ev.loaded / ev.total) * 100))
      });
      if (data.failed?.length) toast.error(`${data.failed.length} file(s) failed: ${data.failed.map((f) => f.name).join(", ")}`);
      toast.success(`${data.memories.length} ${data.memories.length === 1 ? "memory" : "memories"} added ❤️`);
      onUploaded(data.memories, scope);
      onClose();
    } catch (err) {
      setError(getError(err, "Upload failed. Check your connection and Cloudinary settings."));
      setBusy(false);
    }
  };

  const totalSize = files.reduce((n, f) => n + f.file.size, 0);

  return <Modal wide title="Add memories" onClose={busy ? () => {} : onClose}>
    <form onSubmit={submit} className="form upload-form">
      <div className={`dropzone ${dragging ? "drag" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}>
        <UploadCloud size={28}/>
        <b>Drag photos and videos here, or click to browse</b>
        <small>Up to {MAX_FILES} files, {MAX_FILE_MB} MB each</small>
        <input ref={inputRef} type="file" multiple accept="image/*,video/*" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}/>
      </div>

      {files.length > 0 && <ul className="file-list">
        {files.map((f) => <li key={f.id}>
          {f.preview ? <img src={f.preview} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }}/> : <span className="file-icon">{f.file.type.startsWith("video/") ? <Film size={18}/> : <ImageIcon size={18}/>}</span>}
          <div><b>{f.file.name}</b><small>{fmtBytes(f.file.size)} · {toDateInput(f.file.lastModified)}</small></div>
          <button type="button" className="icon-btn tiny" onClick={() => removeFile(f.id)} disabled={busy} aria-label={`Remove ${f.file.name}`}><X size={14}/></button>
        </li>)}
      </ul>}

      <div className="seg" role="radiogroup" aria-label="Who can see this">
        <button type="button" role="radio" aria-checked={scope === "personal"} className={scope === "personal" ? "on" : ""} onClick={() => setScope("personal")}>Personal<small>Mine, visible to my partner</small></button>
        <button type="button" role="radio" aria-checked={scope === "shared"} className={scope === "shared" ? "on" : ""} onClick={() => setScope("shared")}>Ours<small>Shared memory</small></button>
      </div>

      <div className="grid-2">
        <label>Title (optional)<input value={meta.title} maxLength={100} onChange={(e) => setMeta({ ...meta, title: e.target.value })} placeholder="e.g. Weekend in Coorg"/></label>
        <label>Location (optional)<input value={meta.location} maxLength={100} onChange={(e) => setMeta({ ...meta, location: e.target.value })} placeholder="Where was this?"/></label>
        <label>Date taken<input type="date" max={toDateInput(new Date())} value={meta.date} onChange={(e) => setMeta({ ...meta, date: e.target.value })}/><small className="hint">Leave empty to use each file's own date.</small></label>
        <label>Tags<input value={meta.tags} onChange={(e) => setMeta({ ...meta, tags: e.target.value })} placeholder="beach, birthday"/></label>
      </div>
      <label>Caption (optional)<textarea rows={2} maxLength={500} value={meta.caption} onChange={(e) => setMeta({ ...meta, caption: e.target.value })} placeholder="What made this moment special?"/></label>

      <ErrorNote>{error}</ErrorNote>
      {busy && <div className="progress" aria-label="Upload progress"><div style={{ width: `${progress}%` }}/><span>{progress < 100 ? `Uploading ${progress}%` : "Processing..."}</span></div>}
      <div className="row-gap end">
        <small className="muted">{files.length ? `${files.length} selected · ${fmtBytes(totalSize)}` : ""}</small>
        <button type="button" className="button secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="button primary" disabled={busy || !files.length}>{busy ? "Uploading..." : `Upload ${files.length || ""}`}</button>
      </div>
    </form>
  </Modal>;
}
