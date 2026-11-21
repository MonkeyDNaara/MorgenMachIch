import { errorResponse } from "@/server/auth/requireUser";

/**
 * Any `/api/v1` path without a route (#455) answers in the error contract instead of
 * Next's HTML 404 page. Real routes always win over this catch-all.
 */
function notFound(): Response {
  return errorResponse(404, "not_found", "There is no such endpoint. See docs/API.md.");
}

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
