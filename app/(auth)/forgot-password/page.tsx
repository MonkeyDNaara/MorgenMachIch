import type { Metadata } from "next";
import AuthCard from "@/features/auth/components/AuthCard";
import ForgotPasswordForm from "@/features/auth/components/ForgotPasswordForm";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Forgot it?" description="Happens. We'll email you a code to set a new one.">
      <ForgotPasswordForm />
    </AuthCard>
  );
}
