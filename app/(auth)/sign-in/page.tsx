import type { Metadata } from "next";
import AuthCard from "@/features/auth/components/AuthCard";
import SignInForm from "@/features/auth/components/SignInForm";
import { safeNextPath } from "@/features/auth/lib/authInput";
import { saveTimeZone } from "@/server/auth/actions";

export const metadata: Metadata = { title: "Sign in" };

const NOTICES: Record<string, string> = {
  confirmed: "Email confirmed. Sign in to continue.",
  "password-reset": "Password changed. Sign in with the new one.",
};

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  return (
    <AuthCard eyebrow="Welcome back" title="Sign in.">
      <SignInForm
        next={safeNextPath(first(params.next))}
        hasNext={Boolean(first(params.next))}
        notice={NOTICES[first(params.notice) ?? ""]}
        saveTimeZone={saveTimeZone}
      />
    </AuthCard>
  );
}
