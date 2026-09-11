import "server-only";

/**
 * Which model provider backs the assistant, read from the environment.
 *
 * Deliberately outside the validated `env` object: the assistant is optional,
 * and asking `env` would demand a database URL just to decide whether to render
 * a chat button. A missing or unrecognised configuration simply means "off".
 *
 *   AI_PROVIDER   gemini (default) | openai-compatible
 *   AI_API_KEY    the provider's key (GEMINI_API_KEY also works for Gemini)
 *   AI_MODEL      optional for Gemini, required for openai-compatible
 *   AI_BASE_URL   required for openai-compatible, e.g. https://api.groq.com/openai/v1;
 *                 optional for Gemini (a proxy in front of the v1beta API)
 *
 * Spend and abuse controls (all optional; defaults suit a free tier):
 *   AI_DAILY_LIMIT        answers per UTC day, whole site          (200)
 *   AI_DAILY_TOKEN_LIMIT  provider tokens per UTC day, whole site  (750000)
 *   AI_RPM_LIMIT          answers per minute, whole site           (10)
 *   TRUSTED_IP_HEADER     header your host sets to the real client IP
 *   TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY   Cloudflare bot check
 */

export type ProviderId = "gemini" | "openai-compatible";

export type AssistantConfig = {
  provider: ProviderId;
  apiKey: string;
  model: string;
  baseUrl: string | null;
  /** Human label for the admin panel and the widget footer. */
  label: string;
};

/** Used when `AI_MODEL` is unset; any Flash model your key can use works. */
const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";

export function getAssistantConfig(): AssistantConfig | null {
  const provider = (process.env.AI_PROVIDER?.trim() || "gemini") as ProviderId;
  const model = process.env.AI_MODEL?.trim();

  if (provider === "gemini") {
    const apiKey =
      process.env.AI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return null;

    const resolved = model || DEFAULT_GEMINI_MODEL;
    return {
      provider,
      apiKey,
      model: resolved,
      // Optional override, for routing through a proxy or gateway.
      baseUrl: process.env.AI_BASE_URL?.trim().replace(/\/+$/, "") || null,
      label: `Gemini · ${resolved}`,
    };
  }

  if (provider === "openai-compatible") {
    const apiKey = process.env.AI_API_KEY?.trim();
    const baseUrl = process.env.AI_BASE_URL?.trim().replace(/\/+$/, "");
    // No sensible default exists across Groq, OpenRouter, Together, …
    if (!apiKey || !baseUrl || !model) return null;

    let host = baseUrl;
    try {
      host = new URL(baseUrl).hostname.replace(/^api\./, "");
    } catch {
      return null;
    }

    return { provider, apiKey, model, baseUrl, label: `${host} · ${model}` };
  }

  return null;
}

export function isAssistantConfigured(): boolean {
  return getAssistantConfig() !== null;
}

/**
 * Abuse and spend ceilings.
 *
 * Two kinds of limit, doing different jobs:
 *
 * - **Per visitor** (minute / hour / day) keeps one person or one script from
 *   using everything. These key on the client IP, which a determined attacker
 *   can rotate — so they are about fairness, not the spend ceiling.
 * - **Site-wide** (answers per minute and per day, tokens per day) is the real
 *   ceiling: no matter how many identities an attacker has, the provider is
 *   never asked for more than this. The per-minute cap also keeps the site
 *   under the provider's own rate limit, so visitors see a polite "busy"
 *   instead of provider errors.
 *
 * Defaults sit under typical Gemini free-tier quotas.
 */
export const ASSISTANT_LIMITS = {
  perVisitorPerMinute: 4,
  perVisitorPerHour: 10,
  perVisitorPerDay: 25,
  perMinute: readPositiveInt(process.env.AI_RPM_LIMIT, 10),
  perDay: readPositiveInt(process.env.AI_DAILY_LIMIT, 200),
  tokensPerDay: readPositiveInt(process.env.AI_DAILY_TOKEN_LIMIT, 750_000),

  /** Questions per conversation before the widget asks for a fresh one. */
  turnsPerConversation: 8,
  /**
   * Earlier exchanges sent back to the model. The facts are resent on every
   * question anyway; older chat adds tokens without adding knowledge.
   */
  historyExchanges: 3,
  /** Answers are two to four sentences; this is a safety net, not a target. */
  maxOutputTokens: 1024,
  /**
   * A stalled provider call is abandoned; a slow-but-progressing one isn't.
   * These measure silence, not total duration: free tiers can queue a request
   * before the first word, then stream steadily.
   */
  firstChunkTimeoutMs: 30_000,
  idleTimeoutMs: 15_000,
  /** Signed transcripts older than this are refused. */
  transcriptTtlMs: 6 * 60 * 60 * 1000,
  /** Largest request body accepted — a full conversation is well under this. */
  maxBodyBytes: 48 * 1024,
  /** Cached answers to suggested questions are regenerated after this. */
  cacheTtlMs: 7 * 24 * 60 * 60 * 1000,
} as const;

/**
 * Cloudflare Turnstile — a free, usually invisible bot check. When both keys
 * are set, the first question of every conversation must carry a passing
 * token; the verdict then rides in the signed transcript for the rest of it.
 */
export function getTurnstileConfig(): { siteKey: string; secretKey: string } | null {
  const siteKey = process.env.TURNSTILE_SITE_KEY?.trim();
  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim();
  return siteKey && secretKey ? { siteKey, secretKey } : null;
}

function readPositiveInt(raw: string | undefined, fallback: number): number {
  const value = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
