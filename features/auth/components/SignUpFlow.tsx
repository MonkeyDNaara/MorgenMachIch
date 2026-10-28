"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthAlert from "@/features/auth/components/AuthAlert";
import AuthCard from "@/features/auth/components/AuthCard";
import CodeField from "@/features/auth/components/CodeField";
import PasswordField from "@/features/auth/components/PasswordField";
import TextField from "@/features/auth/components/TextField";
import { useCountdown } from "@/features/auth/hooks/useCountdown";
import { authClient } from "@/features/auth/lib/authClient";
import { authCall, browserTimeZone, hasSession } from "@/features/auth/lib/authCall";
import { authErrorMessage } from "@/features/auth/lib/authErrors";
import { formatCountdown, nameFromEmail } from "@/features/auth/lib/authInput";
import { passwordProblem } from "@/features/auth/lib/password";

const RESEND_SECONDS = 60;

type SignUpFlowProps = {
  /** Set when sign-in sent a fresh code for an unconfirmed email: start on the code step. */
  verifyEmail?: string;
  saveTimeZone: (timeZone: string) => Promise<void>;
};

/**
 * Sign-up in two steps (#445): email + password → the 6-digit code from the
 * email → signed in. The form requests the code right after sign-up. If
 * confirming doesn't sign in on its own, the password from step 1 does;
 * when it's unknown (coming from sign-in), the user signs in again.
 */
export default function SignUpFlow({ verifyEmail, saveTimeZone }: SignUpFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<"details" | "code">(verifyEmail ? "code" : "details");
  const [email, setEmail] = useState(verifyEmail ?? "");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const resend = useCountdown(RESEND_SECONDS, Boolean(verifyEmail));

  async function finish() {
    await saveTimeZone(browserTimeZone()).catch(() => {});
    router.replace("/today");
    router.refresh();
  }

  async function handleDetails(event: FormEvent) {
    event.preventDefault();
    const problem = passwordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const address = email.trim();
      await authCall(
        authClient.signUp.email({ email: address, password, name: nameFromEmail(address) }),
      );
      // Neon Auth requires a confirmed email, but its "send a code on sign-up"
      // option is off and can't be changed from the console, so the form asks
      // for the code itself. If Neon ever sends one on its own, two mails arrive
      // and only the newer code works.
      let sent = true;
      try {
        await authCall(
          authClient.emailOtp.sendVerificationOtp({ email: address, type: "email-verification" }),
        );
      } catch {
        sent = false;
      }
      setEmail(address);
      setStep("code");
      setInfo(sent ? null : "We couldn't send the code. Try “Resend code” in a minute.");
      resend.restart();
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function handleCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await authCall(authClient.emailOtp.verifyEmail({ email, otp: code }));
      if (hasSession(await authClient.getSession())) return await finish();
      if (password) {
        await authCall(authClient.signIn.email({ email, password }));
        return await finish();
      }
      router.replace("/sign-in?notice=confirmed");
    } catch (caught) {
      setError(authErrorMessage(caught));
      setBusy(false);
    }
  }

  async function sendNewCode() {
    setError(null);
    setInfo(null);
    try {
      await authCall(
        authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" }),
      );
      setCode("");
      setInfo("A new code is on its way.");
      resend.restart();
    } catch (caught) {
      setError(authErrorMessage(caught));
    }
  }

  if (step === "code") {
    return (
      <AuthCard
        eyebrow="Step 2 of 2"
        title="Check your inbox."
        description={
          <>
            We sent a 6-digit code to <span className="text-base-content">{email}</span>.
          </>
        }
      >
        <form onSubmit={handleCode} className="flex flex-col gap-4">
          {error && <AuthAlert kind="error">{error}</AuthAlert>}
          {info && <AuthAlert kind="info">{info}</AuthAlert>}
          <CodeField value={code} onChange={setCode} invalid={Boolean(error)} />
          <button type="submit" disabled={busy || code.length !== 6} className="btn btn-primary">
            {busy ? "Confirming…" : "Confirm"}
          </button>
          <p className="text-sm text-subtle">
            Didn&apos;t get it?{" "}
            {resend.remaining > 0 ? (
              <span className="font-mono text-meta">
                Resend in {formatCountdown(resend.remaining)}
              </span>
            ) : (
              <button
                type="button"
                onClick={sendNewCode}
                className="cursor-pointer text-accent underline-offset-2 hover:underline"
              >
                Resend code
              </button>
            )}
          </p>
          <button
            type="button"
            onClick={() => {
              setStep("details");
              setCode("");
              setError(null);
              setInfo(null);
            }}
            className="btn btn-ghost btn-sm self-start text-muted"
          >
            ← Use another email
          </button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard eyebrow="Step 1 of 2" title="Create your account.">
      <form onSubmit={handleDetails} className="flex flex-col gap-4">
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
        <PasswordField value={password} onChange={setPassword} autoComplete="new-password" />
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? "Creating…" : "Continue"}
        </button>
        <p className="text-sm text-subtle">
          Have an account?{" "}
          <Link href="/sign-in" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
