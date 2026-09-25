import { useState, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { LockKeyhole, LogIn, Store } from "lucide-react";
import { useAuth, roleHomePath, roleLabel, type UserRole } from "../../lib/auth";
import SignInModal from "./SignInModal";

function SignInRequired({ role }: { role?: UserRole }) {
  const [open, setOpen] = useState(false);
  const area = role ? `the ${roleLabel(role).toLowerCase()} area` : "this area";
  const accountAction =
    role === "supplier" ? (
      <Link to="/become-a-supplier" className="btn btn-outline">Apply to become a supplier</Link>
    ) : role === "customer" ? (
      <Link to="/signup" className="btn btn-outline">Create customer account</Link>
    ) : (
      <span className="small muted">Admin accounts are provisioned by MedLink.</span>
    );

  return (
    <div className="container page">
      <div className="empty access-gate">
        <span className="empty-icon"><LockKeyhole size={27} strokeWidth={1.7} /></span>
        <h1 className="h-section">Sign in required</h1>
        <p className="muted">
          Sign in to view {area}. Protected tools and account information in this area are only shown after authentication.
        </p>
        <div className="row wrap" style={{ justifyContent: "center", marginTop: 16, gap: 8 }}>
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            <LogIn size={16} /> Sign in
          </button>
          {accountAction}
          <Link to="/" className="btn btn-ghost">
            <Store size={15} /> Back to marketplace
          </Link>
        </div>
      </div>
      <SignInModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

/** Require an authenticated session without imposing a role. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <SignInRequired />;
}

/** Gate a dashboard or customer area behind one specific account role. */
export default function RequireRole({
  role,
  children,
}: {
  role: UserRole;
  children: ReactNode;
}) {
  const { user } = useAuth();

  if (!user) return <SignInRequired role={role} />;

  if (user.role !== role) {
    return <Navigate to={roleHomePath(user.role)} replace />;
  }

  return <>{children}</>;
}
