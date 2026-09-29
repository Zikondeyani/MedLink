/* ============================================================
   MedLink — form validation

   One vocabulary of rules, shared by every form in the app.

   The problem this solves: each form used to hand-roll its own
   checks, so the same email rule was written four times and most
   fields either had no check at all or a check whose failure the
   user could not see. A form that silently refuses to continue is
   indistinguishable from a broken button.

   The pattern every form now follows:

     const errors = validate({
       email: [required("Email"), validEmail()],
       price: [required("Price"), nonNegative("Price")],
     });
     if (!ok(errors)) return;   // messages are already rendered

   `collect` runs a field's rules in order and keeps the first
   failure, so a rule list reads top to bottom like a checklist.
   Messages are written as a full sentence naming the field,
   because they are the only thing the user sees.
   ============================================================ */

/** field name -> message. Absent key means the field is fine. */
export type FieldErrors = Record<string, string | undefined>;

/** A single rule: the message to show, or undefined when the value passes. */
export type Rule = (value: string) => string | undefined;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Digits only — what a phone or mobile-money number is really made of. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Run a field's rules and keep the first message produced. */
function firstMessage(value: string, rules: Rule[]): string | undefined {
  for (const rule of rules) {
    const message = rule(value);
    if (message) return message;
  }
  return undefined;
}

/**
 * Validate a whole form. Keys with no failing rule are left out, so
 * `Object.keys(errors).length` is the number of problems to report.
 */
export function collect(
  fields: Record<string, string | undefined>,
  rules: Record<string, Rule[]>,
): FieldErrors {
  const errors: FieldErrors = {};
  for (const [name, value] of Object.entries(fields)) {
    const list = rules[name];
    if (!list) continue;
    const message = firstMessage(value ?? "", list);
    if (message) errors[name] = message;
  }
  return errors;
}

/** True when nothing failed — the guard every submit handler starts with. */
export function ok(errors: FieldErrors): boolean {
  return !Object.values(errors).some(Boolean);
}

/**
 * Re-check a single field, for when the user edits one that already has a
 * message. The key is always present so a now-passing field clears its own
 * message; `ok` and the summary both ignore undefined values.
 */
export function checkOne(name: string, value: string, rules: Rule[]): FieldErrors {
  return { [name]: firstMessage(value ?? "", rules) };
}

/* ---------------- rules ---------------- */

/** The field must not be empty. `label` names it in the message. */
export function required(label: string): Rule {
  return (value) => (value.trim() ? undefined : `${label} is required.`);
}

/** Required, and at least `n` characters once trimmed. */
export function requiredMin(label: string, n: number): Rule {
  return (value) => {
    const text = value.trim();
    if (!text) return `${label} is required.`;
    if (text.length < n) return `${label} must be at least ${n} characters.`;
    return undefined;
  };
}

/** No more than `n` characters — used where a column has a limit. */
export function maxLength(label: string, n: number): Rule {
  return (value) =>
    value.trim().length > n ? `${label} must be ${n} characters or fewer.` : undefined;
}

/** Optional, but if present it must look like an email address. */
export function validEmail(): Rule {
  return (value) => {
    const text = value.trim();
    if (!text) return undefined;
    return EMAIL.test(text) ? undefined : "Enter a valid email address, like name@company.mw.";
  };
}

/** Required and a well-formed email address. */
export function requiredEmail(): Rule {
  return (value) => {
    const text = value.trim();
    if (!text) return "Email is required.";
    return EMAIL.test(text) ? undefined : "Enter a valid email address, like name@company.mw.";
  };
}

/**
 * Malawi numbers: an optional +265 or 0, then 9 digits. Lenient about
 * spacing and dashes because people type "0991 234 567".
 */
export function validPhone(label = "Phone number"): Rule {
  return (value) => {
    const text = value.trim();
    if (!text) return `${label} is required.`;
    if (!/^\+?265[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{3}$/.test(text) && !/^0\d{9}$/.test(text.replace(/[\s-]/g, ""))) {
      return "Enter a valid phone number, like 0991 234 567 or +265 991 234 567.";
    }
    return undefined;
  };
}

/** Optional, but if present it must be 9 digits — a mobile-money number. */
export function mobileMoney(): Rule {
  return (value) => {
    const text = value.trim();
    if (!text) return undefined;
    return digitsOnly(text).length === 9
      ? undefined
      : "Enter the 9-digit mobile money number.";
  };
}

/** A whole number that is not negative, e.g. a price or a stock count. */
export function nonNegative(label: string): Rule {
  return (value) => {
    const text = value.trim();
    if (!text) return `${label} is required.`;
    const n = Number(text);
    if (!Number.isFinite(n)) return `${label} must be a number.`;
    if (n < 0) return `${label} cannot be negative.`;
    return undefined;
  };
}

/** A whole number within an inclusive range. */
export function inRange(label: string, min: number, max: number): Rule {
  return (value) => {
    const text = value.trim();
    if (!text) return `${label} is required.`;
    const n = Number(text);
    if (!Number.isFinite(n)) return `${label} must be a number.`;
    if (n < min || n > max) return `${label} must be between ${min} and ${max}.`;
    return undefined;
  };
}

/** A non-negative whole number — stock counts cannot be fractional. */
export function wholeNumber(label: string): Rule {
  return (value) => {
    const text = value.trim();
    if (!text) return `${label} is required.`;
    const n = Number(text);
    if (!Number.isFinite(n)) return `${label} must be a number.`;
    if (n < 0) return `${label} cannot be negative.`;
    if (!Number.isInteger(n)) return `${label} must be a whole number.`;
    return undefined;
  };
}

/** Optional website, but if given it must at least contain a domain. */
export function website(): Rule {
  return (value) => {
    const text = value.trim();
    if (!text) return undefined;
    return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(text.replace(/^https?:\/\//, ""))
      ? undefined
      : "Enter a website like yourbusiness.mw.";
  };
}

/** A card number that is 12–19 digits, spaces allowed. */
export function cardNumber(): Rule {
  return (value) => {
    const text = digitsOnly(value);
    if (!text) return "Card number is required.";
    return text.length >= 12 && text.length <= 19
      ? undefined
      : "Enter the card number as printed on the card.";
  };
}

/** Card expiry in MM/YY, not in the past. */
export function cardExpiry(now = new Date()): Rule {
  return (value) => {
    const text = value.trim();
    if (!text) return "Expiry date is required.";
    const match = /^(\d{2})\s*\/\s*(\d{2})$/.exec(text);
    if (!match) return "Use the MM/YY format, for example 08/29.";
    const month = Number(match[1]);
    const year = 2000 + Number(match[2]);
    if (month < 1 || month > 12) return "The month must be between 01 and 12.";
    // The card is valid through the last day of its expiry month.
    const expiresAt = new Date(year, month, 1);
    if (expiresAt <= now) return "That card has expired.";
    return undefined;
  };
}

/** A 3 or 4 digit card security code. */
export function cardCvc(): Rule {
  return (value) => {
    const text = value.trim();
    if (!text) return "Security code is required.";
    return /^\d{3,4}$/.test(text) ? undefined : "The security code is 3 or 4 digits.";
  };
}

/**
 * Two passwords that must match. Not a `Rule`, because it compares two
 * fields rather than one value.
 */
export function passwordsMatch(password: string, confirm: string): string | undefined {
  if (!confirm) return undefined;
  return password === confirm ? undefined : "The two passwords do not match.";
}

/** Build the id used to tie a control to its message for screen readers. */
export function errorId(field: string): string {
  return `${field}-error`;
}

/** Format a list of field names for a summary: "a, b and c". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
