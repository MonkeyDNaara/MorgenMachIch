"use client";

import { useId, useState } from "react";
import BrowserFrame from "@/features/site/components/BrowserFrame";
import Screenshot from "@/features/site/components/Screenshot";
import { SCREENSHOTS } from "@/features/site/lib/content";
import { useRadioGroupKeys } from "@/hooks/useRadioGroupKeys";

const VIEWS = SCREENSHOTS.views;
const THEMES = [
  { theme: "dark", label: "Dark" },
  { theme: "light", label: "Light" },
] as const;

/**
 * Today / Tasks / Calendar / Stats as tabs (#376), each showing the dark
 * and the light screenshot side by side (stacked on phones). WAI-ARIA tabs
 * with automatic activation: one tab stop, arrow keys and Home/End switch
 * the view — the same roving focus as the app's segmented controls (#272).
 * Only the active view's two images are rendered, so the page loads two
 * screenshots here, not eight.
 */
export default function ScreenshotTabs() {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tabs = useRadioGroupKeys({
    count: VIEWS.length,
    selectedIndex: active,
    onSelect: setActive,
  });
  const view = VIEWS[active];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <div
          role="tablist"
          aria-label="App views"
          {...tabs.groupProps}
          className="inline-flex self-start rounded-full surface-sunken p-1"
        >
          {VIEWS.map((item, index) => (
            <button
              key={item.id}
              {...tabs.itemProps(index)}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={index === active}
              aria-controls={`${baseId}-panel`}
              onClick={() => setActive(index)}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-sm outline-none! transition-colors focus-visible:shadow-focus ${
                index === active
                  ? "bg-base-300 text-base-content shadow-raised-sm"
                  : "text-subtle hover:text-base-content"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted">{view.text}</p>
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${view.id}`}
        tabIndex={0}
        className="grid gap-5 rounded-2xl outline-none! focus-visible:shadow-focus lg:grid-cols-2"
      >
        {THEMES.map(({ theme, label }) => (
          <figure key={theme}>
            <BrowserFrame path={`/${view.id}`}>
              <Screenshot
                view={view.id}
                theme={theme}
                alt={`The ${view.label} view of MorgenMachIch in the ${label.toLowerCase()} theme`}
              />
            </BrowserFrame>
            <figcaption className="mt-2.5 font-mono text-meta text-subtle">
              {label} theme
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
