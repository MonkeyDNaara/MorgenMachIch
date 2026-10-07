import type { ReactNode } from "react";

type StatusPageProps = {
  /** Big monospace headline, e.g. "404". */
  code: string;
  title: string;
  description: string;
  /** Buttons/links, and anything else under the text. */
  children?: ReactNode;
  /** Fill the whole viewport (global-error has no nav rail around it)
   * instead of the main column next to it. */
  fullScreen?: boolean;
};

/**
 * Shared layout for the 404 and error pages (#177): a large monospace
 * code in the accent colour, a title, one friendly sentence, then
 * whatever actions the page passes in. One component so not-found,
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
        fullScreen ? "min-h-screen" : "min-h-[70vh]"
      }`}
    >
      <p className="font-mono text-7xl font-semibold tracking-tight text-primary">{code}</p>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="max-w-md text-sm text-base-content/60">{description}</p>
      {children}
    </div>
  );
}
