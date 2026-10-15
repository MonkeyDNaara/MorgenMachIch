"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { loadSampleData } from "@/features/demo/lib/loadSampleData";
import { SAMPLE_DATA_PARAM, takeUrlFlag } from "@/lib/utils/urlFlag";

/**
 * `/today?sample=1` (#84): the landing page's "Try it with sample data".
 * Loads the sample data once — only into an empty app — tells the user
 * what happened and removes the flag from the URL, so a reload doesn't
 * try again. Renders nothing.
 */
export default function SampleDataFromUrl() {
  const { notify } = useToast();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    const { set, search } = takeUrlFlag(window.location.search, SAMPLE_DATA_PARAM);
    if (!set) return;
    started.current = true;
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${search}${window.location.hash}`,
    );
    loadSampleData()
      .then((result) =>
        notify(
          result === "loaded"
            ? "Sample data loaded — delete it any time in Settings"
            : "You already have tasks — sample data wasn't loaded",
        ),
      )
      .catch((error) => {
        console.error(error);
        notify("Couldn't load the sample data");
      });
  }, [notify]);

  return null;
}
