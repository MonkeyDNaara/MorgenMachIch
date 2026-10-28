import type { ReactNode } from "react";

/**
 * Inline message in an auth form (#445). Errors are announced right away
 * (`role="alert"`), notes politely (`role="status"`).
 */
export default function AuthAlert({
  kind,
  children,
}: {
  kind: "error" | "info";
  children: ReactNode;
}) {
  return kind === "error" ? (
    <p
      role="alert"
      className="rounded-field border border-error/30 bg-error/10 px-3 py-2 text-sm text-error"
    >
      {children}
    </p>
  ) : (
    <p role="status" className="rounded-field surface-sunken px-3 py-2 text-sm text-muted">
      {children}
    </p>
  );
}
