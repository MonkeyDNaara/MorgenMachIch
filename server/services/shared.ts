import "server-only";
import { sql } from "drizzle-orm";
import type { Database } from "@/server/db/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ids are `uuid` columns: anything else would make Postgres throw ("invalid input syntax
 * for type uuid") — services treat such an id like a missing record instead (#406).
 */
export function isUuid(id: string): boolean {
  return UUID.test(id);
}

/**
 * Serialises one user's writes of one kind (`scope`, e.g. "labels") inside a transaction:
 * Postgres runs transactions in parallel, Dexie never did. Released at commit/rollback.
 */
export async function lockUserScope(tx: Database, scope: string, userId: string): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${scope}:${userId}`}, 0))`);
}
