import "server-only";
import { ApiError } from "@/server/api/errors";

/** Default body limit for `/api/v1` (#455). */
export const MAX_JSON_BYTES = 1024 * 1024;
/** The backup import (#460) carries a whole data set. */
export const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

const NO_STORE = { "Cache-Control": "no-store" };

/** `application/json`, with or without parameters such as `; charset=utf-8`. */
export function isJsonContentType(value: string | null): boolean {
  return value?.split(";")[0]?.trim().toLowerCase() === "application/json";
}

function tooLarge(maxBytes: number): ApiError {
  const mb = Math.round(maxBytes / (1024 * 1024));
  return new ApiError(413, "payload_too_large", `The request body is larger than ${mb} MB.`);
}

/** The body as bytes, stopping as soon as it passes the limit (no full read of a huge body). */
async function readBytes(request: Request, maxBytes: number): Promise<Uint8Array> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw tooLarge(maxBytes);
  if (!request.body) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw tooLarge(maxBytes);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/**
 * Reads a JSON request body (#455): 415 unless `Content-Type: application/json`, 413 above
 * `maxBytes`, 400 for an empty body, invalid UTF-8 or unparsable JSON. The result is
 * `unknown` on purpose — the route validates it with a schema from `lib/types/api.ts`.
 */
export async function readJson(
  request: Request,
  { maxBytes = MAX_JSON_BYTES }: { maxBytes?: number } = {},
): Promise<unknown> {
  if (!isJsonContentType(request.headers.get("content-type"))) {
    throw new ApiError(415, "unsupported_media_type", "Send the body as application/json.");
  }
  const bytes = await readBytes(request, maxBytes);
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new ApiError(400, "invalid_json", "The request body is not valid JSON.");
  }
}

/** `200 { data, meta? }`. */
export function ok(data: unknown, meta?: Record<string, unknown>): Response {
  return Response.json(meta ? { data, meta } : { data }, { headers: NO_STORE });
}

/** `201 { data }` with the new resource's address in `Location`. */
export function created(data: unknown, location: string): Response {
  return Response.json({ data }, { status: 201, headers: { ...NO_STORE, Location: location } });
}

/** `204` without a body (deletes). */
export function noContent(): Response {
  return new Response(null, { status: 204, headers: NO_STORE });
}
