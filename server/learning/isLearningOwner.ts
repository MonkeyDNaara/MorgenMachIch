import "server-only";
import { requireUser } from "@/server/auth/session";
import { getLearningEnv } from "@/server/env";
import { isLearningOwnerFrom } from "@/server/learning/owner";

/**
 * Is the signed-in user the learning owner? For Server Components (#467): /learn calls
 * `notFound()` on false, the dashboard row (#468) and the menu item (#469) render nothing.
 * No n8n request is made, and a stranger sees the plain not-found page.
 */
export function isLearningOwner(): Promise<boolean> {
  return isLearningOwnerFrom(getLearningEnv(), async () => {
    const auth = await requireUser();
    return auth.ok ? auth.userId : null;
  });
}
