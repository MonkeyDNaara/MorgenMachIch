"use client";

import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getTasks } from "@/lib/db/tasks";
import { countOpenToday } from "@/lib/utils/isDueToday";
import { documentTitle } from "@/app/(app)/_components/documentTitle";

type BadgingNavigator = Navigator & {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

/**
 * Keeps the open Today count in the tab title — "(3) Today · MorgenMachIch"
 * — and on the installed app's icon (#187). Renders nothing.
 *
 * Next.js sets the page title from metadata on every navigation, so a
 * MutationObserver on <head> re-applies the count whenever the title
 * changes; `documentTitle` replaces an existing count, and the title is
 * only written when it differs, so the observer never loops.
 *
 * The app badge uses the Badging API (installed Chromium apps); where it
 * is missing or refused, nothing happens.
 */
export default function TitleCount() {
  const count = useLiveQuery(async () => countOpenToday(await getTasks()), []);

  useEffect(() => {
    if (count === undefined) return;
    const apply = () => {
      const next = documentTitle(document.title, count);
      if (next !== document.title) document.title = next;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [count]);

  useEffect(() => {
    if (count === undefined) return;
    const nav = navigator as BadgingNavigator;
    const update = count > 0 ? nav.setAppBadge?.(count) : nav.clearAppBadge?.();
    update?.catch(() => {
      // Not installed or not allowed — the tab title still shows the count.
    });
  }, [count]);

  return null;
}
