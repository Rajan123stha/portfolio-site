"use client";

import { useRouter } from "next/navigation";

import { Field, inputClass } from "@/components/admin/form-field";
import { SubmitButton } from "@/components/admin/submit-button";
import { useActionForm } from "@/components/admin/use-action-form";
import { changePassword, updateAccount } from "@/lib/actions/auth";
import { accountSchema, changePasswordSchema } from "@/lib/validators/auth";

export function AccountForm({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const router = useRouter();

  const { form, onSubmit, isPending } = useActionForm({
    schema: accountSchema,
    defaultValues: { name, email },
    action: updateAccount,
    onSuccess: () => router.refresh(),
  });

  const {
    register,
    formState: { errors, isDirty },
  } = form;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" error={errors.name?.message} required>
          {(props) => (
            <input {...register("name")} {...props} className={inputClass} />
          )}
        </Field>

        <Field
          label="Email"
          hint="This is your username for signing in."
          error={errors.email?.message}
          required
        >
          {(props) => (
            <input
              {...register("email")}
              {...props}
              type="email"
              autoComplete="username"
              className={inputClass}
            />
          )}
        </Field>
      </div>

      <div className="flex justify-end">
        <SubmitButton isPending={isPending} isDirty={isDirty} />
      </div>
    </form>
  );
}

export function PasswordForm() {
  const { form, onSubmit, isPending } = useActionForm({
    schema: changePasswordSchema,
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    action: changePassword,
    // Never leave a password sitting in a form field after a successful change.
    resetOnSuccess: true,
  });

  const {
    register,
    formState: { errors },
  } = form;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <Field
        label="Current password"
        error={errors.currentPassword?.message}
        required
      >
        {(props) => (
          <input
            {...register("currentPassword")}
            {...props}
            type="password"
            autoComplete="current-password"
            className={inputClass}
          />
        )}
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="New password"
          hint="At least 12 characters. A passphrase beats a short complex string."
          error={errors.newPassword?.message}
          required
        >
          {(props) => (
            <input
              {...register("newPassword")}
              {...props}
              type="password"
              autoComplete="new-password"
              className={inputClass}
            />
          )}
        </Field>

        <Field
          label="Confirm new password"
          error={errors.confirmPassword?.message}
          required
        >
          {(props) => (
            <input
              {...register("confirmPassword")}
              {...props}
              type="password"
              autoComplete="new-password"
              className={inputClass}
            />
          )}
        </Field>
      </div>

      <div className="flex justify-end">
        <SubmitButton isPending={isPending} label="Change password" />
      </div>
    </form>
  );
}
