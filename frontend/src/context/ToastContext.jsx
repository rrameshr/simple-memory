import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((message, type = "success") => {
    const id = nextId.current++;
    setToasts((t) => [...t.slice(-3), { id, message, type }]);
    setTimeout(() => dismiss(id), type === "error" ? 6000 : 3500);
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (m) => push(m, "success"),
    error: (m) => push(m, "error"),
    info: (m) => push(m, "info")
  }), [push]);

  return <ToastContext.Provider value={api}>
    {children}
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => <div key={t.id} className={`toast ${t.type}`} role="status">
        {t.type === "error" ? <AlertCircle size={17}/> : <CheckCircle2 size={17}/>}
        <span>{t.message}</span>
        <button aria-label="Dismiss" onClick={() => dismiss(t.id)}><X size={14}/></button>
      </div>)}
    </div>
  </ToastContext.Provider>;
}

export const useToast = () => useContext(ToastContext);
