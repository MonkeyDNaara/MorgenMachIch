import "server-only";
import type { ZodError } from "zod";

/**
 * Service errors (#404). Routes (#310) turn them into the error contract:
 * NotFound → 404, Validation → 422 (with the Zod issue paths), Forbidden → 403.
 */
export class ServiceError extends Error {
  constructor(
    readonly code: "not_found" | "validation" | "forbidden",
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** The record doesn't exist **for this user** — another user's id looks the same. */
export class NotFoundError extends ServiceError {
  constructor(entity: string, id: string) {
    super("not_found", `${entity} ${id} not found`);
  }
}

export class ValidationError extends ServiceError {
  readonly issues: { path: string; message: string }[];
  constructor(entity: string, error: ZodError) {
    super("validation", `Invalid ${entity}`);
    this.issues = error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
  }
}

/** The request refers to something the user may not use (e.g. another user's label). */
export class ForbiddenError extends ServiceError {
  constructor(message: string) {
    super("forbidden", message);
  }
}
