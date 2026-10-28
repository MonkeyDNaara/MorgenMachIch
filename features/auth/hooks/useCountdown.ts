"use client";

import { useEffect, useState } from "react";

/**
 * Seconds left until something may happen again, e.g. "Resend code" (#445).
 * `restart()` starts a new countdown from `seconds`.
 */
export function useCountdown(seconds: number, startRunning = true) {
  const [endsAt, setEndsAt] = useState<number | null>(() =>
    startRunning ? Date.now() + seconds * 1000 : null,
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endsAt === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  const remaining = endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000));
  return {
    remaining,
    restart: () => {
      setNow(Date.now());
      setEndsAt(Date.now() + seconds * 1000);
    },
  };
}
