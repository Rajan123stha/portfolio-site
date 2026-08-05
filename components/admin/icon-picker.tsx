"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ICON_NAMES, resolveIcon, type IconName } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { controlClass } from "./form-field";

type IconPickerProps = {
  value: string;
  onChange: (value: IconName) => void;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

/**
 * Picks from the curated icon registry.
 *
 * A free-text field would let an editor save a name that doesn't resolve, and
 * the section would render a fallback glyph with no explanation. Constraining
 * the choice to what `lib/design-tokens` actually exports makes that
 * unrepresentable.
 */
export function IconPicker({
  value,
  onChange,
  id,
  ...aria
}: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const Selected = resolveIcon(value);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return ICON_NAMES;
    return ICON_NAMES.filter((name) => name.toLowerCase().includes(term));
  }, [query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          {...aria}
          className={cn(controlClass, "flex h-10 items-center gap-2 text-left")}
        >
          <Selected aria-hidden className="h-4 w-4 shrink-0 text-primary" />
          <span className="flex-1 truncate">{value || "Choose an icon"}</span>
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-72 p-0">
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search icons…"
            aria-label="Search icons"
            className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {results.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No icons match “{query}”.
          </p>
        ) : (
          <div className="grid max-h-64 grid-cols-6 gap-1 overflow-y-auto p-2">
            {results.map((name) => {
              const Icon = resolveIcon(name);
              const selected = name === value;

              return (
                <button
                  key={name}
                  type="button"
                  title={name}
                  aria-label={name}
                  aria-pressed={selected}
                  onClick={() => {
                    onChange(name);
                    setOpen(false);
                  }}
                  className={cn(
                    "relative flex h-9 items-center justify-center rounded-md transition-colors hover:bg-muted",
                    selected && "bg-primary/10 text-primary",
                  )}
                >
                  <Icon aria-hidden className="h-4 w-4" />
                  {selected ? (
                    <Check
                      aria-hidden
                      className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-primary p-0.5 text-primary-foreground"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
