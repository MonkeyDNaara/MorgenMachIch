import "server-only";
import { parseServerEnv, type ServerEnv } from "@/server/env/parseServerEnv";

let cached: ServerEnv | undefined;

/**
 * Validated server environment. Read lazily on first use, so `next build` and CI
 * (which have no database) never need the variables.
 */
export function getServerEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}
