import type { ZodError } from "zod";

/**
 * The contract every server action returns.
 *
 * Actions resolve rather than throw for *expected* failures — validation
 * errors, uniqueness conflicts, missing rows. Throwing would surface Next's
 * error overlay in development and a blank error boundary in production, when
 * what the user actually needs is the message rendered next to the field they
 * got wrong. Genuine bugs still throw and still reach the error boundary.
 */
export type FieldErrors = Record<string, string[]>;

export type ActionResult<TData = undefined> =
  | { ok: true; data: TData; message?: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export function ok(): ActionResult;
export function ok<TData>(data: TData, message?: string): ActionResult<TData>;
export function ok<TData>(data?: TData, message?: string): ActionResult<TData> {
  return { ok: true, data: data as TData, message };
}

export function fail(error: string, fieldErrors?: FieldErrors): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

/**
 * Flattens a Zod error into the shape `react-hook-form` expects, so field
 * messages produced on the server land under the right inputs.
 */
export function invalid(error: ZodError): ActionResult<never> {
  const fieldErrors: FieldErrors = {};

  for (const issue of error.issues) {
    // Array indices are dropped: `bullets.2` reports under `bullets`, which is
    // where the repeatable-list editor renders its error.
    const path = issue.path.filter((part) => typeof part === "string").join(".");
    const key = path || "root";
    (fieldErrors[key] ??= []).push(issue.message);
  }

  return {
    ok: false,
    error: "Please fix the highlighted fields.",
    fieldErrors,
  };
}

/** Narrows a Postgres unique-violation so callers can report a friendly message. */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}
