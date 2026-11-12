import { useCallback, useEffect, useRef, useState } from "react";
import api from "../services/api";
import { cleanParams, getError } from "../utils/format";

/** Paginated, filterable memory list with local patch/remove helpers so the UI updates instantly. */
export function useMemories(coupleId, params = {}, enabled = true) {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const key = JSON.stringify(params);
  const reqId = useRef(0);

  const fetchPage = useCallback(async (page) => {
    const id = ++reqId.current;
    const { data } = await api.get(`/memories/${coupleId}`, { params: cleanParams({ ...JSON.parse(key), page }) });
    return id === reqId.current ? data : null; // ignore responses from outdated filters
  }, [coupleId, key]);

  const reload = useCallback(async () => {
    if (!coupleId || !enabled) return;
    setLoading(true); setError("");
    try {
      const d = await fetchPage(1);
      if (d) { setItems(d.memories); setMeta({ page: d.page, pages: d.pages, total: d.total }); }
    } catch (e) { setError(getError(e, "Could not load memories.")); }
    finally { setLoading(false); }
  }, [fetchPage, coupleId, enabled]);

  useEffect(() => { reload(); }, [reload]);

  const loadMore = async () => {
    if (loadingMore || meta.page >= meta.pages) return;
    setLoadingMore(true);
    try {
      const d = await fetchPage(meta.page + 1);
      if (d) {
        setItems((prev) => [...prev, ...d.memories.filter((m) => !prev.some((p) => p._id === m._id))]);
        setMeta({ page: d.page, pages: d.pages, total: d.total });
      }
    } catch (e) { setError(getError(e)); }
    finally { setLoadingMore(false); }
  };

  const patchItem = (id, patch) => setItems((prev) => prev.map((m) => (m._id === id ? { ...m, ...patch } : m)));
  const removeItems = (ids) => {
    const set = new Set(ids);
    setItems((prev) => prev.filter((m) => !set.has(m._id)));
    setMeta((m) => ({ ...m, total: Math.max(0, m.total - ids.length) }));
  };

  return { items, total: meta.total, hasMore: meta.page < meta.pages, loading, loadingMore, error, reload, loadMore, patchItem, removeItems };
}
