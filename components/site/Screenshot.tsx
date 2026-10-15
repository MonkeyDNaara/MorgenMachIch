import Image from "next/image";
import { SCREENS_PATH } from "@/lib/site/content";

type ScreenshotProps = {
  /** View id — the file is `{view}-{theme}.webp` (see scripts/screenshots.mjs). */
  view: string;
  theme: "dark" | "light";
  alt: string;
  className?: string;
};

/** One screenshot from public/site/screens (#376), at the 1280×800 it was taken at. */
export default function Screenshot({ view, theme, alt, className = "" }: ScreenshotProps) {
  return (
    <Image
      src={`${SCREENS_PATH}/${view}-${theme}.webp`}
      alt={alt}
      width={1280}
      height={800}
      unoptimized
      className={`h-auto w-full ${className}`}
    />
  );
}
