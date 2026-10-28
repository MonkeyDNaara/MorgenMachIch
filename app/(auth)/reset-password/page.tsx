import type { Metadata } from "next";
import AuthCard from "@/features/auth/components/AuthCard";
import ResetPasswordForm from "@/features/auth/components/ResetPasswordForm";
import { saveTimeZone } from "@/server/auth/actions";

export const metadata: Metadata = { title: "Set a new password" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { email } = await searchParams;
  const initialEmail = (Array.isArray(email) ? email[0] : email) ?? "";
  return (
    <AuthCard title="Set a new password." description="Enter the code from the email.">
      <ResetPasswordForm initialEmail={initialEmail} saveTimeZone={saveTimeZone} />
    </AuthCard>
  );
}
