import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/server/db/schema";
import type { Database } from "@/server/db/types";

/**
 * Test database (#404): real Postgres (PGlite, WebAssembly) in-process with our real
 * migrations — no network, no secrets, the same SQL, constraints and transactions as Neon.
 *
 * `neon_auth.user` belongs to Neon Auth, not to our migrations, so a minimal stand-in is
 * created first; our foreign keys point at it like in production.
 */
export async function createTestDb(): Promise<{
  db: Database;
  /** The raw PGlite client, for SQL a test wants to run outside Drizzle. */
  client: PGlite;
  close: () => Promise<void>;
}> {
  const client = new PGlite();
  await client.exec(`
    create schema neon_auth;
    create table neon_auth."user" (
      id uuid primary key,
      name text not null,
      email text not null unique
    );
  `);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: resolve(process.cwd(), "server/db/migrations") });
  return { db, client, close: () => client.close() };
}

/** Inserts a user into the `neon_auth.user` stand-in and returns its id. */
export async function createTestUser(db: Database, name = "Test user"): Promise<string> {
  const id = randomUUID();
  await db.execute(
    sql`insert into neon_auth."user" (id, name, email) values (${id}, ${name}, ${`${id}@example.test`})`,
  );
  return id;
}
