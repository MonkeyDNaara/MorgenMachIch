"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { DEMO_EXAMPLES } from "@/features/site/lib/quickAddDemo";

/** Shown until the demo has loaded: the first example as plain text, same size as the field. */
function DemoPlaceholder() {
  return (
    <div className="relative" aria-hidden>
      <div className="input input-md flex w-full items-center pl-10 text-base surface-sunken">
        {DEMO_EXAMPLES[0]}
      </div>
      <Plus
        size={18}
        strokeWidth={2.2}
        className="absolute top-1/2 left-3.5 -translate-y-1/2 text-primary"
      />
    </div>
  );
}

const QuickAddDemo = dynamic(() => import("@/features/site/components/QuickAddDemo"), {
  ssr: false,
  loading: DemoPlaceholder,
});

/**
 * Loads the quick-add demo (#86) only when its section comes near the
 * viewport, so the parser (chrono-node) stays out of the landing page's
 * first load.
 */
export default function QuickAddDemoLoader() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref}>{visible ? <QuickAddDemo /> : <DemoPlaceholder />}</div>;
}
