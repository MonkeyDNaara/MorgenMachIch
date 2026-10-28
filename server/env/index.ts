import "server-only";
import { parseServerEnv, type ServerEnv } from "@/server/env/parseServerEnv";
import { parseAuthEnv, type AuthEnv } from "@/server/env/parseAuthEnv";

let cached: ServerEnv | undefined;

/**
 * Validated server environment. Read lazily on first use, so `next build` and CI
 * (which have no database) never need the variables.
 */
export function getServerEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}

let cachedAuth: AuthEnv | undefined;

/** Validated Neon Auth environment (#309), read lazily on the first auth request. */
export function getAuthEnv(): AuthEnv {
  cachedAuth ??= parseAuthEnv(process.env);
  return cachedAuth;
}
