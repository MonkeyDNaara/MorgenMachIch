import "server-only";
import { ZodError } from "zod";
import { errorResponse } from "@/server/auth/requireUser";
import { ServiceError, ValidationError, type ValidationIssue } from "@/server/services/errors";

/**
 * An error the API layer raises itself (#455): bad JSON, wrong content type, body too
 * large, a cross-site write. Carries its HTTP status and the contract's `code`.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Zod issues in the contract's shape: dotted paths ("subtasks.0.title"). */
export function zodIssues(error: ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
}

const SERVICE_STATUS: Record<ServiceError["code"], number> = {
  not_found: 404,
  validation: 422,
  forbidden: 403,
};

/**
 * Any thrown error → the error contract `{ error: { code, message, details? } }` (#455).
 * Only errors meant for the client keep their message; anything unexpected is a 500
 * without details, and the real error goes to the server log.
 */
export function errorToResponse(error: unknown): Response {
  if (error instanceof ApiError) return errorResponse(error.status, error.code, error.message);
  if (error instanceof ValidationError) {
    return errorResponse(422, "validation", error.message, { issues: error.issues });
  }
  if (error instanceof ServiceError) {
    return errorResponse(SERVICE_STATUS[error.code], error.code, error.message);
  }
  // A request schema in a route (`Schema.parse(body)`) failed.
  if (error instanceof ZodError) {
    return errorResponse(422, "validation", "Invalid request body", {
      issues: zodIssues(error),
    });
  }
  console.error("Unexpected API error", error);
  return errorResponse(500, "internal_error", "Something went wrong. Try again shortly.");
}
