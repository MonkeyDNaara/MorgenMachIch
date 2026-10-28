import type { Metadata } from "next";
import SignUpFlow from "@/features/auth/components/SignUpFlow";
import { saveTimeZone } from "@/server/auth/actions";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const { verify } = await searchParams;
  const email = Array.isArray(verify) ? verify[0] : verify;
  return <SignUpFlow verifyEmail={email || undefined} saveTimeZone={saveTimeZone} />;
}
