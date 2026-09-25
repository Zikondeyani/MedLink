/* ============================================================
   MedLink — lightweight front-end auth
   Role-based sign-in state (persisted to localStorage).
   Everyone signs in through the SAME sign-in page — accounts
   differ only at registration:
     • customer  — sign up as a customer (SignUpPage)
     • supplier  — apply as a supplier (BecomeASupplierPage)
     • admin     — created manually in SEED_ACCOUNTS below
   ============================================================ */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type UserRole = "customer" | "supplier" | "admin";

export interface AuthUser {
  name: string;
  email: string;
  role: UserRole;
  /** Server-derived supplier tenant for an approved supplier account. */
  supplierId?: string;
}

export interface Account extends AuthUser {
  password: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  signIn: (user: AuthUser) => void;
  signOut: () => void;
}

const STORAGE_KEY = "medlink.auth.user";
const ACCOUNTS_KEY = "medlink.accounts";

/* ============================================================
   Registered accounts — localStorage-backed "user table".
   Admin accounts are created manually: add your admin here
   and it becomes sign-in able (e.g. admin@medlink.mw).
   ============================================================ */
export const SEED_ACCOUNTS: Account[] = [
  // Admin is created manually — replace / add admins here.
  { name: "Platform Administrator", email: "admin@medlink.mw", password: "admin123", role: "admin" },
  // Demo supplier — matches the demo store in the supplier dashboard.
  { name: "Demo Supplier", email: "supplier@medlink.mw", password: "supplier123", role: "supplier", supplierId: "sup-medequip" },
  // Demo buyer.
  { name: "Demo Buyer", email: "buyer@medlink.mw", password: "buyer123", role: "customer" },
];

const ROLE_LABELS: Record<UserRole, string> = {
  customer: "Customer",
  supplier: "Supplier",
  admin: "Admin",
};

/** Human label for a role, e.g. "customer" → "Customer". */
export function roleLabel(role: UserRole): string {
  return ROLE_LABELS[role];
}

/** The authenticated user's role-appropriate landing page. */
export function roleHomePath(role: UserRole): string {
  if (role === "supplier") return "/supplier";
  if (role === "admin") return "/admin";
  return "/";
}

/** Notifications always live under the account area for their current role. */
export function roleNotificationsPath(role: UserRole): string {
  if (role === "supplier") return "/supplier/notifications";
  if (role === "admin") return "/admin/notifications";
  return "/account/notifications";
}

function isStoredAccount(value: unknown): value is Account {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Account>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.password === "string" &&
    (candidate.role === "customer" || candidate.role === "supplier" || candidate.role === "admin") &&
    (candidate.supplierId === undefined || typeof candidate.supplierId === "string")
  );
}

function readAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const stored = Array.isArray(parsed) ? parsed.filter(isStoredAccount) : [];

    // Always keep the demo accounts available, even when an older version of
    // the app left a partial account list in localStorage. User-created
    // accounts are allowed to replace a seed with the same email.
    const byEmail = new Map<string, Account>();
    for (const account of [...SEED_ACCOUNTS, ...stored]) {
      const key = account.email.trim().toLowerCase();
      const previous = byEmail.get(key);
      byEmail.set(key, {
        ...account,
        email: key,
        // Older localStorage records predate supplier tenancy. Preserve the
        // deterministic seed mapping when an older record has no tenant id.
        supplierId: account.supplierId ?? previous?.supplierId,
      });
    }
    const accounts = [...byEmail.values()];
    if (!raw) localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    return accounts;
  } catch {
    return [...SEED_ACCOUNTS];
  }
}

function persistAccounts(accounts: Account[]): void {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    /* storage unavailable — in-memory only */
  }
}

/** Look up a registered account by email (case-insensitive). */
export function findAccountByEmail(email: string): Account | undefined {
  const term = email.trim().toLowerCase();
  return readAccounts().find((a) => a.email.toLowerCase() === term);
}

/** Attach an approved supplier tenant to its registered account. */
export function attachSupplierToAccount(email: string, supplierId: string): Account | undefined {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedSupplierId = supplierId.trim();
  if (!normalizedEmail || !normalizedSupplierId) return undefined;
  const accounts = readAccounts();
  const index = accounts.findIndex((account) => account.email === normalizedEmail);
  if (index < 0) return undefined;
  const updated = { ...accounts[index], role: "supplier" as const, supplierId: normalizedSupplierId };
  accounts[index] = updated;
  persistAccounts(accounts);
  return updated;
}

/** Resolve only the tenant id carried by the authenticated account. */
export function supplierIdForUser(user: AuthUser | null | undefined): string | undefined {
  return user?.role === "supplier" ? user.supplierId : undefined;
}

export type RegisterResult =
  | { ok: true; account: Account }
  | { ok: false; error: string };

/** Create a new account with the given role. Duplicate emails are rejected. */
export function registerAccount(input: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}): RegisterResult {
  const email = input.email.trim().toLowerCase();
  const accounts = readAccounts();
  if (accounts.some((a) => a.email.toLowerCase() === email)) {
    return {
      ok: false,
      error: "An account with that email already exists — try signing in instead.",
    };
  }
  const account: Account = {
    name: input.name.trim() || nameFromEmail(email),
    email,
    password: input.password,
    role: input.role,
  };
  persistAccounts([...accounts, account]);
  return { ok: true, account };
}

export type SignInResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: string };

/**
 * Resolve a sign-in attempt. Accounts must already be registered; an
 * arbitrary email must not silently become a customer account.
 */
export function authenticate(email: string, password: string): SignInResult {
  const normalizedEmail = email.trim().toLowerCase();
  const account = readAccounts().find((a) => a.email.toLowerCase() === normalizedEmail);
  if (!account) {
    return {
      ok: false,
      error: "No registered account was found for that email. Create an account or apply as a supplier first.",
    };
  }
  if (account.password !== password) {
    return { ok: false, error: "Incorrect password for that account." };
  }
  return {
    ok: true,
    user: { name: account.name, email: account.email, role: account.role, supplierId: account.supplierId },
  };
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStored(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (typeof parsed.email !== "string") return null;

    // Do not restore a stale session that no longer corresponds to a
    // registered account (for example, one created by an older demo flow).
    const account = readAccounts().find(
      (a) => a.email.toLowerCase() === parsed.email!.trim().toLowerCase(),
    );
    if (!account) return null;
    return { name: account.name, email: account.email, role: account.role, supplierId: account.supplierId };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStored);

  const signIn = useCallback((next: AuthUser) => {
    setUser(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — session-only sign in */
    }
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ user, signIn, signOut }), [user, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Derive a display name from an email address, e.g. jane@clinic.mw → Jane. */
export function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  const words = parts.length > 0 ? parts : [local];
  return words
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}