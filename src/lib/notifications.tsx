import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { customerNotifications, supplierNotifications } from "../data/notifications";
import type { NotificationItem } from "../data/types";

interface NotificationsContextValue {
  items: NotificationItem[];
  unread: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>(() => {
    return [...customerNotifications, ...supplierNotifications].sort((a, b) =>
      a.read === b.read ? 0 : a.read ? 1 : -1,
    );
  });

  const value = useMemo<NotificationsContextValue>(
    () => ({
      items,
      unread: items.filter((n) => !n.read).length,
      markRead: (id) => setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n))),
      markAllRead: () => setItems((prev) => prev.map((n) => ({ ...n, read: true }))),
    }),
    [items],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}