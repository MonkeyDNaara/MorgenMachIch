import { getAuthHandler } from "@/server/auth/neonAuth";
import { createAuthRateLimit } from "@/server/auth/authRateLimit";
import { clientIp } from "@/server/auth/clientIp";

type Context = { params: Promise<{ path: string[] }> };

/** One limiter set per server process (#309); resets on deploy. */
const rateLimit = createAuthRateLimit();

/** The email in a JSON body, for the per-address limit; null when there is none. */
async function emailOf(request: Request): Promise<string | null> {
  try {
    const body: unknown = await request.clone().json();
    const email = (body as { email?: unknown } | null)?.email;
    return typeof email === "string" ? email : null;
  } catch {
    return null;
  }
}

/**
 * `/api/auth/*` (#309): Neon Auth's handler, which the browser's auth client
 * talks to. POSTs that guess passwords or codes, or send emails, are
 * rate-limited first (429 + `Retry-After`, in Better Auth's error shape so
 * the client's `AuthApiError` carries the message).
 */
export async function POST(request: Request, context: Context) {
  const { path } = await context.params;
  const result = rateLimit.check({
    path,
    ip: clientIp(request.headers.get("x-forwarded-for")),
    email: await emailOf(request),
  });
  if (!result.allowed) {
    const minutes = Math.ceil(result.retryAfterSec / 60);
    return Response.json(
      {
        code: "TOO_MANY_REQUESTS",
        message: `Too many attempts. Try again in ${minutes} min.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(result.retryAfterSec), "Cache-Control": "no-store" },
      },
    );
  }
  return getAuthHandler().POST(request, context);
}

export function GET(request: Request, context: Context) {
  return getAuthHandler().GET(request, context);
}

export function PUT(request: Request, context: Context) {
  return getAuthHandler().PUT(request, context);
}

export function PATCH(request: Request, context: Context) {
  return getAuthHandler().PATCH(request, context);
}

export function DELETE(request: Request, context: Context) {
  return getAuthHandler().DELETE(request, context);
}
