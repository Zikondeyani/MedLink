import { useEffect, useRef, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { errorId, type FieldErrors } from "../../lib/validate";

/**
 * The one inline validation message in the app.
 *
 * Renders nothing when the field is fine, so a form can leave it in the
 * markup unconditionally instead of guarding every one with &&.
 */
export function FieldError({
  error,
  field,
}: {
  error?: string;
  /** Field name, used to derive the id a control points at with aria-describedby. */
  field?: string;
}) {
  if (!error) return null;
  return (
    <em className="field-err" id={field ? errorId(field) : undefined} role="alert">
      <AlertCircle size={12} aria-hidden /> {error}
    </em>
  );
}

/**
 * Props for a control that can be invalid. Spread onto the input, select or
 * textarea so the red border, the aria-invalid state and the link to the
 * message all stay in step.
 *
 * `base` is the control's own class (usually "input", "select" or "textarea")
 * and is always kept — the invalid variant is appended, never substituted.
 */
export function invalidProps(
  errors: FieldErrors,
  field: string,
  base: "input" | "select" | "textarea",
): { className: string; "aria-invalid": true | undefined; "aria-describedby": string | undefined } {
  const bad = Boolean(errors[field]);
  return {
    className: bad ? `${base} field-error` : base,
    "aria-invalid": bad || undefined,
    "aria-describedby": bad ? errorId(field) : undefined,
  };
}

/**
 * The same, for a control nested in div.input-wrap. The border lives on the
 * wrapper, so the inner input keeps its own class and only gets the aria
 * state.
 */
export function wrappedInvalidProps(
  errors: FieldErrors,
  field: string,
): { className: string; "aria-invalid": true | undefined; "aria-describedby": string | undefined } {
  const bad = Boolean(errors[field]);
  return {
    className: bad ? "input-wrap input-wrap-error" : "input-wrap",
    "aria-invalid": bad || undefined,
    "aria-describedby": bad ? errorId(field) : undefined,
  };
}

/**
 * A short list of what is wrong, shown at the top of a long form.
 *
 * Inline messages alone are easy to miss on a five-step wizard where the
 * offending field may be off-screen, so forms that gate more than a couple
 * of fields also show this. It is a live region, so the count is announced
 * without moving focus.
 */
export function ErrorSummary({
  errors,
  order,
  children,
}: {
  errors: FieldErrors;
  /** Field names in the order they appear on screen. */
  order: string[];
  children?: ReactNode;
}) {
  const problems = order.filter((name) => errors[name]);
  const ref = useRef<HTMLDivElement>(null);

  // Mounting means "the user just tried to continue and something is wrong",
  // so take focus and let the browser scroll the list into view. Fixing a
  // field does not remount this, so focus is never stolen mid-edit.
  useEffect(() => {
    ref.current?.focus();
  }, []);

  if (problems.length === 0) return null;

  return (
    <div className="error-summary" role="alert" tabIndex={-1} ref={ref}>
      <b className="small">
        <AlertCircle size={14} aria-hidden />{" "}
        {problems.length === 1
          ? "There is 1 problem with this form"
          : `There are ${problems.length} problems with this form`}
      </b>
      <ul>
        {problems.map((name) => (
          <li key={name}>
            <span>{name}</span>
            <span className="error-summary-msg">{errors[name]}</span>
          </li>
        ))}
      </ul>
      {children}
    </div>
  );
}
