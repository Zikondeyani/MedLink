import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

export interface ToastInput {
  title: string;
  message?: string;
  icon?: "success" | "cart" | "order" | "info" | "error";
}

export interface ToastItem extends ToastInput {
  id: number;
  leaving?: boolean;
}

interface ToastContextValue {
  push: (t: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.set(
      id,
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timers.current.delete(id);
      }, 260),
    );
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      const id = nextId++;
      setToasts((prev) => [...prev.slice(-3), { ...input, id }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), 4200),
      );
    },
    [dismiss],
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" role="region" aria-label="Notifications">
        {toasts.map((t) => (
          <div key={t.id} className={`toast${t.leaving ? " toast-leave" : ""}`} role="status">
            <div className={`toast-icon toast-icon-${t.icon ?? "info"}`}>
              {t.icon === "success" && <span className="toast-check">✓</span>}
              {t.icon === "cart" && <span className="toast-check">🛒</span>}
              {t.icon === "error" && <span className="toast-check">!</span>}
              {t.icon === "info" && <span className="toast-check">ℹ</span>}
              {t.icon === "order" && <span className="toast-check">📦</span>}
              {!t.icon && <span className="toast-check">✓</span>}
            </div>
            <div className="grow">
              <div className="toast-title">{t.title}</div>
              {t.message && <div className="toast-msg">{t.message}</div>}
            </div>
            <button className="toast-close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}