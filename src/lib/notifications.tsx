import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./auth";
import { adminNotifications, customerNotifications, supplierNotifications } from "../data/notifications";
import type { NotificationItem } from "../data/types";

interface NotificationsContextValue {
  items: NotificationItem[];
  unread: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

type ReadState = Record<string, Record<string, boolean>>;

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [readState, setReadState] = useState<ReadState>({});
  const userKey = user?.email.trim().toLowerCase() ?? "guest";

  // Notifications are selected at render time. A guest never receives a
  // customer or supplier notification list, and one role cannot mark/read the
  // other role's items through this context.
  const source: NotificationItem[] = useMemo(() => {
    if (!user) return [];
    if (user.role === "customer") return customerNotifications;
    if (user.role === "supplier") return supplierNotifications;
    return adminNotifications;
  }, [user]);

  const items = useMemo(() => {
    const overrides = readState[userKey] ?? {};
    return source
      .map((item) => ({ ...item, read: overrides[item.id] ?? item.read }))
      .sort((a, b) => (a.read === b.read ? 0 : a.read ? 1 : -1));
  }, [source, readState, userKey]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      items,
      unread: items.filter((n) => !n.read).length,
      markRead: (id) => {
        if (!user) return;
        setReadState((previous) => ({
          ...previous,
          [userKey]: { ...(previous[userKey] ?? {}), [id]: true },
        }));
      },
      markAllRead: () => {
        if (!user || items.length === 0) return;
        setReadState((previous) => ({
          ...previous,
          [userKey]: {
            ...(previous[userKey] ?? {}),
            ...Object.fromEntries(items.map((item) => [item.id, true])),
          },
        }));
      },
    }),
    [items, user, userKey],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
