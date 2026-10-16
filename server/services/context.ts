import "server-only";
import type { Database } from "@/server/db/types";

/** Who wrote a row — mirrors the `record_source` enum in the schema. */
export type RecordSource = "ui" | "n8n" | "claude" | "import";

/**
 * Everything a service needs for one request (#404). Built by the route from the
 * session or API key (#309/#315) — `userId` and `source` never come from a request body.
 */
export type ServiceContext = {
  db: Database;
  userId: string;
  source: RecordSource;
};
