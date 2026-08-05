"use client";

import { Check } from "lucide-react";

import { COLOR_TOKENS, type ColorToken } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

type ColorPickerProps = {
  value: string;
  onChange: (value: ColorToken) => void;
  id?: string;
};

/**
 * Swatch grid over the theme's colour tokens.
 *
 * Not a native `<input type="color">`: arbitrary hex values would sit outside
 * the palette, ignore dark mode, and — because the class name would be built at
 * runtime — never reach the compiled stylesheet at all.
 */
export function ColorPicker({ value, onChange, id }: ColorPickerProps) {
  return (
    <div
      id={id}
      role="radiogroup"
      aria-label="Colour"
      className="flex flex-wrap gap-1.5"
    >
      {(Object.entries(COLOR_TOKENS) as [ColorToken, { label: string; swatch: string }][]).map(
        ([token, { label, swatch }]) => {
          const selected = token === value;

          return (
            <button
              key={token}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={label}
              title={label}
              onClick={() => onChange(token)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected ? "border-primary" : "border-border",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-md",
                  swatch,
                )}
              >
                {selected ? (
                  <Check className="h-3 w-3 text-white drop-shadow" />
                ) : null}
              </span>
            </button>
          );
        },
      )}
    </div>
  );
}
