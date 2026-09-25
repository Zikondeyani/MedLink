import { useState } from "react";
import { ArrowRight, Loader2, LockKeyhole, LogIn, Mail, Store, UserPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Modal from "../ui/Modal";
import { useAuth, roleHomePath, roleLabel } from "../../lib/auth";
import { useToast } from "../../lib/toast";

export default function SignInModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signIn } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function submit(): Promise<void> {
    if (!emailOk) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.trim().length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setPending(true);
    // Role comes from the account, not from anything typed here.
    const result = await signIn(email, password);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const { user } = result;
    if (user.role !== "customer") navigate(roleHomePath(user.role));
    push({
      title: "You're signed in",
      message: `Welcome back, ${user.name.split(" ")[0]} — signed in as a ${roleLabel(user.role).toLowerCase()}.`,
      icon: "success",
    });
    setEmail("");
    setPassword("");
    setError("");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sign in"
      footer={
        <>
          <div className="grow" />
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={pending} onClick={() => void submit()}>
            {pending ? <Loader2 size={15} /> : <LogIn size={15} />} Sign in
          </button>
        </>
      }
    >
      <div className="stack-sm">
        <p className="small muted auth-modal-desc">
          Track your orders, save addresses and reorder faster — one account for everything.
        </p>

        <label className="row" style={{ alignItems: "center", position: "relative" }}>
          <Mail size={16} className="muted" style={{ position: "absolute", left: 12 }} />
          <input
            className="input"
            style={{ paddingLeft: 38 }}
            type="email"
            placeholder="you@facility.mw"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email address"
          />
        </label>
        <label className="row" style={{ alignItems: "center", position: "relative" }}>
          <LockKeyhole size={16} className="muted" style={{ position: "absolute", left: 12 }} />
          <input
            className="input"
            style={{ paddingLeft: 38 }}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
            aria-label="Password"
          />
        </label>
        {error && <p className="small red">{error}</p>}

        <div className="auth-or"><span>or</span></div>

        <div className="auth-ctas stack-sm">
          <div className="auth-cta-block">
            <span className="xs muted">New to MedLink?</span>
            <Link to="/signup" className="btn btn-outline btn-block auth-cta" onClick={onClose}>
              <UserPlus size={15} /> <span className="grow">Sign up as a customer</span> <ArrowRight size={14} />
            </Link>
          </div>
          <div className="auth-cta-block">
            <span className="xs muted">Selling supplies?</span>
            <Link to="/become-a-supplier" className="btn btn-outline btn-block auth-cta" onClick={onClose}>
              <Store size={15} /> <span className="grow">Apply as a supplier</span> <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </Modal>
  );
}
