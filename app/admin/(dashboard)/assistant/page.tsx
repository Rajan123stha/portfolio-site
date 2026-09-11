import { PageHeader } from "@/components/admin/page-header";
import {
  ASSISTANT_LIMITS as LIMITS,
  getAssistantConfig,
  getTurnstileConfig,
} from "@/lib/assistant/config";
import { assessCoverage } from "@/lib/assistant/coverage";
import { buildKnowledge, renderFacts } from "@/lib/assistant/knowledge";
import { assistantUsageToday } from "@/lib/assistant/rate-limit";
import { getSiteSettingsForAdmin } from "@/lib/queries/admin";
import { getPortfolio } from "@/lib/queries/public";
import { AssistantSettings } from "./assistant-settings";
import { KnowledgePreview } from "./knowledge-preview";
import { ProtectionPanel } from "./protection-panel";

export const metadata = { title: "AI assistant" };

export default async function AssistantPage() {
  // The public payload, not the admin one: the preview must show exactly what
  // the assistant is given, hidden rows excluded.
  const [settings, portfolio, usage] = await Promise.all([
    getSiteSettingsForAdmin(),
    getPortfolio(),
    assistantUsageToday().catch(() => null),
  ]);

  const config = getAssistantConfig();
  const turnstile = getTurnstileConfig();
  const trustedIpHeader = process.env.TRUSTED_IP_HEADER?.trim() || null;
  const knowledge = buildKnowledge(portfolio);

  return (
    <>
      <PageHeader
        title="AI assistant"
        description="An “Ask about me” chat for recruiters and clients. It answers only from your published content, cites where each answer came from, and flags anything it can’t verify."
      />

      <div className="space-y-6">
        <AssistantSettings
          firstName={knowledge.owner.firstName}
          settings={{
            assistantEnabled: settings?.assistantEnabled ?? false,
            assistantWelcome: settings?.assistantWelcome ?? "",
            assistantPronouns: settings?.assistantPronouns ?? "",
            assistantQuestions: settings?.assistantQuestions ?? [],
          }}
          status={{
            providerLabel: config?.label ?? null,
            answersToday: usage?.answers ?? null,
            dailyLimit: LIMITS.perDay,
            tokensToday: usage?.tokens ?? null,
            tokenLimit: LIMITS.tokensPerDay,
          }}
        />

        <ProtectionPanel
          cacheHits={usage?.cacheHits ?? null}
          blocked={usage?.blocked ?? null}
          layers={[
            {
              label: "Same-site requests only",
              detail: "Calls from other websites and self-declared bots are refused before anything else runs.",
              active: true,
            },
            {
              label: "Request shape",
              detail: `JSON only, bodies under ${LIMITS.maxBodyBytes / 1024} KB, questions under 600 characters and made of words.`,
              active: true,
            },
            {
              label: "Signed conversation history",
              detail: `History can’t be forged or edited, expires after ${LIMITS.transcriptTtlMs / 3_600_000} hours, and a chat ends after ${LIMITS.turnsPerConversation} questions.`,
              active: true,
            },
            {
              label: "Per-visitor limits",
              detail: `${LIMITS.perVisitorPerMinute} a minute · ${LIMITS.perVisitorPerHour} an hour · ${LIMITS.perVisitorPerDay} a day, keyed on ${trustedIpHeader ? `the ${trustedIpHeader} header` : "x-forwarded-for (correct on Vercel)"}.`,
              active: true,
            },
            {
              label: "Bot check (Cloudflare Turnstile)",
              detail: "Every conversation must pass an invisible human check before its first answer.",
              active: turnstile !== null,
              hint: "Off. Add TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY (free at dash.cloudflare.com) — it’s the only layer that stops a script rotating IP addresses.",
            },
            {
              label: "Answer cache",
              detail: "Suggested questions are answered once, then replayed to later visitors for 0 tokens.",
              active: true,
            },
            {
              label: "Site-wide ceilings",
              detail: `${LIMITS.perMinute} answers a minute · ${LIMITS.perDay} a day · ${LIMITS.tokensPerDay.toLocaleString()} tokens a day, however many visitors there are.`,
              active: true,
            },
            {
              label: "Lean model calls",
              detail: `Only the last ${LIMITS.historyExchanges} exchanges are sent, answers are capped at ${LIMITS.maxOutputTokens.toLocaleString()} tokens, and a provider that goes silent for ${LIMITS.idleTimeoutMs / 1000}s is abandoned.`,
              active: true,
            },
          ]}
        />

        <KnowledgePreview
          firstName={knowledge.owner.firstName}
          sources={knowledge.sources.map((source) => ({
            ...source,
            facts: knowledge.facts
              .filter((fact) => fact.source === source)
              .map((fact) => ({ id: fact.id, text: fact.text })),
          }))}
          factCount={knowledge.facts.length}
          // A rough guide only: ~4 characters per token for English text.
          approxTokens={Math.round(renderFacts(knowledge).length / 4)}
          coverage={assessCoverage(knowledge)}
        />
      </div>
    </>
  );
}
