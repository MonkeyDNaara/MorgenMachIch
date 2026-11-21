import "server-only";
import { ApiError } from "@/server/api/errors";
import { isJsonContentType } from "@/server/api/json";

const BODY_METHODS = new Set(["POST", "PUT", "PATCH"]);
const WRITE_METHODS = new Set([...BODY_METHODS, "DELETE"]);

/** The host the request was sent to (`x-forwarded-host` behind Render, else `host`). */
function requestHost(headers: Headers): string | null {
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  return host?.split(",")[0]?.trim().toLowerCase() || null;
}

/** True when the browser says the write comes from our own pages. */
function isSameOrigin(headers: Headers): boolean {
  // Modern browsers send this on every fetch; it can't be set by page scripts.
  const site = headers.get("sec-fetch-site");
  if (site) return site === "same-origin";

  const origin = headers.get("origin");
  if (!origin || origin === "null") return false;
  try {
    return new URL(origin).host === requestHost(headers);
  } catch {
    return false;
  }
}

/**
 * CSRF protection for cookie sessions (#455), checked before the session itself:
 *
 * - `POST` / `PUT` / `PATCH` must be `application/json` (415). An HTML form can't send that
 *   type, and a cross-site `fetch` with it needs a CORS preflight we never answer.
 * - A write that carries cookies must come from our own origin (`Sec-Fetch-Site:
 *   same-origin`, else a matching `Origin`), otherwise 403 `forbidden_origin`. Callers
 *   without cookies (n8n and Claude with an API key, #315) aren't affected.
 *
 * Returns the error to answer with, or null when the request may continue.
 */
export function checkRequest(request: Request): ApiError | null {
  const { method, headers } = request;
  if (!WRITE_METHODS.has(method)) return null;
  if (BODY_METHODS.has(method) && !isJsonContentType(headers.get("content-type"))) {
    return new ApiError(415, "unsupported_media_type", "Send the body as application/json.");
  }
  if (headers.has("cookie") && !isSameOrigin(headers)) {
    return new ApiError(403, "forbidden_origin", "Cross-site requests are not allowed.");
  }
  return null;
}
