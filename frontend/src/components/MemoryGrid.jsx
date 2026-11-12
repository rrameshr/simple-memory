import { Heart, Play, Check, MapPin, MessageCircle } from "lucide-react";
import { fmtDate } from "../utils/format";

function Thumb({ memory }) {
  if (memory.mediaType === "video" && memory.thumbUrl === memory.mediaUrl) return <video src={memory.mediaUrl} preload="metadata" muted playsInline/>;
  return <img src={memory.thumbUrl} alt={memory.title || memory.caption || "A saved memory"} loading="lazy"/>;
}

export function MemoryCard({ memory, onOpen, onFavorite, selectMode, selected, onSelect }) {
  const click = () => (selectMode ? onSelect(memory._id) : onOpen());
  return <article className={`memory-tile ${selected ? "selected" : ""}`}>
    <button className="tile-media" onClick={click} aria-label={`Open ${memory.title || "memory"}`}>
      <Thumb memory={memory}/>
      {memory.mediaType === "video" && <span className="play-badge"><Play size={12} fill="currentColor"/>{memory.duration ? `${Math.floor(memory.duration / 60)}:${String(Math.round(memory.duration % 60)).padStart(2, "0")}` : "Video"}</span>}
    </button>
    {selectMode
      ? <span className={`check ${selected ? "on" : ""}`}>{selected && <Check size={14}/>}</span>
      : <button className={`fav-btn ${memory.isFavorite ? "on" : ""}`} onClick={() => onFavorite?.(memory)} aria-label={memory.isFavorite ? "Remove from favorites" : "Add to favorites"} aria-pressed={memory.isFavorite}>
          <Heart size={16} fill={memory.isFavorite ? "currentColor" : "none"}/>
        </button>}
    <div className="memory-caption">
      <span>{memory.title || memory.caption || "A little moment"}</span>
      <small>{fmtDate(memory.takenAt)}</small>
    </div>
    {(memory.location || memory.commentCount > 0 || memory.reactions?.length > 0) && <div className="tile-meta">
      {memory.location && <span><MapPin size={11}/>{memory.location}</span>}
      {memory.reactions?.length > 0 && <span>{memory.reactions.map((r) => r.emoji).join("")}</span>}
      {memory.commentCount > 0 && <span><MessageCircle size={11}/>{memory.commentCount}</span>}
    </div>}
  </article>;
}

export default function MemoryGrid({ items, onOpen, onFavorite, selectMode = false, selected, onSelect }) {
  return <div className="memory-grid">{items.map((m, i) => <MemoryCard key={m._id} memory={m} onOpen={() => onOpen(i)} onFavorite={onFavorite}
    selectMode={selectMode} selected={selected?.has(m._id)} onSelect={onSelect}/>)}</div>;
}
