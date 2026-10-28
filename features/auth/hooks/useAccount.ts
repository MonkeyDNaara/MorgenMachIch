"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/features/auth/lib/authClient";
import { authErrorMessage } from "@/features/auth/lib/authErrors";

/**
 * The signed-in user and sign-out, shared by the nav entry, the mobile More
 * menu and Settings → Account (#445). The auth client keeps the session in
 * sync across tabs.
 */
export function useAccount() {
  const router = useRouter();
  const session = authClient.useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = session.data?.user ?? null;

  async function signOut(): Promise<boolean> {
    setSigningOut(true);
    setError(null);
    try {
      await authClient.signOut();
      router.refresh();
      return true;
    } catch (caught) {
      setError(authErrorMessage(caught));
      return false;
    } finally {
      setSigningOut(false);
    }
  }

  return {
    pending: session.isPending,
    email: user?.email ?? null,
    createdAt: user?.createdAt ?? null,
    signOut,
    signingOut,
    error,
  };
}
