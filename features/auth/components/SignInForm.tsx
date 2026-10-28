"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthAlert from "@/features/auth/components/AuthAlert";
import PasswordField from "@/features/auth/components/PasswordField";
import TextField from "@/features/auth/components/TextField";
import { authClient } from "@/features/auth/lib/authClient";
import { authCall, browserTimeZone } from "@/features/auth/lib/authCall";
import { authErrorCode, authErrorMessage } from "@/features/auth/lib/authErrors";

type SignInFormProps = {
  /** Where to go after signing in (already checked by safeNextPath). */
  next: string;
  /** Whether the page got a `?next=` — then the links to sign-up and reset pass it on. */
  hasNext: boolean;
  /** A note from the previous step, e.g. "Email confirmed". */
  notice?: string;
  /** Server Action: stores the browser's time zone (best effort). */
  saveTimeZone: (timeZone: string) => Promise<void>;
};

/**
 * Sign-in (#445). An unconfirmed email (sign-up stopped before the code)
 * gets a button that sends a fresh code and continues on the code step.
 */
export default function SignInForm({ next, hasNext, notice, saveTimeZone }: SignInFormProps) {
  const nextQuery = hasNext ? `?next=${encodeURIComponent(next)}` : "";
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [wrongCredentials, setWrongCredentials] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setUnconfirmed(false);
    setWrongCredentials(false);
    try {
      await authCall(authClient.signIn.email({ email: email.trim(), password }));
      await saveTimeZone(browserTimeZone()).catch(() => {});
      router.replace(next);
      router.refresh();
    } catch (caught) {
      const code = authErrorCode(caught);
      if (code === "email_not_confirmed") setUnconfirmed(true);
      else setError(authErrorMessage(caught));
      setWrongCredentials(code === "invalid_credentials");
      setBusy(false);
    }
  }

  async function confirmEmail() {
    setBusy(true);
    setError(null);
    try {
      await authCall(
        authClient.emailOtp.sendVerificationOtp({
          email: email.trim(),
          type: "email-verification",
        }),
      );
      router.push(`/sign-up?verify=${encodeURIComponent(email.trim())}`);
    } catch (caught) {
      setError(authErrorMessage(caught));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {notice && <AuthAlert kind="info">{notice}</AuthAlert>}
      {error && <AuthAlert kind="error">{error}</AuthAlert>}
      {unconfirmed && (
        <AuthAlert kind="info">
          Your email isn&apos;t confirmed yet.{" "}
          <button
            type="button"
            onClick={confirmEmail}
            disabled={busy}
            className="cursor-pointer text-accent underline-offset-2 hover:underline"
          >
            Send a new code
          </button>
        </AuthAlert>
      )}
      <TextField
        label="Email"
        type="email"
        name="email"
        required
        autoComplete="email"
        autoFocus
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <PasswordField
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        invalid={wrongCredentials}
      />
      <button type="submit" disabled={busy} className="btn btn-primary">
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <div className="flex justify-between gap-3 text-sm">
        <Link href={`/forgot-password${nextQuery}`} className="text-accent hover:underline">
          Forgot password?
        </Link>
        <Link href={`/sign-up${nextQuery}`} className="text-accent hover:underline">
          Create an account
        </Link>
      </div>
    </form>
  );
}
