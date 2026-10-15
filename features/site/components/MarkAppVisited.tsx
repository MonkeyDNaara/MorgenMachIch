"use client";

import { useEffect } from "react";
import { appVisited } from "@/features/site/lib/appVisited";

/** Remembers that this browser has used the app, so `/` skips the landing
 * page next time (#83). Renders nothing. */
export default function MarkAppVisited() {
  useEffect(() => {
    if (!appVisited.read()) appVisited.write(true);
  }, []);
  return null;
}
