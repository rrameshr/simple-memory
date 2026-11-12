import Modal from "./Modal";

export default function ConfirmDialog({ title, message, confirmLabel = "Confirm", danger = false, busy = false, onConfirm, onCancel, children }) {
  return <Modal title={title} onClose={onCancel} footer={<>
    <button className="button secondary" onClick={onCancel} disabled={busy}>Cancel</button>
    <button className={`button ${danger ? "danger" : "primary"}`} onClick={onConfirm} disabled={busy}>{busy ? "Working..." : confirmLabel}</button>
  </>}>
    <p className="muted" style={{ marginTop: 0 }}>{message}</p>
    {children}
  </Modal>;
}
