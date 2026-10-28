"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthAlert from "@/features/auth/components/AuthAlert";
import TextField from "@/features/auth/components/TextField";
import { authClient } from "@/features/auth/lib/authClient";
import { authCall } from "@/features/auth/lib/authCall";
import { authErrorMessage } from "@/features/auth/lib/authErrors";

/**
 * Step 1 of the password reset (#445): asks Neon Auth to email a 6-digit
 * code, then continues on /reset-password. Neon answers the same whether
 * an account exists or not, so the page never reveals that either.
 */
export default function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const address = email.trim();
      await authCall(authClient.emailOtp.requestPasswordReset({ email: address }));
      router.push(`/reset-password?email=${encodeURIComponent(address)}`);
    } catch (caught) {
      setError(authErrorMessage(caught));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <AuthAlert kind="error">{error}</AuthAlert>}
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
      <button type="submit" disabled={busy} className="btn btn-primary">
        {busy ? "Sending…" : "Send reset code"}
      </button>
      <Link href="/sign-in" className="btn btn-ghost btn-sm self-start text-muted">
        ← Back to sign in
      </Link>
    </form>
  );
}
