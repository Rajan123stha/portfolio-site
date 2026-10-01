/**
 * Conversation starters shown in the chat.
 *
 * Written around what recruiters and hiring managers actually need to decide
 * whether to reach out: production experience with a named stack, seniority,
 * availability and work arrangement, scope of past work, and how to get in
 * touch. Each maps to a kind of content the portfolio holds, so a well-filled
 * profile answers all of them with citations — and a gap shows up as an honest
 * "not covered" rather than an invented answer.
 *
 * `{name}` expands to the owner's first name, so the list works unchanged if
 * the name in the profile changes. Shared by the widget and the admin panel.
 */
export const DEFAULT_ASSISTANT_QUESTIONS = [
  "Has {name} shipped Next.js to production?",
  "What's {name}'s strongest tech stack?",
  "Is {name} open to new roles right now?",
  "What's the most complex project {name} has built?",
  "Where is {name} based, and is remote work an option?",
  "How many years of professional experience does {name} have?",
  "Has {name} worked with a CMS or headless setup?",
  "What can I hire {name} for as a freelancer?",
] as const;

export const MAX_ASSISTANT_QUESTIONS = 8;

/**
 * Expands `{name}` in whatever question list was actually saved — no implicit
 * fallback to the defaults here. An empty array means the owner has deliberately
 * switched off every suggestion, not "nobody's configured this yet"; that
 * distinction is what makes the admin checklist's on/off toggles trustworthy —
 * unchecking everything needs to actually show nothing, not quietly keep
 * showing all eight. A brand-new, never-touched site still gets the defaults,
 * because `DEFAULT_SITE_SETTINGS.assistantQuestions` (lib/content/defaults.ts)
 * is seeded with `DEFAULT_ASSISTANT_QUESTIONS` itself.
 */
export function resolveQuestions(selected: string[], firstName: string): string[] {
  return selected
    .map((question) => question.replaceAll("{name}", firstName).trim())
    .filter(Boolean)
    .slice(0, MAX_ASSISTANT_QUESTIONS);
}

export function defaultWelcome(firstName: string): string {
  return `Hi! I can answer questions about ${firstName}'s experience, projects and skills.`;
}
