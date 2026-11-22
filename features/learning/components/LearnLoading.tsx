import { CANCEL_AFTER_SECONDS, loadingProgress } from "@/features/learning/lib/loadingProgress";

type LearnLoadingProps = {
  label: string;
  seconds: number;
};

/**
 * Loading where the content will appear (#467): a label, an easing bar and a hint — no endless
 * spinner. The ticking seconds stay outside the live region so a screen reader only hears
 * the label once.
 */
export default function LearnLoading({ label, seconds }: LearnLoadingProps) {
  return (
    <div className="flex flex-col gap-3 py-2">
      <p role="status" className="text-sm text-body">
        {label}
      </p>
      <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-track">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
          style={{ width: `${loadingProgress(seconds)}%` }}
        />
      </div>
      <p className="text-xs text-subtle">
        {seconds >= CANCEL_AFTER_SECONDS
          ? "Still working. Longer topics take a bit."
          : "Usually 5–30 s."}
      </p>
    </div>
  );
}
