import type { ReactNode } from "react";
import LogoMark from "@/components/ui/LogoMark";

type StatusPageProps = {
  /** Big monospace headline, e.g. "404", or an icon (offline page). */
  code: ReactNode;
  title: string;
  description: string;
  /** Buttons/links, and anything else under the text. */
  children?: ReactNode;
  /** Fill the whole viewport (global-error has no nav rail around it)
   * instead of the main column next to it. */
  fullScreen?: boolean;
};

/**
 * Shared layout for the 404 and error pages (#177): the logo (#174), a
 * large monospace code in the accent colour, a title, one friendly
 * sentence, then whatever actions the page passes in. One component so not-found,
 * error and global-error stay visually identical.
 */
export default function StatusPage({
  code,
  title,
  description,
  children,
  fullScreen = false,
}: StatusPageProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 p-8 text-center ${
        fullScreen ? "min-h-screen w-full" : "min-h-[70vh]"
      }`}
    >
      <LogoMark size={48} />
      <p className="font-mono text-7xl font-semibold tracking-tight text-accent">{code}</p>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="max-w-md text-sm text-muted">{description}</p>
      {children}
    </div>
  );
}
