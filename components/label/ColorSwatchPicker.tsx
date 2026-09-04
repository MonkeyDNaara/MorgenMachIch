"use client";

import { Check } from "lucide-react";
import { LABEL_COLORS, type LabelColorHex } from "@/lib/constants/labelColors";

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
 * even for similarly-light swatches.
 */
export default function ColorSwatchPicker({ value, onChange }: ColorSwatchPickerProps) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Label color">
      {LABEL_COLORS.map(({ name, hex }) => {
        const selected = value === hex;
        return (
          <button
            key={hex}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={name}
            onClick={() => onChange(hex)}
            className="relative h-7 w-7 flex-shrink-0 rounded-full outline-none! transition-transform hover:scale-105"
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
