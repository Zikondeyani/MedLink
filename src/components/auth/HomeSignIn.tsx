import { useState } from "react";
import { ArrowRight, Loader2, LockKeyhole, LogIn, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth, roleLabel } from "../../lib/auth";
import { useToast } from "../../lib/toast";

export default function HomeSignIn() {
  const { signIn } = useAuth();
  const { push } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!emailOk) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.trim().length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setPending(true);
    const result = await signIn(email, password);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const { user } = result;
    push({
      title: "You're signed in",
      message: `Welcome back, ${user.name.split(" ")[0]} — signed in as a ${roleLabel(user.role).toLowerCase()}.`,
      icon: "success",
    });
    setEmail("");
    setPassword("");
    setError("");
  }

  return (
    <section className="section home-signin">
      <div className="container">
        <div className="split home-signin-grid">
          <div className="home-signin-copy">
            <span className="eyebrow">Your MedLink account</span>
            <h2 className="h-section">Sign in to order faster</h2>
            <p className="muted">
              Sign in to your MedLink account. New customers can create one below.
            </p>
          </div>

          <form className="card card-pad home-signin-form" onSubmit={submit}>
            <h3 className="h-card">Sign in to MedLink</h3>
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
              <div className="input-wrap">
                <LockKeyhole size={16} className="muted" />
                <input className="input" type="password" placeholder="At least 6 characters" value={password}
                  onChange={(e) => setPassword(e.target.value)} aria-label="Password" />
              </div>
            </label>
            {error && <p className="small red">{error}</p>}
            <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={pending}>
              {pending ? <Loader2 size={16} /> : <LogIn size={16} />} Continue
            </button>
            <p className="xs muted" style={{ textAlign: "center", marginTop: 10 }}>
              Selling on MedLink?{" "}
              <Link to="/become-a-supplier" className="link">
                Apply as a supplier <ArrowRight size={12} style={{ verticalAlign: -2 }} />
              </Link>
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}