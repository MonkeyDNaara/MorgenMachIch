"use client";

import type { LearningSlot } from "@/features/learning/lib/learningStore";
import { useRadioGroupKeys } from "@/hooks/useRadioGroupKeys";

const SLOTS: { value: LearningSlot; label: string }[] = [
  { value: "today", label: "New" },
  { value: "review", label: "Review" },
];

type LearnSlotSwitchProps = {
  slot: LearningSlot;
  onChange: (slot: LearningSlot) => void;
};

/**
 * `New | Review` on /learn (#481): a segmented radiogroup like the priority selector, one tab
 * stop, arrow keys and Home/End switch the slot and keep the focus on the control (#272).
 */
export default function LearnSlotSwitch({ slot, onChange }: LearnSlotSwitchProps) {
  const radios = useRadioGroupKeys({
    count: SLOTS.length,
    selectedIndex: SLOTS.findIndex((item) => item.value === slot),
    onSelect: (index) => onChange(SLOTS[index].value),
  });

  return (
    <div
      role="radiogroup"
      aria-label="Learning topic"
      {...radios.groupProps}
      className="grid w-full max-w-xs grid-cols-2 gap-0.5 rounded-xl surface-sunken p-1"
    >
      {SLOTS.map((item, index) => {
        const selected = item.value === slot;
        return (
          <button
            key={item.value}
            {...radios.itemProps(index)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(item.value)}
            className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-3 text-sm outline-none! transition-colors focus-visible:shadow-focus ${
              selected
                ? "bg-base-300 text-base-content shadow-raised-sm"
                : "text-muted hover:text-base-content"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
