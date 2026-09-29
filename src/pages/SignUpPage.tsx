import { useState } from "react";
import { ArrowRight, Loader2, LogIn, LockKeyhole, Mail, ShieldCheck, User, UserPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { roleHomePath, roleLabel, useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { collect, ok, passwordsMatch, requiredEmail, requiredMin, type FieldErrors } from "../lib/validate";
import { ErrorSummary, FieldError, wrappedInvalidProps } from "../components/ui/FieldError";

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
  // Empty until the user presses the button, then every problem on the form.
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  function switchMode(m: Mode): void {
    setMode(m);
    setError("");
    setErrors({});
    setPassword("");
    setConfirm("");
  }

  /** Everything wrong with the form in its current mode. */
  function validate(): FieldErrors {
    if (mode === "signup") {
      const found = collect(
        {
          name,
          email,
          password,
          confirm,
        },
        {
          name: [requiredMin("Full name", 2)],
          email: [requiredEmail()],
          password: [requiredMin("Password", 6)],
        },
      );
      const mismatch = passwordsMatch(password, confirm);
      if (mismatch) found.confirm = mismatch;
      else if (!confirm.trim()) found.confirm = "Confirm your password.";
      return found;
    }
    return collect(
      { email, password },
      { email: [requiredEmail()], password: [requiredMin("Password", 6)] },
    );
  }

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();

    // The gate: report every problem and stop, rather than setting one
    // form-level sentence and returning on the first failure.
    const found = validate();
    setErrors(found);
    if (!ok(found)) {
      setError("");
      return;
    }
    setError("");

    if (mode === "signup") {
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
    setPending(true);
    const result = await signIn(email.trim(), password);
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
          <ErrorSummary
            errors={errors}
            order={mode === "signup" ? ["name", "email", "password", "confirm"] : ["email", "password"]}
          />

          {mode === "signup" && (
            <>
              <div className="grid field-split">
                <label className="field">
                  <span>Full name *</span>
                  <div {...wrappedInvalidProps(errors, "name")}>
                    <User size={16} className="muted" />
                    <input className="input" placeholder="e.g. Thandiwe Banda" value={name}
                      onChange={(e) => setName(e.target.value)} aria-label="Full name"
                      aria-invalid={errors.name ? true : undefined}
                      aria-describedby={errors.name ? "name-error" : undefined} />
                  </div>
                  <FieldError error={errors.name} field="name" />
                </label>
                <label className="field">
                  <span>Email *</span>
                  <div {...wrappedInvalidProps(errors, "email")}>
                    <Mail size={16} className="muted" />
                    <input className="input" type="email" placeholder="you@facility.mw" value={email}
                      onChange={(e) => setEmail(e.target.value)} aria-label="Email address"
                      aria-invalid={errors.email ? true : undefined}
                      aria-describedby={errors.email ? "email-error" : undefined} />
                  </div>
                  <FieldError error={errors.email} field="email" />
                </label>
              </div>
              <div className="grid field-split">
                <label className="field">
                  <span>Password *</span>
                  <div {...wrappedInvalidProps(errors, "password")}>
                    <LockKeyhole size={16} className="muted" />
                    <input className="input" type="password" placeholder="At least 6 characters" value={password}
                      onChange={(e) => setPassword(e.target.value)} aria-label="Password"
                      aria-invalid={errors.password ? true : undefined}
                      aria-describedby={errors.password ? "password-error" : undefined} />
                  </div>
                  <FieldError error={errors.password} field="password" />
                </label>
                <label className="field">
                  <span>Confirm password *</span>
                  <div {...wrappedInvalidProps(errors, "confirm")}>
                    <LockKeyhole size={16} className="muted" />
                    <input className="input" type="password" placeholder="Repeat your password" value={confirm}
                      onChange={(e) => setConfirm(e.target.value)} aria-label="Confirm password"
                      aria-invalid={errors.confirm ? true : undefined}
                      aria-describedby={errors.confirm ? "confirm-error" : undefined} />
                  </div>
                  <FieldError error={errors.confirm} field="confirm" />
                </label>
              </div>
            </>
          )}

          {mode === "signin" && (
            <>
              <label className="field">
                <span>Email *</span>
                <div {...wrappedInvalidProps(errors, "email")}>
                  <Mail size={16} className="muted" />
                  <input className="input" type="email" placeholder="you@facility.mw" value={email}
                    onChange={(e) => setEmail(e.target.value)} aria-label="Email address"
                    aria-invalid={errors.email ? true : undefined}
                    aria-describedby={errors.email ? "email-error" : undefined} />
                </div>
                <FieldError error={errors.email} field="email" />
              </label>
              <label className="field">
                <span>Password *</span>
                <div {...wrappedInvalidProps(errors, "password")}>
                  <LockKeyhole size={16} className="muted" />
                  <input className="input" type="password" placeholder="Your password" value={password}
                    onChange={(e) => setPassword(e.target.value)} aria-label="Password"
                    aria-invalid={errors.password ? true : undefined}
                    aria-describedby={errors.password ? "password-error" : undefined} />
                </div>
                <FieldError error={errors.password} field="password" />
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