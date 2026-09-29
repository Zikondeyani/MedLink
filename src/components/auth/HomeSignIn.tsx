import { useState } from "react";
import { ArrowRight, Loader2, LockKeyhole, LogIn, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth, roleLabel } from "../../lib/auth";
import { useToast } from "../../lib/toast";
import { collect, ok, requiredEmail, requiredMin, type FieldErrors } from "../../lib/validate";
import { FieldError, wrappedInvalidProps } from "../ui/FieldError";

export default function HomeSignIn() {
  const { signIn } = useAuth();
  const { push } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Form-level failures (wrong credentials) land in `error`; anything the
  // user can fix by retyping lands in `errors`, next to the field.
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError("");

    const found = collect(
      { email, password },
      { email: [requiredEmail()], password: [requiredMin("Password", 6)] },
    );
    setErrors(found);
    if (!ok(found)) return;

    setPending(true);
    const result = await signIn(email.trim(), password);
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
    setErrors({});
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

          <form className="card card-pad home-signin-form" onSubmit={submit} noValidate>
            <h3 className="h-card">Sign in to MedLink</h3>
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
                <input className="input" type="password" placeholder="At least 6 characters" value={password}
                  onChange={(e) => setPassword(e.target.value)} aria-label="Password"
                  aria-invalid={errors.password ? true : undefined}
                  aria-describedby={errors.password ? "password-error" : undefined} />
              </div>
              <FieldError error={errors.password} field="password" />
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