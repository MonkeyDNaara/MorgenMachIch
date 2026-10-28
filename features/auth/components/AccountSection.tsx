"use client";

import Link from "next/link";
import { useAccount } from "@/features/auth/hooks/useAccount";
import { initialOf } from "@/features/auth/lib/authInput";
import { APP_LOCALE } from "@/lib/constants/locale";

/**
 * Settings → Account (#445), the target of the nav's "Account settings"
 * (`/settings#account`): who is signed in, and sign-out. Until the tasks
 * move to the server (#314) an account doesn't hold any data yet, which the
 * text says plainly.
 */
export default function AccountSection() {
  const { pending, email, createdAt, signOut, signingOut, error } = useAccount();

  return (
    <section
      id="account"
      aria-labelledby="account-heading"
      className="flex scroll-mt-6 flex-col gap-4 surface-panel p-4"
    >
      <div className="flex flex-col gap-1">
        <h2 id="account-heading" className="font-mono text-eyebrow text-muted uppercase">
          Account
        </h2>
        <p className="text-xs text-subtle">
          Accounts are new: your tasks still live in this browser until sync arrives.
        </p>
      </div>
      {pending ? (
        <p className="text-sm text-faint">Checking sign-in…</p>
      ) : email ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-content"
            >
              {initialOf(email)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-body">{email}</p>
              {createdAt && (
                <p className="text-xs text-subtle">
                  Signed in · account since{" "}
                  {new Date(createdAt).toLocaleDateString(APP_LOCALE, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={signingOut}
            className="btn btn-ghost btn-sm text-error"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Link href="/sign-in?next=%2Fsettings" className="btn btn-primary btn-sm">
            Sign in
          </Link>
          <Link href="/sign-up?next=%2Fsettings" className="btn btn-ghost btn-sm">
            Create an account
          </Link>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      {email && <p className="text-xs text-faint">Signing out ends the session in every tab.</p>}
    </section>
  );
}
