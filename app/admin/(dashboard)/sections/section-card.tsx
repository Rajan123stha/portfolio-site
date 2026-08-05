"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { Field, inputClass, textareaClass } from "@/components/admin/form-field";
import { SubmitButton } from "@/components/admin/submit-button";
import { useActionForm } from "@/components/admin/use-action-form";
import { Switch } from "@/components/ui/switch";
import { toggleSectionVisibility, updateSection } from "@/lib/actions/settings";
import type { Section } from "@/db/schema";
import { sectionSchema } from "@/lib/validators/content";
import { cn } from "@/lib/utils";

type SectionCardProps = {
  section: Section;
  meta: { title: string; description: string; anchor: string };
};

export function SectionCard({ section, meta }: SectionCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [isToggling, startToggle] = useTransition();

  // Optimistic mirror of the switch — the toggle is a one-click action, so
  // waiting on the round-trip before moving it feels broken.
  const [visible, setVisible] = useState(section.visible);

  const { form, onSubmit, isPending } = useActionForm({
    schema: sectionSchema,
    action: (values) => updateSection(section.key, values),
    onSuccess: () => router.refresh(),
    defaultValues: {
      eyebrow: section.eyebrow,
      heading: section.heading,
      headingAccent: section.headingAccent ?? "",
      subheading: section.subheading ?? "",
      note: section.note ?? "",
      visible: section.visible,
    },
  });

  const {
    register,
    formState: { errors, isDirty },
  } = form;

  const onToggle = (next: boolean) => {
    setVisible(next);
    startToggle(async () => {
      const result = await toggleSectionVisibility(section.key, next);
      if (!result.ok) {
        setVisible(!next);
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  };

  const isHero = section.key === "hero";

  return (
    <section
      className={cn(
        "rounded-2xl border bg-card shadow-sm transition-opacity",
        visible ? "border-border" : "border-dashed border-border opacity-70",
      )}
    >
      <header className="flex items-start gap-4 px-5 py-4">
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          disabled={isHero}
          className="flex min-w-0 flex-1 items-start gap-3 text-left disabled:cursor-default"
        >
          {!isHero ? (
            <ChevronDown
              aria-hidden
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                expanded && "rotate-180",
              )}
            />
          ) : (
            <span aria-hidden className="w-4 shrink-0" />
          )}

          <span className="min-w-0">
            <span className="block text-sm font-semibold text-foreground">
              {meta.title}
            </span>
            <span className="block text-xs text-muted-foreground text-pretty">
              {section.heading && !isHero
                ? `“${section.heading}${section.headingAccent ? ` ${section.headingAccent}` : ""}”`
                : meta.description}
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {visible ? "Visible" : "Hidden"}
          </span>
          <Switch
            checked={visible}
            onCheckedChange={onToggle}
            disabled={isToggling}
            aria-label={`${visible ? "Hide" : "Show"} the ${meta.title} section`}
          />
        </div>
      </header>

      {expanded && !isHero ? (
        <form
          onSubmit={onSubmit}
          noValidate
          className="space-y-5 border-t border-border p-5"
        >
          <p className="text-xs text-muted-foreground text-pretty">
            {meta.description}
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Eyebrow"
              hint="Small uppercase label above the heading."
              error={errors.eyebrow?.message}
            >
              {(props) => (
                <input
                  {...register("eyebrow")}
                  {...props}
                  className={inputClass}
                  placeholder="Portfolio"
                />
              )}
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Heading" error={errors.heading?.message}>
                {(props) => (
                  <input
                    {...register("heading")}
                    {...props}
                    className={inputClass}
                    placeholder="Featured"
                  />
                )}
              </Field>
              <Field
                label="Accent"
                hint="Rendered in your accent colour."
                error={errors.headingAccent?.message}
              >
                {(props) => (
                  <input
                    {...register("headingAccent")}
                    {...props}
                    className={inputClass}
                    placeholder="Projects"
                  />
                )}
              </Field>
            </div>
          </div>

          <Field
            label="Lede"
            hint="One or two sentences under the heading. Leave blank to hide."
            error={errors.subheading?.message}
          >
            {(props) => (
              <textarea
                {...register("subheading")}
                {...props}
                rows={2}
                className={textareaClass}
              />
            )}
          </Field>

          <Field
            label="Note"
            hint={
              section.key === "value"
                ? "Badge on the last highlight card."
                : section.key === "contact"
                  ? "Bold closing line under the intro."
                  : "Optional footnote."
            }
            error={errors.note?.message}
          >
            {(props) => (
              <input
                {...register("note")}
                {...props}
                className={inputClass}
              />
            )}
          </Field>

          <div className="flex justify-end">
            <SubmitButton isPending={isPending} isDirty={isDirty} />
          </div>
        </form>
      ) : null}
    </section>
  );
}
