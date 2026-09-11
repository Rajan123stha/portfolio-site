"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller } from "react-hook-form";
import { Brain, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Field, inputClass, textareaClass } from "@/components/admin/form-field";
import { Panel } from "@/components/admin/page-header";
import { RepeatableList } from "@/components/admin/repeatable-list";
import { SubmitButton } from "@/components/admin/submit-button";
import { useActionForm } from "@/components/admin/use-action-form";
import { Switch } from "@/components/ui/switch";
import { setAssistantEnabled, updateAssistantSettings } from "@/lib/actions/assistant";
import {
  DEFAULT_ASSISTANT_QUESTIONS,
  MAX_ASSISTANT_QUESTIONS,
  defaultWelcome,
  resolveQuestions,
} from "@/lib/assistant/suggestions";
import { assistantSettingsSchema } from "@/lib/validators/content";
import { cn } from "@/lib/utils";

type AssistantSettingsProps = {
  firstName: string;
  settings: {
    assistantEnabled: boolean;
    assistantWelcome: string;
    assistantPronouns: string;
    assistantQuestions: string[];
  };
  status: {
    /** `null` when no provider key is configured. */
    providerLabel: string | null;
    /** `null` when the counters couldn't be read. */
    answersToday: number | null;
    dailyLimit: number;
    tokensToday: number | null;
    tokenLimit: number;
  };
};

export function AssistantSettings({ firstName, settings, status }: AssistantSettingsProps) {
  const router = useRouter();
  const [isToggling, startToggle] = useTransition();

  // Optimistic, like the section switches: a one-click action that waits on a
  // round-trip before moving feels broken.
  const [enabled, setEnabled] = useState(settings.assistantEnabled);

  const onToggle = (next: boolean) => {
    setEnabled(next);
    startToggle(async () => {
      const result = await setAssistantEnabled(next);
      if (!result.ok) {
        setEnabled(!next);
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  };

  const { form, onSubmit, isPending } = useActionForm({
    schema: assistantSettingsSchema,
    action: updateAssistantSettings,
    onSuccess: () => router.refresh(),
    defaultValues: {
      assistantWelcome: settings.assistantWelcome,
      assistantPronouns: settings.assistantPronouns,
      assistantQuestions: settings.assistantQuestions,
    },
  });

  const {
    register,
    control,
    watch,
    formState: { errors, isDirty },
  } = form;

  const questions = watch("assistantQuestions") ?? [];
  const configured = status.providerLabel !== null;
  const live = enabled && configured;

  return (
    <div className="space-y-6">
      {/* ── Status ── */}
      <section className="rounded-2xl border border-border bg-card shadow-sm">
        <header className="flex items-start gap-4 px-5 py-4">
          <span
            aria-hidden
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors",
              live
                ? "bg-gradient-to-br from-primary to-accent-2 text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            <Brain className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Show the assistant on your site</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                aria-hidden
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  live ? "bg-emerald-500" : "bg-muted-foreground/40",
                )}
              />
              {live
                ? "Live — visitors see an “Ask about me” button in the corner."
                : enabled
                  ? "Switched on, but hidden until a provider key is configured."
                  : "Hidden from visitors."}
            </p>
          </div>

          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            disabled={isToggling}
            aria-label={enabled ? "Turn the assistant off" : "Turn the assistant on"}
          />
        </header>

        <dl className="grid gap-px overflow-hidden rounded-b-2xl border-t border-border bg-border sm:grid-cols-3">
          <StatusCell label="Model">
            {configured ? (
              <span className="font-mono text-xs">{status.providerLabel}</span>
            ) : (
              <span className="text-xs text-muted-foreground">Not configured</span>
            )}
          </StatusCell>

          <StatusCell label="Answers today">
            <Meter value={status.answersToday} limit={status.dailyLimit} />
          </StatusCell>

          <StatusCell label="Tokens today">
            <Meter value={status.tokensToday} limit={status.tokenLimit} />
          </StatusCell>
        </dl>
      </section>

      {!configured ? (
        <div
          role="note"
          className="flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-sm"
        >
          <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="min-w-0 space-y-2">
            <p className="font-medium text-foreground">Add a free API key to bring the assistant online</p>
            <p className="text-xs text-muted-foreground text-pretty">
              Create a key in Google AI Studio, add it to <code className="font-mono">.env.local</code> (and
              your host’s environment variables), then restart the server. Groq, OpenRouter and other
              OpenAI-compatible providers work too — see <code className="font-mono">.env.example</code>.
            </p>
            <pre className="overflow-x-auto rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground">
              {`AI_PROVIDER="gemini"\nAI_API_KEY="your-key"`}
            </pre>
          </div>
        </div>
      ) : null}

      {/* ── Conversation ── */}
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <Panel
          title="Conversation"
          description="What visitors see when they open the chat."
          footer={<SubmitButton isPending={isPending} isDirty={isDirty} />}
        >
          <Field
            label="Welcome message"
            hint="Leave blank to use the default greeting."
            error={errors.assistantWelcome?.message}
          >
            {(props) => (
              <textarea
                {...register("assistantWelcome")}
                {...props}
                rows={2}
                className={textareaClass}
                placeholder={defaultWelcome(firstName)}
              />
            )}
          </Field>

          <Field
            label="Pronouns"
            hint="How the assistant refers to you. Leave blank and it uses your first name instead of guessing."
            error={errors.assistantPronouns?.message}
          >
            {(props) => (
              <input
                {...register("assistantPronouns")}
                {...props}
                className={cn(inputClass, "sm:max-w-xs")}
                placeholder="e.g. he/him, she/her, they/them"
              />
            )}
          </Field>

          <Controller
            control={control}
            name="assistantQuestions"
            render={({ field }) => (
              <RepeatableList
                label="Suggested questions"
                hint={`One-tap starters, up to ${MAX_ASSISTANT_QUESTIONS}. Write {name} for your first name. Leave empty to use the recruiter defaults below.`}
                variant="input"
                placeholder={DEFAULT_ASSISTANT_QUESTIONS[0]}
                addLabel="Add question"
                values={field.value ?? []}
                onChange={field.onChange}
                error={errors.assistantQuestions?.message}
              />
            )}
          />

          {questions.filter((question) => question.trim()).length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-4">
              <p className="label-mono text-muted-foreground">Using the recruiter defaults</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {resolveQuestions([], firstName).map((question) => (
                  <li
                    key={question}
                    className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground"
                  >
                    {question}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Panel>
      </form>
    </div>
  );
}

/** A count against its daily cap; amber once it's nearly spent. */
function Meter({ value, limit }: { value: number | null; limit: number }) {
  if (value === null) return <span className="text-xs text-muted-foreground">Unavailable</span>;

  const percent = Math.min(100, Math.round((value / limit) * 100));
  return (
    <div className="space-y-1.5">
      <span className="font-mono text-xs">
        {value.toLocaleString()} <span className="text-muted-foreground">/ {limit.toLocaleString()}</span>
      </span>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", percent >= 90 ? "bg-amber-500" : "bg-primary")}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function StatusCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-card px-5 py-3">
      <dt className="label-mono text-muted-foreground">{label}</dt>
      <dd className="mt-1.5">{children}</dd>
    </div>
  );
}
