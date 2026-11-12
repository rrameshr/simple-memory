import { useCallback } from "react";
import api from "../services/api";
import { useCouple } from "../context/CoupleContext";
import { useToast } from "../context/ToastContext";
import { getError } from "../utils/format";

/** Shared memory mutations. `patch(id, partial)` updates the list that owns the memory. */
export function useMemoryActions() {
  const { couple } = useCouple();
  const toast = useToast();
  const base = `/memories/${couple?._id}`;

  const toggleFavorite = useCallback(async (memory, patch) => {
    patch(memory._id, { isFavorite: !memory.isFavorite }); // optimistic
    try {
      const { data } = await api.post(`${base}/${memory._id}/favorite`);
      patch(memory._id, { isFavorite: data.isFavorite });
      return data.isFavorite;
    } catch (e) {
      patch(memory._id, { isFavorite: memory.isFavorite });
      toast.error(getError(e, "Could not update favorite."));
    }
  }, [base, toast]);

  const moveToTrash = useCallback(async (memory) => {
    try { await api.delete(`${base}/${memory._id}`); toast.success("Moved to Trash. You can restore it for 30 days."); return true; }
    catch (e) { toast.error(getError(e, "Could not delete.")); return false; }
  }, [base, toast]);

  const bulk = useCallback(async (action, ids, extra = {}) => {
    try {
      const { data } = await api.post(`${base}/bulk`, { action, ids, ...extra });
      if (data.skipped) toast.info(`${data.affected} updated, ${data.skipped} skipped (only the uploader can change a memory).`);
      return data;
    } catch (e) { toast.error(getError(e, "Action failed.")); return null; }
  }, [base, toast]);

  return { toggleFavorite, moveToTrash, bulk, base };
}
