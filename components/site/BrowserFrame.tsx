import type { ReactNode } from "react";
import { FRAME_HOST } from "@/lib/site/content";

type BrowserFrameProps = {
  /** Path shown after the host in the address bar, e.g. "/today". */
  path: string;
  children: ReactNode;
  className?: string;
};

/** A drawn browser window around a screenshot (#376): three dots and an address bar. */
export default function BrowserFrame({ path, children, className = "" }: BrowserFrameProps) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-line-strong bg-base-100 shadow-overlay ${className}`}
    >
      <div
        aria-hidden="true"
        className="flex items-center gap-1.5 border-b border-line bg-base-200 px-3 py-2.5"
      >
        <span className="size-2.5 rounded-full bg-line-strong" />
        <span className="size-2.5 rounded-full bg-line-strong" />
        <span className="size-2.5 rounded-full bg-line-strong" />
        <span className="ml-3 truncate font-mono text-[11px] text-faint">
          {FRAME_HOST}
          {path}
        </span>
      </div>
      {children}
    </div>
  );
}
