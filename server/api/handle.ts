import "server-only";
import { createHandler } from "@/server/api/handler";
import { requireUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { services } from "@/server/services";

/**
 * The wrapper every `/api/v1` Route Handler uses (#455): Neon Auth session, the service
 * layer on the app's database, the error contract. See `createHandler()` for the details.
 */
export const handle = createHandler({
  requireUser,
  services: (ctx) => services({ db: getDb(), ...ctx }),
});
