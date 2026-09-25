/* ============================================================
   MedLink — admin account management
   The authenticated admin surface for the profiles table.

   Supabase mode  → RLS-protected reads plus SECURITY DEFINER RPCs
                    (admin_set_account_role / admin_set_account_status);
                    both re-check the caller's role inside Postgres.
   Demo mode      → the same operations against the localStorage table
                    in ./auth so the console stays fully clickable.

   These are the "admin parts" wired to the authentication feature:
   role changes, promotion to admin and suspending an account.
   ============================================================ */
import {
  listLocalAccounts,
  updateLocalAccount,
  type AccountStatus,
  type AuthUser,
  type UserRole,
} from "./auth";
import type { ProfileRow } from "./database.types";
import { supabase } from "./supabase";

export interface AccountRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  /** Marketplace tenant for an approved supplier account. */
  supplierId?: string;
  /** ISO timestamp, when the backend reports one. */
  createdAt?: string;
}

export type AccountMutationResult =
  | { ok: true; account: AccountRecord }
  | { ok: false; error: string };

const PROFILE_SELECT = "id, email, full_name, role, status, supplier_id, created_at";

/** Shape of the columns the admin console selects (see PROFILE_SELECT). */
type AdminProfileRow = Omit<ProfileRow, "phone" | "updated_at">;

function mapRow(row: AdminProfileRow): AccountRecord {
  const account: AccountRecord = {
    id: row.id,
    name: row.full_name.trim() || row.email,
    email: row.email.trim().toLowerCase(),
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
  };
  if (row.supplier_id) account.supplierId = row.supplier_id;
  return account;
}

/** Every account on the platform. RLS lets administrators see all rows. */
export async function listAccounts(): Promise<AccountRecord[]> {
  if (!supabase) {
    return listLocalAccounts().map((a) => {
      const account: AccountRecord = {
        id: a.id,
        name: a.name,
        email: a.email,
        role: a.role,
        status: a.status,
      };
      if (a.supplierId) account.supplierId = a.supplierId;
      return account;
    });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

/**
 * Guard rails shared by both backends — mirrored in the SQL RPCs so the
 * rules hold even if the UI is bypassed.
 */
function guardRail(
  target: AccountRecord,
  next: { role?: UserRole; status?: AccountStatus },
  admin: AuthUser | null,
  all: AccountRecord[],
): string | null {
  if (!admin || admin.role !== "admin") return "Administrator access is required.";
  if (target.id === admin.id && next.role && next.role !== "admin") {
    return "You cannot remove your own administrator access.";
  }
  if (target.id === admin.id && next.status === "suspended") {
    return "You cannot suspend your own administrator account.";
  }
  const admins = all.filter((a) => a.role === "admin");
  if (next.role && next.role !== "admin" && target.role === "admin" && admins.length <= 1) {
    return "MedLink must keep at least one administrator account.";
  }
  return null;
}

/** Promote / demote an account between customer, supplier and admin. */
export async function setAccountRole(
  target: AccountRecord,
  role: UserRole,
  admin: AuthUser | null,
): Promise<AccountMutationResult> {
  if (!supabase) {
    const blocked = guardRail(target, { role }, admin, await listAccounts());
    if (blocked) return { ok: false, error: blocked };
    const updated = updateLocalAccount(target.id, { role, supplierId: role === "customer" ? undefined : target.supplierId });
    if (!updated) return { ok: false, error: "Account not found." };
    return { ok: true, account: { ...target, role } };
  }

  const { data, error } = await supabase.rpc("admin_set_account_role", { target: target.id, new_role: role });
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not change that account's role." };
  }
  return { ok: true, account: mapRow(data) };
}

/** Suspend (block sign-in for) or reactivate an account. */
export async function setAccountStatus(
  target: AccountRecord,
  status: AccountStatus,
  admin: AuthUser | null,
): Promise<AccountMutationResult> {
  if (!supabase) {
    const blocked = guardRail(target, { status }, admin, await listAccounts());
    if (blocked) return { ok: false, error: blocked };
    const updated = updateLocalAccount(target.id, { status });
    if (!updated) return { ok: false, error: "Account not found." };
    return { ok: true, account: { ...target, status } };
  }

  const { data, error } = await supabase.rpc("admin_set_account_status", { target: target.id, new_status: status });
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not change that account's status." };
  }
  return { ok: true, account: mapRow(data) };
}
