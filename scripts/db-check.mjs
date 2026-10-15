// `npm run db:check` (#304): one query against the database in .env.local, to check the
// connection. Prints the server version and timings — never the connection string.
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is missing — see .env.example.");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 15 });
try {
  let t = performance.now();
  const [{ version }] = await sql`select version()`;
  const first = Math.round(performance.now() - t);
  t = performance.now();
  await sql`select 1`;
  const warm = Math.round(performance.now() - t);
  console.log(
    `✓ ${version.split(" on ")[0]} — first query ${first} ms (incl. connect/wake-up), then ${warm} ms`,
  );
} catch (error) {
  console.error(
    `✗ ${error.code ?? ""} ${String(error.message).replace(/postgres(ql)?:\/\/\S+/g, "<url>")}`,
  );
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 2 });
}
