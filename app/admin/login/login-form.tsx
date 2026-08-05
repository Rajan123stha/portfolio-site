"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/admin/form-field";
import { login } from "@/lib/actions/auth";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";
import { cn } from "@/lib/utils";

export function LoginForm({ next }: { next?: string }) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      // On success the action redirects, so control never returns here.
      const result = await login(values, next);
      if (result && !result.ok) setFormError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {formError ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {formError}
        </p>
      ) : null}

      <Field label="Email" error={errors.email?.message} required>
        {(props) => (
          <input
            {...register("email")}
            {...props}
            type="email"
            autoComplete="username"
            autoFocus
            placeholder="you@example.com"
            className={inputClass}
          />
        )}
      </Field>

      <Field label="Password" error={errors.password?.message} required>
        {(props) => (
          <div className="relative">
            <input
              {...register("password")}
              {...props}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••••••"
              className={cn(inputClass, "pr-10")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff aria-hidden className="h-4 w-4" />
              ) : (
                <Eye aria-hidden className="h-4 w-4" />
              )}
            </button>
          </div>
        )}
      </Field>

      <Button type="submit" className="w-full gap-2" disabled={isPending}>
        {isPending ? (
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
        ) : null}
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
