import { useState } from "react";
import { ArrowRight, Loader2, LogIn, LockKeyhole, Mail, ShieldCheck, User, UserPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { roleHomePath, roleLabel, useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";

type Mode = "signup" | "signin";

export default function SignUpPage() {
  const { signIn, signUp } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [tried, setTried] = useState(false);
  const [pending, setPending] = useState(false);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  function switchMode(m: Mode): void {
    setMode(m);
    setError("");
    setTried(false);
    setPassword("");
    setConfirm("");
  }

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setTried(true);
    if (mode === "signup") {
      if (name.trim().length < 2) {
        setError("Enter your full name.");
        return;
      }
      if (!emailOk) {
        setError("Enter a valid email address.");
        return;
      }
      if (password.trim().length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirm) {
        setError("Passwords do not match.");
        return;
      }
      setPending(true);
      // The account is created with the customer role. The role travels in the
      // sign-up metadata, and the database trigger is what actually stores it —
      // the sign-in form can never choose a role.
      const created = await signUp({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        role: "customer",
      });
      setPending(false);
      if (!created.ok) {
        setError(created.error);
        return;
      }
      if (!created.signedIn) {
        // Email confirmation is enabled on the project — the account exists,
        // it simply needs the link clicked before a session is issued.
        push({ title: "Confirm your email", message: created.notice, icon: "info" });
        switchMode("signin");
        return;
      }
      push({
        title: "Account created",
        message: `Welcome to MedLink, ${created.user.name.split(" ")[0]} — your customer account is ready.`,
        icon: "success",
      });
      navigate("/account");
      return;
    }
    // Sign-in mode
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
    push({
      title: "You're signed in",
      message: `Welcome back, ${result.user.name.split(" ")[0]} — signed in as a ${roleLabel(result.user.role).toLowerCase()}.`,
      icon: "success",
    });
    navigate(roleHomePath(result.user.role));
  }

  return (
    <div className="container page auth-simple-page">
      <div className="card card-pad auth-simple">
        <div className="auth-simple-head">
          <span className="eyebrow">MedLink</span>
          <h1 className="h-display" style={{ fontSize: "clamp(22px,3.5vw,30px)" }}>
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
        </div>

        <div className="seg auth-mode-seg" role="tablist" aria-label="Sign up or sign in">
          <button
            role="tab"
            aria-selected={mode === "signup"}
            className={`seg-btn${mode === "signup" ? " seg-btn-active" : ""}`}
            onClick={() => switchMode("signup")}
          >
            <UserPlus size={15} /> Sign up
          </button>
          <button
            role="tab"
            aria-selected={mode === "signin"}
            className={`seg-btn${mode === "signin" ? " seg-btn-active" : ""}`}
            onClick={() => switchMode("signin")}
          >
            <LogIn size={15} /> Sign in
          </button>
        </div>

        <form onSubmit={submit} noValidate>
          {mode === "signup" && (
            <>
              <div className="grid field-split">
                <label className="field">
                  <span>Full name *</span>
                  <div className="input-wrap">
                    <User size={16} className="muted" />
                    <input className="input" placeholder="e.g. Thandiwe Banda" value={name}
                      onChange={(e) => setName(e.target.value)} aria-label="Full name" />
                  </div>
                  {tried && name.trim().length < 2 && <em className="field-err">Enter your full name.</em>}
                </label>
                <label className="field">
                  <span>Email *</span>
                  <div className="input-wrap">
                    <Mail size={16} className="muted" />
                    <input className="input" type="email" placeholder="you@facility.mw" value={email}
                      onChange={(e) => setEmail(e.target.value)} aria-label="Email address" />
                  </div>
                  {tried && !emailOk && <em className="field-err">Enter a valid email address.</em>}
                </label>
              </div>
              <div className="grid field-split">
                <label className="field">
                  <span>Password *</span>
                  <div className="input-wrap">
                    <LockKeyhole size={16} className="muted" />
                    <input className="input" type="password" placeholder="At least 6 characters" value={password}
                      onChange={(e) => setPassword(e.target.value)} aria-label="Password" />
                  </div>
                </label>
                <label className="field">
                  <span>Confirm password *</span>
                  <div className="input-wrap">
                    <LockKeyhole size={16} className="muted" />
                    <input className="input" type="password" placeholder="Repeat your password" value={confirm}
                      onChange={(e) => setConfirm(e.target.value)} aria-label="Confirm password" />
                  </div>
                  {tried && confirm.length > 0 && password !== confirm && (
                    <em className="field-err">Passwords do not match.</em>
                  )}
                </label>
              </div>
            </>
          )}

          {mode === "signin" && (
            <>
              <label className="field">
                <span>Email *</span>
                <div className="input-wrap">
                  <Mail size={16} className="muted" />
                  <input className="input" type="email" placeholder="you@facility.mw" value={email}
                    onChange={(e) => setEmail(e.target.value)} aria-label="Email address" />
                </div>
                {tried && !emailOk && <em className="field-err">Enter a valid email address.</em>}
              </label>
              <label className="field">
                <span>Password *</span>
                <div className="input-wrap">
                  <LockKeyhole size={16} className="muted" />
                  <input className="input" type="password" placeholder="Your password" value={password}
                    onChange={(e) => setPassword(e.target.value)} aria-label="Password" />
                </div>
              </label>
            </>
          )}

          {error && <p className="small red">{error}</p>}

          <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={pending}>
            {mode === "signup" ? (
              <>
                {pending ? <Loader2 size={16} /> : <UserPlus size={16} />} Create account
              </>
            ) : (
              <>
                {pending ? <Loader2 size={16} /> : <LogIn size={16} />} Sign in
              </>
            )}
          </button>
        </form>

        <div className="auth-ctas stack-sm" style={{ marginTop: 18 }}>
          {mode === "signup" ? (
            <>
              <button type="button" className="btn btn-outline btn-block auth-cta" onClick={() => switchMode("signin")}>
                <LogIn size={15} /> <span className="grow">Already have an account? Sign in</span> <ArrowRight size={14} />
              </button>
              <Link to="/become-a-supplier" className="btn btn-outline btn-block auth-cta">
                <ShieldCheck size={15} /> <span className="grow">Apply as a supplier</span> <ArrowRight size={14} />
              </Link>
            </>
          ) : (
            <button type="button" className="btn btn-outline btn-block auth-cta" onClick={() => switchMode("signup")}>
              <UserPlus size={15} /> <span className="grow">New here? Sign up as a customer</span> <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      <p className="xs muted" style={{ textAlign: "center", marginTop: 16 }}>
        <Link to="/" className="link"><ArrowRight size={12} style={{ verticalAlign: -2, transform: "rotate(180deg)" }} /> Back to marketplace</Link>
      </p>
    </div>
  );
}