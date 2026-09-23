import { useState } from "react";
import { LogIn, Mail, ShieldCheck, Truck, User, Wallet } from "lucide-react";
import { useAuth, nameFromEmail } from "../../lib/auth";
import { useToast } from "../../lib/toast";

const perks = [
  { icon: <Truck size={15} />, label: "Track every order live — from checkout to delivery" },
  { icon: <Wallet size={15} />, label: "Save addresses & payment methods for one-tap reorder" },
  { icon: <ShieldCheck size={15} />, label: "Faster support and buyer protection on your purchases" },
];

export default function HomeSignIn() {
  const { signIn } = useAuth();
  const { push } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  function submit(e: React.FormEvent): void {
    e.preventDefault();
    if (!emailOk) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.trim().length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    const displayName = name.trim() || nameFromEmail(email.trim());
    signIn({ name: displayName, email: email.trim() });
    push({ title: "You're signed in", message: `Welcome to MedLink, ${displayName.split(" ")[0]}.`, icon: "success" });
  }

  return (
    <section className="section home-signin">
      <div className="container">
        <div className="split home-signin-grid">
          <div className="home-signin-copy">
            <span className="eyebrow">Your MedLink account</span>
            <h2 className="h-section">Sign in to order faster</h2>
            <p className="muted">
              Join buyers across Malawi who use MedLink to keep their facilities stocked. Creating an account
              takes seconds and is completely free.
            </p>
            <ul className="home-signin-perks">
              {perks.map((p) => (
                <li key={p.label}>
                  <span className="home-signin-perk-icon">{p.icon}</span>
                  {p.label}
                </li>
              ))}
            </ul>
          </div>

          <form className="card card-pad home-signin-form" onSubmit={submit}>
            <h3 className="h-card">Sign in / create account</h3>
            <label className="field">
              <span>Full name <em className="muted">(optional)</em></span>
              <div className="input-wrap">
                <User size={16} className="muted" />
                <input className="input" placeholder="e.g. Thandiwe Banda" value={name}
                  onChange={(e) => setName(e.target.value)} aria-label="Full name" />
              </div>
            </label>
            <label className="field">
              <span>Email *</span>
              <div className="input-wrap">
                <Mail size={16} className="muted" />
                <input className="input" type="email" placeholder="you@facility.mw" value={email}
                  onChange={(e) => setEmail(e.target.value)} aria-label="Email address" />
              </div>
            </label>
            <label className="field">
              <span>Password *</span>
              <input className="input" type="password" placeholder="At least 6 characters" value={password}
                onChange={(e) => setPassword(e.target.value)} aria-label="Password" />
            </label>
            {error && <p className="small red">{error}</p>}
            <button className="btn btn-primary btn-block btn-lg" type="submit">
              <LogIn size={16} /> Sign in to MedLink
            </button>
            <p className="xs muted" style={{ textAlign: "center", marginTop: 10 }}>
              Demo build — any email and password will sign you in.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}