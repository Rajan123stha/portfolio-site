"use client";

import { useRouter } from "next/navigation";
import { Controller, useFieldArray } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

import { ColorPicker } from "@/components/admin/color-picker";
import { Field, inputClass, textareaClass } from "@/components/admin/form-field";
import { ImageField } from "@/components/admin/image-field";
import { Panel } from "@/components/admin/page-header";
import { RepeatableList } from "@/components/admin/repeatable-list";
import { SubmitButton } from "@/components/admin/submit-button";
import { useActionForm } from "@/components/admin/use-action-form";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { updateProfile } from "@/lib/actions/settings";
import type { Profile } from "@/db/schema";
import type { ColorToken, HeroBadgePosition } from "@/lib/design-tokens";
import { profileSchema, type ProfileInput } from "@/lib/validators/content";

/** A brand-new install has no row yet, so the form starts from these. */
const BLANK: ProfileInput = {
  greeting: "Hi 👋, I'm",
  fullName: "",
  headline: "",
  typewriterWords: [],
  availabilityLabel: "Available for work",
  availabilityVisible: true,
  heroBio: "",
  openTo: [],
  heroBadges: [],
  avatarUrl: null,
  avatarPublicId: null,
  location: "",
  experienceYears: "",
  experienceLabel: "",
  cvUrl: null,
  aboutParagraphs: [],
  coreStackTitle: "Core Stack",
};

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const router = useRouter();

  const { form, onSubmit, isPending } = useActionForm({
    schema: profileSchema,
    action: updateProfile,
    // `router.refresh()` re-runs the server component so the form's baseline
    // matches what was just persisted, which resets `isDirty` honestly.
    onSuccess: () => router.refresh(),
    defaultValues: profile
      ? {
          greeting: profile.greeting,
          fullName: profile.fullName,
          headline: profile.headline,
          typewriterWords: profile.typewriterWords,
          availabilityLabel: profile.availabilityLabel,
          availabilityVisible: profile.availabilityVisible,
          heroBio: profile.heroBio,
          openTo: profile.openTo,
          heroBadges: profile.heroBadges,
          avatarUrl: profile.avatarUrl,
          avatarPublicId: profile.avatarPublicId,
          location: profile.location,
          experienceYears: profile.experienceYears,
          experienceLabel: profile.experienceLabel,
          cvUrl: profile.cvUrl,
          aboutParagraphs: profile.aboutParagraphs,
          coreStackTitle: profile.coreStackTitle,
        }
      : BLANK,
  });

  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = form;

  const words = useFieldArray({ control, name: "typewriterWords" });
  const badges = useFieldArray({ control, name: "heroBadges" });

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <Panel
        title="Identity"
        description="Shown in the hero and used as the page's author metadata."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Greeting" error={errors.greeting?.message}>
            {(props) => (
              <input
                {...register("greeting")}
                {...props}
                className={inputClass}
                placeholder="Hi 👋, I'm"
              />
            )}
          </Field>

          <Field label="Full name" error={errors.fullName?.message} required>
            {(props) => (
              <input
                {...register("fullName")}
                {...props}
                className={inputClass}
                placeholder="Rajan Shrestha"
              />
            )}
          </Field>

          <Field
            label="Headline"
            hint="Your role, shown under your name in the page's main heading — the line search engines weigh most. Name the work: “Frontend & Full-Stack Developer” beats a slogan."
            error={errors.headline?.message}
          >
            {(props) => (
              <input
                {...register("headline")}
                {...props}
                className={inputClass}
                placeholder="Frontend & Full-Stack Developer"
              />
            )}
          </Field>

          <Field label="Location" error={errors.location?.message}>
            {(props) => (
              <input
                {...register("location")}
                {...props}
                className={inputClass}
                placeholder="Kathmandu, Nepal"
              />
            )}
          </Field>

          <div className="grid grid-cols-[5rem_1fr] gap-3">
            <Field label="Years" error={errors.experienceYears?.message}>
              {(props) => (
                <input
                  {...register("experienceYears")}
                  {...props}
                  className={inputClass}
                  placeholder="1+"
                />
              )}
            </Field>
            <Field label="Experience label" error={errors.experienceLabel?.message}>
              {(props) => (
                <input
                  {...register("experienceLabel")}
                  {...props}
                  className={inputClass}
                  placeholder="yr frontend experience"
                />
              )}
            </Field>
          </div>
        </div>

        <Field
          label="Hero bio"
          hint="One or two sentences. Keep it scannable — this is the first thing visitors read."
          error={errors.heroBio?.message}
          required
        >
          {(props) => (
            <textarea
              {...register("heroBio")}
              {...props}
              rows={3}
              className={textareaClass}
            />
          )}
        </Field>
      </Panel>

      <Panel
        title="Availability"
        description="The pulsing pill above your name."
      >
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Show the availability pill</p>
            <p className="text-xs text-muted-foreground">
              Turn this off when you&apos;re not looking.
            </p>
          </div>
          <Controller
            control={control}
            name="availabilityVisible"
            render={({ field }) => (
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-label="Show the availability pill"
              />
            )}
          />
        </div>

        <Field label="Pill text" error={errors.availabilityLabel?.message}>
          {(props) => (
            <input
              {...register("availabilityLabel")}
              {...props}
              className={inputClass}
              placeholder="Available for work"
            />
          )}
        </Field>

        <Controller
          control={control}
          name="openTo"
          render={({ field }) => (
            <RepeatableList
              label="Open to"
              hint="Short tags under your bio — role types, freelance, contract."
              variant="input"
              placeholder="Frontend / Fullstack roles"
              addLabel="Add tag"
              values={field.value ?? []}
              onChange={field.onChange}
              error={errors.openTo?.message}
            />
          )}
        />
      </Panel>

      <Panel
        title="Typewriter"
        description="Words that animate in one after another beneath your name."
      >
        {words.fields.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No words yet — the typewriter line is hidden.
          </p>
        ) : (
          <ul className="space-y-2">
            {words.fields.map((field, index) => (
              <li key={field.id} className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <input
                    {...register(`typewriterWords.${index}.text`)}
                    className={inputClass}
                    placeholder="Build."
                    aria-label={`Word ${index + 1}`}
                    aria-invalid={Boolean(
                      errors.typewriterWords?.[index]?.text,
                    )}
                  />
                  {/* A blank word fails the schema; without this the save
                      would fail with nothing on screen to explain why. */}
                  {errors.typewriterWords?.[index]?.text?.message ? (
                    <p role="alert" className="text-xs font-medium text-destructive">
                      {errors.typewriterWords[index]?.text?.message}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => words.remove(index)}
                  aria-label={`Remove word ${index + 1}`}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 aria-hidden className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={words.fields.length >= 8}
          onClick={() => words.append({ text: "" })}
          className="gap-1.5"
        >
          <Plus aria-hidden className="h-3.5 w-3.5" />
          Add word
        </Button>
      </Panel>

      <Panel
        title="Portrait & CV"
        description="Your headshot and the file behind the Download CV button."
      >
        <Controller
          control={control}
          name="avatarUrl"
          render={({ field }) => (
            <ImageField
              label="Portrait"
              hint="Not shown on the page — the hero uses a code card instead. Used as the social share image when no dedicated one is set under Settings & SEO."
              aspect="square"
              error={errors.avatarUrl?.message}
              value={field.value ?? null}
              publicId={watch("avatarPublicId") ?? null}
              onChange={({ url, publicId }) => {
                field.onChange(url);
                setValue("avatarPublicId", publicId, { shouldDirty: true });
              }}
            />
          )}
        />

        <Field
          label="CV link"
          hint="A path in /public such as /Rajan_CV.pdf, or a full URL."
          error={errors.cvUrl?.message}
        >
          {(props) => (
            <input
              {...register("cvUrl")}
              {...props}
              className={inputClass}
              placeholder="/Rajan_CV.pdf"
            />
          )}
        </Field>
      </Panel>

      <Panel
        title="Stack"
        description="Rendered as the `stack` array inside the hero's code card. Up to four."
      >
        {badges.fields.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No badges yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {badges.fields.map((field, index) => (
              <li
                key={field.id}
                className="space-y-3 rounded-xl border border-border p-4"
              >
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <input
                      {...register(`heroBadges.${index}.label`)}
                      className={inputClass}
                      placeholder="React"
                      aria-label={`Stack item ${index + 1}`}
                      aria-invalid={Boolean(errors.heroBadges?.[index]?.label)}
                    />
                    {errors.heroBadges?.[index]?.label?.message ? (
                      <p role="alert" className="text-xs font-medium text-destructive">
                        {errors.heroBadges[index]?.label?.message}
                      </p>
                    ) : null}
                  </div>
                  {/*
                    `position` is still stored, but the hero no longer floats
                    these around a portrait, so there is nothing for the control
                    to change. Showing a picker that does nothing is worse than
                    showing none.
                  */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => badges.remove(index)}
                    aria-label={`Remove badge ${index + 1}`}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 aria-hidden className="h-4 w-4" />
                  </Button>
                </div>

                <Controller
                  control={control}
                  name={`heroBadges.${index}.color`}
                  render={({ field: colorField }) => (
                    <ColorPicker
                      value={colorField.value}
                      onChange={colorField.onChange}
                    />
                  )}
                />
              </li>
            ))}
          </ul>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={badges.fields.length >= 4}
          onClick={() =>
            badges.append({
              label: "",
              color: "primary" as ColorToken,
              position: "top-right" as HeroBadgePosition,
            })
          }
          className="gap-1.5"
        >
          <Plus aria-hidden className="h-3.5 w-3.5" />
          Add badge
        </Button>
      </Panel>

      <Panel
        title="About section"
        description="The longer-form paragraphs further down the page."
      >
        <Controller
          control={control}
          name="aboutParagraphs"
          render={({ field }) => (
            <RepeatableList
              label="Paragraphs"
              hint="Each entry becomes its own paragraph."
              values={field.value ?? []}
              onChange={field.onChange}
              addLabel="Add paragraph"
              error={errors.aboutParagraphs?.message}
            />
          )}
        />

        <Field label="Core stack heading" error={errors.coreStackTitle?.message}>
          {(props) => (
            <input
              {...register("coreStackTitle")}
              {...props}
              className={inputClass}
              placeholder="Core Stack"
            />
          )}
        </Field>
      </Panel>

      <div className="sticky bottom-4 flex justify-end">
        <div className="rounded-xl border border-border bg-background/95 p-2 shadow-lg backdrop-blur">
          <SubmitButton isPending={isPending} isDirty={isDirty} />
        </div>
      </div>
    </form>
  );
}
