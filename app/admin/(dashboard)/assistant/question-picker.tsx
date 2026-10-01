"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { RepeatableList } from "@/components/admin/repeatable-list";
import { DEFAULT_ASSISTANT_QUESTIONS, MAX_ASSISTANT_QUESTIONS } from "@/lib/assistant/suggestions";

type QuestionPickerProps = {
  firstName: string;
  /** The saved list, raw templates with `{name}` still in them. */
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
};

/**
 * Which of the recruiter starter questions show in the chat, plus room for
 * questions of the owner's own.
 *
 * The eight defaults are a fixed catalog — checking one adds its exact
 * template string to the saved list, unchecking removes it — rather than a
 * free-text field the owner has to retype from scratch to drop just one of
 * them. Anything typed into the list below that isn't one of the eight rides
 * along as a custom question; toggling a checkbox never touches those.
 */
export function QuestionPicker({ firstName, value, onChange, error }: QuestionPickerProps) {
  const isDefault = (question: string) =>
    (DEFAULT_ASSISTANT_QUESTIONS as readonly string[]).includes(question);

  const custom = value.filter((question) => !isDefault(question));
  const selectedCount = value.length;

  const toggle = (template: string, checked: boolean) => {
    // Checked defaults keep the catalog's own order, so re-enabling one
    // slots it back where a recruiter would expect it rather than at the
    // end of the list; custom entries stay appended after, untouched.
    const nextDefaults = checked
      ? DEFAULT_ASSISTANT_QUESTIONS.filter(
          (question) => question === template || value.includes(question),
        )
      : value.filter((question) => question !== template && isDefault(question));

    onChange([...nextDefaults, ...custom]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="label-mono text-muted-foreground">Suggested questions</p>
        <p className="font-mono text-[11px] text-muted-foreground">
          {selectedCount} / {MAX_ASSISTANT_QUESTIONS} shown
        </p>
      </div>
      <p className="text-xs text-muted-foreground text-pretty">
        One-tap starters shown when the chat opens, and after each answer. Untick any you don’t
        want. Unticking all of them shows none — the chat still works, visitors just type their own
        question.
      </p>

      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {DEFAULT_ASSISTANT_QUESTIONS.map((template) => {
          const checked = value.includes(template);
          const id = `assistant-question-${template}`;

          return (
            <li key={template} className="flex items-start gap-3 px-4 py-3">
              <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(next) => toggle(template, next === true)}
                className="mt-0.5"
              />
              <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer text-sm text-foreground">
                {template.replaceAll("{name}", firstName)}
              </label>
            </li>
          );
        })}
      </ul>

      <RepeatableList
        label="Your own questions"
        hint="Add any question of your own. Write {name} for your first name."
        variant="input"
        placeholder={`What does ${firstName} charge?`}
        addLabel="Add question"
        values={custom}
        onChange={(nextCustom) => {
          const defaults = DEFAULT_ASSISTANT_QUESTIONS.filter((question) => value.includes(question));
          onChange([...defaults, ...nextCustom]);
        }}
        error={error}
      />
    </div>
  );
}
