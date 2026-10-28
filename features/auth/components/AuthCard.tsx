import type { ReactNode } from "react";

type AuthCardProps = {
  eyebrow?: ReactNode;
  title: string;
  description?: ReactNode;
  children: ReactNode;
};

/**
 * The centred card of every auth page (#445): a panel with an eyebrow, the
 * title as the page's `h1` and the form below.
 */
export default function AuthCard({ eyebrow, title, description, children }: AuthCardProps) {
  return (
    <section className="flex w-full max-w-sm flex-col gap-5 surface-panel p-6 sm:p-7">
      <div className="flex flex-col gap-1.5">
        {eyebrow && <p className="font-mono text-eyebrow text-subtle uppercase">{eyebrow}</p>}
        <h1 className="text-[1.65rem] leading-tight font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}
