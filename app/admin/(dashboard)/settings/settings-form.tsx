"use client";

import { useRouter } from "next/navigation";
import { Controller } from "react-hook-form";

import { Field, inputClass, textareaClass } from "@/components/admin/form-field";
import { Panel } from "@/components/admin/page-header";
import { RepeatableList } from "@/components/admin/repeatable-list";
import { SubmitButton } from "@/components/admin/submit-button";
import { useActionForm } from "@/components/admin/use-action-form";
import { updateSiteSettings } from "@/lib/actions/settings";
import type { SiteSettings } from "@/db/schema";
import {
  siteSettingsSchema,
  type SiteSettingsInput,
} from "@/lib/validators/content";

const BLANK: SiteSettingsInput = {
  brandPrefix: "dev",
  brandName: "",
  footerBrand: "",
  footerTagline: "",
  metaTitle: "",
  metaDescription: "",
  metaKeywords: [],
  ogImageUrl: null,
  gaMeasurementId: null,
};

/** Search engines truncate around these lengths. */
const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 160;

export function SettingsForm({ settings }: { settings: SiteSettings | null }) {
  const router = useRouter();

  const { form, onSubmit, isPending } = useActionForm({
    schema: siteSettingsSchema,
    action: updateSiteSettings,
    onSuccess: () => router.refresh(),
    defaultValues: settings
      ? {
          brandPrefix: settings.brandPrefix,
          brandName: settings.brandName,
          footerBrand: settings.footerBrand,
          footerTagline: settings.footerTagline,
          metaTitle: settings.metaTitle,
          metaDescription: settings.metaDescription,
          metaKeywords: settings.metaKeywords,
          ogImageUrl: settings.ogImageUrl,
          gaMeasurementId: settings.gaMeasurementId,
        }
      : BLANK,
  });

  const {
    register,
    control,
    watch,
    formState: { errors, isDirty },
  } = form;

  const metaTitle = watch("metaTitle") ?? "";
  const metaDescription = watch("metaDescription") ?? "";

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <Panel
        title="Branding"
        description="Your logo renders as { prefix | name } in the header."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Logo prefix" error={errors.brandPrefix?.message} required>
            {(props) => (
              <input
                {...register("brandPrefix")}
                {...props}
                className={inputClass}
                placeholder="dev"
              />
            )}
          </Field>

          <Field label="Logo name" error={errors.brandName?.message} required>
            {(props) => (
              <input
                {...register("brandName")}
                {...props}
                className={inputClass}
                placeholder="Rajan"
              />
            )}
          </Field>
        </div>

        <Field label="Footer brand" error={errors.footerBrand?.message} required>
          {(props) => (
            <input
              {...register("footerBrand")}
              {...props}
              className={inputClass}
              placeholder="DevRajan"
            />
          )}
        </Field>

        <Field label="Footer tagline" error={errors.footerTagline?.message}>
          {(props) => (
            <textarea
              {...register("footerTagline")}
              {...props}
              rows={2}
              className={textareaClass}
            />
          )}
        </Field>
      </Panel>

      <Panel
        title="Search & social"
        description="What Google shows in results and what appears when someone shares your link."
      >
        <Field
          label="Meta title"
          hint={`${metaTitle.length}/${TITLE_LIMIT} — Google truncates past about ${TITLE_LIMIT} characters.`}
          error={errors.metaTitle?.message}
          required
        >
          {(props) => (
            <input
              {...register("metaTitle")}
              {...props}
              className={inputClass}
            />
          )}
        </Field>

        <Field
          label="Meta description"
          hint={`${metaDescription.length}/${DESCRIPTION_LIMIT} — aim for a sentence that reads as a pitch, not a keyword list.`}
          error={errors.metaDescription?.message}
          required
        >
          {(props) => (
            <textarea
              {...register("metaDescription")}
              {...props}
              rows={3}
              className={textareaClass}
            />
          )}
        </Field>

        <Controller
          control={control}
          name="metaKeywords"
          render={({ field }) => (
            <RepeatableList
              label="Keywords"
              hint="Largely ignored by modern search engines, but harmless to keep."
              variant="input"
              placeholder="React"
              addLabel="Add keyword"
              values={field.value ?? []}
              onChange={field.onChange}
              error={errors.metaKeywords?.message}
            />
          )}
        />

        <Field
          label="Share image"
          hint="Shown when your link is posted to LinkedIn, X, Slack. 1200×630 works everywhere."
          error={errors.ogImageUrl?.message}
        >
          {(props) => (
            <input
              {...register("ogImageUrl")}
              {...props}
              className={inputClass}
              placeholder="https://…/og-image.png"
            />
          )}
        </Field>
      </Panel>

      <Panel
        title="Analytics"
        description="Leave blank to load no tracking script at all."
      >
        <Field
          label="Google Analytics ID"
          hint="Looks like G-XXXXXXXXXX."
          error={errors.gaMeasurementId?.message}
        >
          {(props) => (
            <input
              {...register("gaMeasurementId")}
              {...props}
              className={inputClass}
              placeholder="G-XXXXXXXXXX"
            />
          )}
        </Field>
      </Panel>

      <div className="flex justify-end">
        <SubmitButton isPending={isPending} isDirty={isDirty} />
      </div>
    </form>
  );
}
