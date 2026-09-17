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

export function resolveQuestions(custom: string[], firstName: string): string[] {
  const source = custom.length > 0 ? custom : DEFAULT_ASSISTANT_QUESTIONS;
  return source
    .map((question) => question.replaceAll("{name}", firstName).trim())
    .filter(Boolean)
    .slice(0, MAX_ASSISTANT_QUESTIONS);
}

export function defaultWelcome(firstName: string): string {
  return `Hi! I can answer questions about ${firstName}'s experience, projects and skills.`;
}
