import { useState } from "react";
import { Star } from "lucide-react";
import { useCouple } from "../context/CoupleContext";
import { useMemories } from "../hooks/useMemories";
import { useMemoryActions } from "../hooks/useMemoryActions";
import MemoryGrid from "../components/MemoryGrid";
import Lightbox from "../components/Lightbox";
import { Empty, PageHeader, SkeletonGrid, ErrorNote } from "../components/ui";

const PARAMS = { favorite: "true", sort: "newest", limit: 24 };

export default function Favorites() {
  const { couple } = useCouple();
  const list = useMemories(couple._id, PARAMS);
  const { toggleFavorite } = useMemoryActions();
  const [viewer, setViewer] = useState(null);

  const unfavorite = async (m) => { if ((await toggleFavorite(m, list.patchItem)) === false) list.removeItems([m._id]); };

  return <section className="page">
    <PageHeader eyebrow="YOUR SPACE" title="Favorites" subtitle="The moments you love most. Favorites are personal to you."/>
    <ErrorNote>{list.error}</ErrorNote>
    {list.loading ? <SkeletonGrid/> : list.items.length ? <>
      <MemoryGrid items={list.items} onOpen={setViewer} onFavorite={unfavorite}/>
      {list.hasMore && <div className="load-more"><button className="button secondary" onClick={list.loadMore} disabled={list.loadingMore}>{list.loadingMore ? "Loading..." : "Load more"}</button></div>}
    </> : <Empty icon={Star} title="No favorites yet" text="Tap the heart on any memory to keep it here."/>}
    {viewer !== null && <Lightbox items={list.items} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} onPatch={list.patchItem} onRemove={list.removeItems}/>}
  </section>;
}
