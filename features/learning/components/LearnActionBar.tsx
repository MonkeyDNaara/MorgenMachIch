import type { ReactNode } from "react";

/**
 * The sticky action bar of the Learn page (#467). Below md it sits above the bottom tab bar
 * (same offset the app layout reserves for it), from md up at the viewport edge.
 */
export default function LearnActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 border-t border-line bg-base-100 md:bottom-0">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-3 px-6 py-3">
        {children}
      </div>
    </div>
  );
}
