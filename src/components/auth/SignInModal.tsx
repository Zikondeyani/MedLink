import { useState } from "react";
import { ArrowRight, LockKeyhole, LogIn, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import Modal from "../ui/Modal";
import { useAuth, nameFromEmail } from "../../lib/auth";
import { useToast } from "../../lib/toast";

export default function SignInModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signIn } = useAuth();
  const { push } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  function submit(): void {
    if (!emailOk) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.trim().length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    signIn({ name: nameFromEmail(email.trim()), email: email.trim() });
    push({ title: "You're signed in", message: `Welcome back, ${nameFromEmail(email.trim())}.`, icon: "success" });
    setEmail("");
    setPassword("");
    setError("");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sign in to MedLink"
      footer={
        <>
          <span className="xs muted">Demo — any email and password work.</span>
          <div className="grow" />
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>
            <LogIn size={15} /> Sign in
          </button>
        </>
      }
    >
      <div className="stack-sm">
        <p className="small muted" style={{ lineHeight: 1.6 }}>
          Track your orders, save addresses and reorder faster. Sign in with any details to continue.
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
            onKeyDown={(e) => e.key === "Enter" && submit()}
            aria-label="Password"
          />
        </label>
        {error && <p className="small red">{error}</p>}
        <p className="xs muted" style={{ marginTop: 4 }}>
          Selling on MedLink?{" "}
          <Link to="/become-a-supplier" className="link" onClick={onClose}>
            Apply as a supplier <ArrowRight size={12} style={{ verticalAlign: -2 }} />
          </Link>
        </p>
      </div>
    </Modal>
  );
}