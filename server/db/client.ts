import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getServerEnv } from "@/server/env";
import * as schema from "@/server/db/schema";

export type Db = PostgresJsDatabase<typeof schema>;

/**
 * Spike #304: Render runs a long-lived Node server, so one reused TCP connection
 * (postgres.js) is the fastest warm path (~22 ms) and supports interactive
 * transactions. Neon's pooler runs in transaction mode → no prepared statements.
 */
function createDb(): { db: Db; sql: postgres.Sql } {
  const sql = postgres(getServerEnv().DATABASE_URL, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 15,
  });
  return { db: drizzle(sql, { schema }), sql };
}

// Cached on globalThis so `next dev` hot reloads reuse the connection pool.
const globalForDb = globalThis as typeof globalThis & {
  __mmDb?: ReturnType<typeof createDb>;
};

/** The app's database (lazy: created on the first query, not at import). */
export function getDb(): Db {
  globalForDb.__mmDb ??= createDb();
  return globalForDb.__mmDb.db;
}
