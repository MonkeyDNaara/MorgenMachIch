"use client";

import { useEffect } from "react";
import { generateOccurrences } from "@/lib/db/occurrences";

/**
 * Runs the recurring-task occurrence generator once per app load (#60).
 * Renders nothing — a pure side-effect trigger, mounted once in the
 * root layout so every route benefits without each page remembering to
 * call it itself.
 */
export default function OccurrenceSync() {
  useEffect(() => {
    generateOccurrences();
  }, []);

  return null;
}
