"use client";

import { GripVertical, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { inputClass, textareaClass } from "./form-field";

type RepeatableListProps = {
  label: string;
  hint?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  /** `textarea` for prose (paragraphs, bullets), `input` for short tags. */
  variant?: "input" | "textarea";
  error?: string;
};

/**
 * Editor for an ordered list of plain strings — about paragraphs, achievement
 * bullets, tech badges, SEO keywords.
 *
 * These have no identity beyond their position, so they're stored as a jsonb
 * array rather than a child table, and edited here as a whole value. Rows are
 * keyed by index, which is normally a bug; it's correct here precisely because
 * the index *is* the identity, and reordering rewrites the whole array anyway.
 */
export function RepeatableList({
  label,
  hint,
  values,
  onChange,
  placeholder,
  addLabel = "Add",
  variant = "textarea",
  error,
}: RepeatableListProps) {
  const update = (index: number, value: string) => {
    const next = [...values];
    next[index] = value;
    onChange(next);
  };

  const remove = (index: number) =>
    onChange(values.filter((_, i) => i !== index));

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= values.length) return;
    const next = [...values];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {hint ? (
            <p className="text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {values.length}
        </span>
      </div>

      {values.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Nothing here yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {values.map((value, index) => (
            <li key={index} className="flex items-start gap-2">
              {/*
                Keyboard-operable reordering. Full drag-and-drop would be
                overkill for a handful of text rows and unusable without a
                mouse; these buttons work for everyone.
              */}
              <div className="flex flex-col pt-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${label} item ${index + 1} up`}
                  className="rounded px-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === values.length - 1}
                  aria-label={`Move ${label} item ${index + 1} down`}
                  className="rounded px-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                >
                  ↓
                </button>
              </div>

              {variant === "textarea" ? (
                <textarea
                  value={value}
                  onChange={(event) => update(index, event.target.value)}
                  placeholder={placeholder}
                  rows={2}
                  aria-label={`${label} item ${index + 1}`}
                  className={cn(textareaClass, "min-h-[64px]")}
                />
              ) : (
                <input
                  value={value}
                  onChange={(event) => update(index, event.target.value)}
                  placeholder={placeholder}
                  aria-label={`${label} item ${index + 1}`}
                  className={inputClass}
                />
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                aria-label={`Remove ${label} item ${index + 1}`}
                className="mt-0.5 h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 aria-hidden className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...values, ""])}
        className="gap-1.5"
      >
        <Plus aria-hidden className="h-3.5 w-3.5" />
        {addLabel}
      </Button>
    </div>
  );
}

/** Drag affordance shared by the sortable lists. */
export function DragHandle(props: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing",
        props.className,
      )}
    >
      <GripVertical aria-hidden className="h-4 w-4" />
    </button>
  );
}
