"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, LogOut } from "lucide-react";
import { useAccount } from "@/features/auth/hooks/useAccount";
import { initialOf } from "@/features/auth/lib/authInput";

/**
 * The account part of the mobile More menu (#445): "Sign in" when signed
 * out; signed in, the email with its initial and "Sign out".
 */
export default function AccountMoreItems({
  itemClassName,
  onDone,
}: {
  itemClassName: string;
  onDone: () => void;
}) {
  const { pending, email, signOut, signingOut } = useAccount();
  const pathname = usePathname();
  if (pending) return null;

  if (!email) {
    return (
      <Link
        href={`/sign-in?next=${encodeURIComponent(pathname)}`}
        onClick={onDone}
        className={itemClassName}
      >
        <LogIn size={16} strokeWidth={1.8} />
        Sign in
      </Link>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 px-3 py-2">
        <span
          aria-hidden
          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-content"
        >
          {initialOf(email)}
        </span>
        <span className="min-w-0 truncate text-sm text-muted">{email}</span>
      </div>
      <button
        type="button"
        onClick={async () => {
          if (await signOut()) onDone();
        }}
        disabled={signingOut}
        className={`${itemClassName} text-error`}
      >
        <LogOut size={16} strokeWidth={1.8} />
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </>
  );
}
