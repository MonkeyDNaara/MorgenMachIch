import { NextResponse, type NextRequest } from "next/server";
import packageJson from "@/package.json";
import { getDb } from "@/server/db/client";
import { buildHealthBody, checkDatabase, healthHttpStatus, shortCommit } from "@/server/health";

/**
 * `GET /api/health` (#305): liveness for Render's health check — no database.
 * `GET /api/health?db=1`: deep check with `select 1` against Neon (200 / 503).
 * Route Handlers aren't cached, and reading the request keeps this dynamic.
 */
export async function GET(request: NextRequest) {
  const deep = request.nextUrl.searchParams.get("db") === "1";
  const body = buildHealthBody({
    version: packageJson.version,
    commit: shortCommit(process.env.RENDER_GIT_COMMIT),
    db: deep ? await checkDatabase(getDb) : undefined,
  });
  return NextResponse.json(body, {
    status: healthHttpStatus(body),
    headers: { "Cache-Control": "no-store" },
  });
}
