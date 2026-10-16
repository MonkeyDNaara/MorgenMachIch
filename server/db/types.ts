import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "@/server/db/schema";

/**
 * Any Drizzle Postgres database with our schema (#404): the app's postgres.js client
 * (`getDb()`) and the PGlite test database both fit, so services take it as a parameter.
 */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;
