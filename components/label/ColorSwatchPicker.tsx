"use client";

import { Check } from "lucide-react";
import { LABEL_COLORS, type LabelColorHex } from "@/lib/constants/labelColors";
import { useRadioGroupKeys } from "@/hooks/useRadioGroupKeys";

type ColorSwatchPickerProps = {
  value: LabelColorHex;
  onChange: (color: LabelColorHex) => void;
};

/**
 * Grid of the 12 fixed label colors (lib/constants/labelColors) — no
 * free color picker, so every label stays visually consistent with the
 * rest of the app instead of opening up arbitrary hex input. The
 * selected swatch gets a halo (base background ring + the swatch's own
 * color as an outer ring) plus a checkmark, so selection reads clearly
 * even for similarly-light swatches. Keyboard (#272): one tab stop,
 * arrow keys and Home/End move through the colors; the focus ring is an
 * outline outside the halo, because the halo already uses box-shadow.
 */
export default function ColorSwatchPicker({ value, onChange }: ColorSwatchPickerProps) {
  const radios = useRadioGroupKeys({
    count: LABEL_COLORS.length,
    selectedIndex: LABEL_COLORS.findIndex((color) => color.hex === value),
    onSelect: (index) => onChange(LABEL_COLORS[index].hex),
  });

  return (
    <div
      className="flex flex-wrap gap-2"
      role="radiogroup"
      aria-label="Label color"
      {...radios.groupProps}
    >
      {LABEL_COLORS.map(({ name, hex }, index) => {
        const selected = value === hex;
        return (
          <button
            key={hex}
            {...radios.itemProps(index)}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={name}
            onClick={() => onChange(hex)}
            className="relative h-7 w-7 flex-shrink-0 rounded-full outline-none transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-[6px] focus-visible:outline-accent"
            style={{
              backgroundColor: hex,
              boxShadow: selected
                ? `0 0 0 2px var(--color-base-100), 0 0 0 4px ${hex}`
                : undefined,
            }}
          >
            {selected && (
              <Check size={14} className="absolute inset-0 m-auto text-base-100" strokeWidth={3} />
            )}
          </button>
        );
      })}
    </div>
  );
}
