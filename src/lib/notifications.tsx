/* ============================================================
   MedLink — notifications

   The rows are written by the database (checkout creates the first
   one, order status changes and escrow releases can add more) and
   read here through row-level security: a customer sees the
   notifications addressed to their account, a supplier the ones for
   its store, an administrator all of them. Marking as read is a real
   UPDATE, not local state.
   ============================================================ */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";
import { toNotification } from "./db";
import type { NotificationItem } from "../data/types";

interface NotificationsContextValue {
  items: NotificationItem[];
  unread: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const scope = user
    ? user.role === "supplier"
      ? { column: "supplier_id", value: user.supplierId ?? "" }
      : { column: "customer_id", value: user.id }
    : null;

  const load = useCallback(async () => {
    if (!supabase || !scope || !scope.value) {
      setItems([]);
      return;
    }
    setLoading(true);
    // Administrators read every notification; everyone else only their own.
    const query = supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60);
    const { data, error } =
      user?.role === "admin" ? await query : await query.eq(scope.column, scope.value);
    if (error) {
      setItems([]);
    } else {
      const rows = (data ?? []).map(toNotification);
      setItems(rows.sort((a, b) => (a.read === b.read ? 0 : a.read ? 1 : -1)));
    }
    setLoading(false);
  }, [scope?.column, scope?.value, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      items,
      unread: items.filter((item) => !item.read).length,
      markRead: (id) => {
        setItems((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)));
        if (supabase) void supabase.from("notifications").update({ read: true }).eq("id", id);
      },
      markAllRead: () => {
        setItems((current) => current.map((item) => ({ ...item, read: true })));
        if (supabase && scope?.value) {
          const column = user?.role === "admin" ? null : scope.column;
          if (column) {
            void supabase.from("notifications").update({ read: true }).eq(column, scope.value);
          } else {
            void supabase.from("notifications").update({ read: true }).eq("read", false);
          }
        }
      },
    }),
    [items, scope?.value, scope?.column, user?.role, loading],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error("useNotifications must be used inside <NotificationsProvider>.");
  return context;
}
