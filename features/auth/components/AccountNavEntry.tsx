"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, LogOut, Settings } from "lucide-react";
import { useDismiss } from "@/hooks/useDismiss";
import { useAccount } from "@/features/auth/hooks/useAccount";
import { initialOf } from "@/features/auth/lib/authInput";

const SYNC_NOTE = "Your tasks still live in this browser — sync arrives with the next update.";

/**
 * Account entry in the desktop nav (#445): "Sign in" when signed out; signed
 * in, a circle with the email's initial (plus the email from lg) that opens
 * a small menu with Account settings and Sign out. `itemClassName` comes
 * from AppNav, so it lines up with the other entries in rail and sidebar.
 */
export default function AccountNavEntry({ itemClassName }: { itemClassName: string }) {
  const { pending, email, signOut, signingOut, error } = useAccount();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  useDismiss(open, () => setOpen(false), [menuRef, buttonRef], buttonRef);

  // Same footprint while the session loads, so the nav doesn't jump.
  if (pending) return <div aria-hidden className={`${itemClassName} pointer-events-none`} />;

  if (!email) {
    return (
      <Link
        href={`/sign-in?next=${encodeURIComponent(pathname)}`}
        aria-label="Sign in"
        title="Sign in"
        className={itemClassName}
      >
        <LogIn size={18} strokeWidth={1.8} className="shrink-0" />
        <span className="hidden flex-1 lg:inline">Sign in</span>
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Account: ${email}`}
        aria-expanded={open}
        aria-controls={menuId}
        title={email}
        className={`${itemClassName} cursor-pointer`}
      >
        <span
          aria-hidden
          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-content"
        >
          {initialOf(email)}
        </span>
        <span className="hidden min-w-0 flex-1 truncate text-left lg:inline">{email}</span>
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          className="absolute bottom-0 left-full z-50 ml-2 w-64 rounded-box border border-line-strong bg-base-300 p-1 shadow-overlay lg:bottom-full lg:left-0 lg:mb-2 lg:ml-0"
        >
          <div className="px-3 pt-2 pb-2.5">
            <p className="truncate text-sm">{email}</p>
            <p className="mt-1 text-xs text-subtle">{SYNC_NOTE}</p>
          </div>
          <Link
            href="/settings#account"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-3 rounded-field px-3 py-2.5 text-sm outline-none! transition-colors hover:bg-line focus-visible:bg-line"
          >
            <Settings size={16} strokeWidth={1.8} />
            Account settings
          </Link>
          <button
            type="button"
            onClick={async () => {
              if (await signOut()) setOpen(false);
            }}
            disabled={signingOut}
            className="flex w-full cursor-pointer items-center gap-3 rounded-field px-3 py-2.5 text-left text-sm text-error outline-none! transition-colors hover:bg-line focus-visible:bg-line"
          >
            <LogOut size={16} strokeWidth={1.8} />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
          {error && (
            <p role="alert" className="px-3 pb-2 text-xs text-error">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
