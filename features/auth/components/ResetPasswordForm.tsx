"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthAlert from "@/features/auth/components/AuthAlert";
import CodeField from "@/features/auth/components/CodeField";
import PasswordField from "@/features/auth/components/PasswordField";
import TextField from "@/features/auth/components/TextField";
import { useCountdown } from "@/features/auth/hooks/useCountdown";
import { authClient } from "@/features/auth/lib/authClient";
import { authCall, browserTimeZone } from "@/features/auth/lib/authCall";
import { authErrorMessage } from "@/features/auth/lib/authErrors";
import { formatCountdown } from "@/features/auth/lib/authInput";
import { passwordProblem } from "@/features/auth/lib/password";

type ResetPasswordFormProps = {
  initialEmail: string;
  saveTimeZone: (timeZone: string) => Promise<void>;
};

/**
 * Step 2 of the password reset (#445): the code from the email and a new
 * password; afterwards it signs in with the new password.
 */
export default function ResetPasswordForm({ initialEmail, saveTimeZone }: ResetPasswordFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(
    initialEmail ? `If an account exists for ${initialEmail}, a code is on its way.` : null,
  );
  const resend = useCountdown(60, Boolean(initialEmail));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const problem = passwordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    const address = email.trim();
    try {
      await authCall(authClient.emailOtp.resetPassword({ email: address, otp: code, password }));
    } catch (caught) {
      setError(authErrorMessage(caught));
      setBusy(false);
      return;
    }
    try {
      await authCall(authClient.signIn.email({ email: address, password }));
      await saveTimeZone(browserTimeZone()).catch(() => {});
      router.replace("/today");
      router.refresh();
    } catch {
      router.replace("/sign-in?notice=password-reset");
    }
  }

  async function sendNewCode() {
    setError(null);
    try {
      await authCall(authClient.emailOtp.requestPasswordReset({ email: email.trim() }));
      setInfo("A new code is on its way.");
      resend.restart();
    } catch (caught) {
      setError(authErrorMessage(caught));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <AuthAlert kind="error">{error}</AuthAlert>}
      {info && <AuthAlert kind="info">{info}</AuthAlert>}
      <TextField
        label="Email"
        type="email"
        name="email"
        required
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <CodeField value={code} onChange={setCode} />
      <PasswordField
        label="New password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
      />
      <button type="submit" disabled={busy || code.length !== 6} className="btn btn-primary">
        {busy ? "Saving…" : "Set new password"}
      </button>
      <p className="text-sm text-subtle">
        No code?{" "}
        {resend.remaining > 0 ? (
          <span className="font-mono text-meta">Resend in {formatCountdown(resend.remaining)}</span>
        ) : (
          <button
            type="button"
            onClick={sendNewCode}
            disabled={!email.trim()}
            className="cursor-pointer text-accent underline-offset-2 hover:underline"
          >
            Send a new code
          </button>
        )}
      </p>
      <Link href="/sign-in" className="btn btn-ghost btn-sm self-start text-muted">
        ← Back to sign in
      </Link>
    </form>
  );
}
