import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { labels } from "@/server/db/schema";
import type { Database } from "@/server/db/types";
import { ForbiddenError } from "@/server/services/errors";

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

/**
 * Label ids sent for a task or series (#406, #407): another user's or an unknown id is
 * refused (`ForbiddenError`), an own label that was deleted meanwhile (stale tab, second
 * device) is dropped silently. Keeps the order, drops duplicates.
 */
export async function checkLabelIds(
  tx: Database,
  userId: string,
  labelIds: string[],
): Promise<string[]> {
  const unique = [...new Set(labelIds)];
  const malformed = unique.find((id) => !isUuid(id));
  if (malformed !== undefined) throw new ForbiddenError(`Unknown label ${malformed}`);
  if (unique.length === 0) return [];
  const owned = await tx
    .select({ id: labels.id, deletedAt: labels.deletedAt })
    .from(labels)
    .where(and(eq(labels.userId, userId), inArray(labels.id, unique)));
  const byId = new Map(owned.map((label) => [label.id, label]));
  const unknown = unique.find((id) => !byId.has(id));
  if (unknown !== undefined) throw new ForbiddenError(`Unknown label ${unknown}`);
  return unique.filter((id) => byId.get(id)?.deletedAt === null);
}
