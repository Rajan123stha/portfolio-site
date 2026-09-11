import { after, NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { isBot } from "@/lib/analytics/collect";
import { AnswerAssembler } from "@/lib/assistant/answer";
import { answerCacheKey, readCachedAnswer, writeCachedAnswer } from "@/lib/assistant/cache";
import { ASSISTANT_LIMITS, getAssistantConfig, getTurnstileConfig } from "@/lib/assistant/config";
import { buildKnowledge, type Knowledge } from "@/lib/assistant/knowledge";
import { buildSystemPrompt } from "@/lib/assistant/prompt";
import {
  MAX_QUESTION_LENGTH,
  type AssistantErrorCode,
  type FinishState,
  type StreamEvent,
} from "@/lib/assistant/protocol";
import {
  ProviderError,
  providerFor,
  type FinishReason,
  type ProviderChunk,
} from "@/lib/assistant/providers";
import {
  admitVisitor,
  purgeExpired,
  recordEvent,
  recordTokens,
  requestIp,
  reserveAnswer,
  siteCapacity,
  visitorKey,
} from "@/lib/assistant/rate-limit";
import { resolveQuestions } from "@/lib/assistant/suggestions";
import { openTranscript, sealTranscript, type Turn } from "@/lib/assistant/transcript";
import { verifyTurnstile } from "@/lib/assistant/turnstile";
import { getPortfolio, getSiteSettings } from "@/lib/queries/public";

/**
 * The "Ask about me" endpoint.
 *
 * Checks run in order of cost, so the cheapest reason to refuse a request is
 * always found before anything expensive happens:
 *
 *   1. free       origin, bot user-agent, content type, body size, question shape
 *   2. free       signed conversation history: intact, unexpired, not too long
 *   3. 1 call     bot check (Turnstile) on a conversation's first question;
 *                 a missing token is refused before any database work
 *   4. 1 query    per-visitor limits (minute/hour/day), site load read alongside,
 *                 plus the cached answer for a suggested question — 0 tokens
 *   6. free       site-wide caps: answers per minute/day, tokens per day
 *   7. provider   only now is the model asked, with a trimmed history, capped
 *                 output and a timeout; the tokens it reports are metered
 *
 * The response is NDJSON, one `StreamEvent` per line. The provider's first
 * chunk is awaited before the response starts, so a bad key or an exhausted
 * quota comes back as a proper HTTP error rather than a stream that dies.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * Hosting platforms cut functions off at a default that can be as low as 10s,
 * which a streamed answer can exceed. This allows a full answer and still
 * bounds the worst case.
 */
export const maxDuration = 60;

const requestSchema = z.object({
  question: z
    .string()
    .transform(stripControlCharacters)
    .pipe(z.string().min(1).max(MAX_QUESTION_LENGTH)),
  transcript: z.string().max(ASSISTANT_LIMITS.maxBodyBytes).optional(),
  signature: z.string().max(128).optional(),
  verification: z.string().max(2048).optional(),
});

/** Stored answers are short by design; this only bounds a runaway one. */
const MAX_STORED_ANSWER = 4000;

export async function POST(request: NextRequest) {
  // ── 1. Free checks ─────────────────────────────────────────────────────────
  if (!isSameOrigin(request) || isBot(request.headers.get("user-agent"))) {
    return fail(403, "forbidden", "This endpoint only serves the chat on this site.");
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return fail(415, "invalid_request", "Requests must be JSON.");
  }

  const config = getAssistantConfig();
  if (!config) return fail(404, "disabled", "The assistant isn't available right now.");

  const body = await readJson(request, ASSISTANT_LIMITS.maxBodyBytes);
  if (body === TOO_LARGE) return fail(413, "invalid_request", "That request is too large.");

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return fail(400, "invalid_request", `Please keep questions under ${MAX_QUESTION_LENGTH} characters.`);
  }

  const { question, transcript, signature, verification } = parsed.data;

  // Punctuation or a single character can't be a question worth a model call.
  if ((question.match(/\p{L}/gu) ?? []).length < 2) {
    return fail(400, "invalid_request", "Please ask a question in words.");
  }

  // ── 2. Conversation history ────────────────────────────────────────────────
  let history: Turn[] = [];
  let verified = false;

  if (transcript || signature) {
    const opened = openTranscript(transcript ?? "", signature ?? "");
    if (!opened.ok) {
      return fail(
        409,
        "conversation_reset",
        opened.reason === "expired"
          ? "This conversation has expired. Start a new one to keep going."
          : "This conversation couldn't be continued. Start a new one to keep going.",
      );
    }
    history = opened.turns;
    verified = opened.verified;
  }

  if (history.filter((turn) => turn.role === "user").length >= ASSISTANT_LIMITS.turnsPerConversation) {
    return fail(409, "conversation_reset", "This conversation has reached its limit. Start a new one to keep going.");
  }

  // Cached reads: no database round-trip once warm.
  const [settings, portfolio] = await Promise.all([getSiteSettings(), getPortfolio()]);
  if (!settings.assistantEnabled) {
    return fail(404, "disabled", "The assistant isn't available right now.");
  }

  const knowledge = buildKnowledge(portfolio);
  const system = buildSystemPrompt(knowledge, settings.assistantPronouns);
  const cacheKey =
    history.length === 0
      ? answerCacheKey({
          question,
          suggestions: resolveQuestions(settings.assistantQuestions, knowledge.owner.firstName),
          system,
          model: `${config.provider}:${config.model}`,
        })
      : null;

  const ip = requestIp(request.headers);

  // ── 3. Bot check ───────────────────────────────────────────────────────────
  // Before any database work: a flood of token-less requests is refused
  // without writing a single row.
  const turnstile = getTurnstileConfig();
  if (turnstile && !verified) {
    if (!verification) {
      return fail(403, "verification_failed", "We couldn't confirm you're a person. Please try again.");
    }
    const verdict = await verifyTurnstile({
      secretKey: turnstile.secretKey,
      token: verification,
      ip,
      expectedHost: requestHost(request),
    });
    if (!verdict.ok) {
      after(() => recordEvent("blocked").catch(logFailure("count a blocked request")));
      return fail(403, "verification_failed", "We couldn't confirm you're a person. Please try again.");
    }
    verified = true;
  }

  // ── 4. Per-visitor limits, with the cache lookup alongside ─────────────────
  const [admission, cached] = await Promise.all([
    admitVisitor(visitorKey(ip)),
    cacheKey ? readCachedAnswer(cacheKey).catch(() => null) : null,
  ]);

  if (!admission.ok) {
    after(() => recordEvent("blocked").catch(logFailure("count a blocked request")));
    return fail(
      429,
      "rate_limited",
      "You've asked a lot of questions in a short time. Please try again a little later, or use the contact form.",
      { "retry-after": String(admission.retryAfterSeconds) },
    );
  }

  const turns: Turn[] = [...history, { role: "user", text: question }];

  // ── 5. Cached answer: replayed and re-verified, no tokens spent ────────────
  if (cached) {
    after(() => recordEvent("cacheHit").catch(logFailure("count a cache hit")));
    return replay(cached, knowledge, turns, verified);
  }

  // ── 6. Site-wide caps ──────────────────────────────────────────────────────
  const capacity = siteCapacity(admission.site);
  if (!capacity.ok) {
    return capacity.scope === "minute"
      ? fail(503, "busy", "The assistant is busy right now. Please try again in a minute.", {
          "retry-after": String(capacity.retryAfterSeconds),
        })
      : fail(
          429,
          "rate_limited",
          "The assistant has answered all the questions it can for today. Please use the contact form, or try again tomorrow.",
          { "retry-after": String(capacity.retryAfterSeconds) },
        );
  }

  // Housekeeping off the request path; the tables only need trimming now and then.
  if (Math.random() < 0.02) after(() => purgeExpired().catch(logFailure("purge expired rows")));

  // ── 7. The model ───────────────────────────────────────────────────────────
  // One signal for both ways a call ends early: the visitor leaves, or the
  // provider goes quiet. The watchdog restarts on every chunk, so it measures
  // silence rather than total time — a slow answer that keeps streaming is
  // never cut off.
  const abort = new AbortController();
  request.signal.addEventListener("abort", () => abort.abort());
  let watchdog = setTimeout(() => abort.abort(), ASSISTANT_LIMITS.firstChunkTimeoutMs);
  const heardFromProvider = () => {
    clearTimeout(watchdog);
    watchdog = setTimeout(() => abort.abort(), ASSISTANT_LIMITS.idleTimeoutMs);
  };

  // Older exchanges are dropped from what the model sees (the facts are resent
  // every time anyway); the signed transcript still keeps the whole chat.
  const context = turns.slice(-(ASSISTANT_LIMITS.historyExchanges * 2 + 1));

  const chunks = providerFor(config)(config, {
    system,
    turns: context,
    maxOutputTokens: ASSISTANT_LIMITS.maxOutputTokens,
    signal: abort.signal,
  });

  let first: IteratorResult<ProviderChunk>;
  try {
    // Claim the call against the site allowance while the provider warms up.
    [first] = await Promise.all([
      chunks.next(),
      reserveAnswer().catch(logFailure("reserve an answer")),
    ]);
  } catch (error) {
    clearTimeout(watchdog);
    if (request.signal.aborted) return new Response(null, { status: 499 });
    console.error("[assistant] provider request failed", error);

    return error instanceof ProviderError && error.isBusy
      ? fail(503, "busy", "The assistant is busy right now. Please try again in a minute.")
      : fail(502, "unavailable", "The assistant couldn't answer just now. Please try again shortly.");
  }

  const startedAt = Date.now();

  return stream(
    async (write) => {
      const assembler = new AnswerAssembler(knowledge);
      let reason: FinishReason = "other";
      let usage: { inputTokens: number; outputTokens: number } | null = null;

      try {
        for (let step = first; !step.done; step = await chunks.next()) {
          heardFromProvider();
          const chunk = step.value;
          if (chunk.type === "text") {
            for (const event of assembler.push(chunk.text)) write(event);
          } else if (chunk.type === "usage") {
            usage = { inputTokens: chunk.inputTokens, outputTokens: chunk.outputTokens };
          } else {
            reason = chunk.reason;
          }
        }
        for (const event of assembler.finish()) write(event);
      } catch (error) {
        if (!request.signal.aborted) {
          console.error("[assistant] stream interrupted", error);
          write({
            type: "error",
            code: "unavailable",
            message: "The answer was interrupted. Please try asking again.",
          });
        }
        // Even an interrupted answer spent tokens.
        await recordTokens(estimateTokens(system, context, assembler.rawText)).catch(
          logFailure("record tokens"),
        );
        return;
      }

      const finish: FinishState =
        reason === "blocked" ? "blocked" : reason === "length" ? "truncated" : "complete";
      const summary = assembler.summary();
      const answer = assembler.rawText.slice(0, MAX_STORED_ANSWER);

      // A blocked exchange is left out of the history so it can't colour the
      // next answer; everything else is kept, citation markers included.
      const kept: Turn[] =
        finish === "blocked" || !answer.trim()
          ? history
          : [...turns, { role: "assistant", text: answer }];

      write({ type: "done", finish, summary, ...sealTranscript(kept, verified) });

      const tokens = usage
        ? usage.inputTokens + usage.outputTokens
        : estimateTokens(system, context, assembler.rawText);

      // Only an answer that passed every check is worth reusing.
      const reusable =
        cacheKey !== null &&
        finish === "complete" &&
        (summary.status === "grounded" || summary.status === "unanswered") &&
        summary.flaggedSegments === 0 &&
        summary.invalidCitations === 0;

      await Promise.all([
        recordTokens(tokens).catch(logFailure("record tokens")),
        reusable && cacheKey ? writeCachedAnswer(cacheKey, answer).catch(logFailure("cache an answer")) : null,
      ]);

      if (process.env.NODE_ENV !== "production") {
        console.info(
          `[assistant] ${summary.status} · ${summary.factsCited} facts · ${summary.flaggedSegments} flagged · ${tokens} tokens${usage ? "" : " (est.)"} · ${finish} · ${Date.now() - startedAt}ms`,
        );
      }
    },
    () => abort.abort(),
    () => clearTimeout(watchdog),
  );
}

// ── Replay ───────────────────────────────────────────────────────────────────

/**
 * Serves a stored answer. It goes through the same assembler as a live one, so
 * its citations are rebuilt from — and checked against — today's facts.
 */
function replay(answer: string, knowledge: Knowledge, turns: Turn[], verified: boolean) {
  return stream(async (write) => {
    const assembler = new AnswerAssembler(knowledge);
    for (const event of [...assembler.push(answer), ...assembler.finish()]) write(event);
    write({
      type: "done",
      finish: "complete",
      summary: assembler.summary(),
      ...sealTranscript([...turns, { role: "assistant", text: answer }], verified),
    });
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function stream(
  produce: (write: (event: StreamEvent) => void) => Promise<void>,
  onCancel?: () => void,
  onSettled?: () => void,
) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await produce((event) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`)));
      } finally {
        onSettled?.();
        controller.close();
      }
    },
    cancel() {
      onCancel?.();
    },
  });

  return new Response(body, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      // Stops proxies (nginx and friends) buffering the stream into one lump.
      "x-accel-buffering": "no",
    },
  });
}

function fail(
  status: number,
  code: AssistantErrorCode,
  message: string,
  headers?: Record<string, string>,
) {
  return NextResponse.json(
    { code, message },
    { status, headers: { "cache-control": "no-store", ...headers } },
  );
}

const TOO_LARGE = Symbol("too-large");

/**
 * Reads the body with a hard size cap. `request.json()` would buffer whatever
 * a client sends — a multi-megabyte body would be read in full before any
 * validation could reject it.
 */
async function readJson(request: NextRequest, limit: number): Promise<unknown> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) return TOO_LARGE;
  if (!request.body) return null;

  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return TOO_LARGE;
    }
    parts.push(value);
  }

  try {
    return JSON.parse(Buffer.concat(parts).toString("utf8"));
  } catch {
    return null;
  }
}

/** Used only when a provider doesn't report usage: roughly 4 characters a token. */
function estimateTokens(system: string, turns: Turn[], answer: string): number {
  const characters =
    system.length + turns.reduce((sum, turn) => sum + turn.text.length, 0) + answer.length;
  return Math.ceil(characters / 4);
}

/** Keeps tab, newline and printable text; drops other control characters. */
function stripControlCharacters(value: string): string {
  return Array.from(value)
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code === 9 || code === 10 || (code >= 32 && code !== 127);
    })
    .join("")
    .trim();
}

function logFailure(action: string) {
  return (error: unknown) => console.error(`[assistant] failed to ${action}`, error);
}

/** Hostname the page was served from, for checking where a Turnstile token was minted. */
function requestHost(request: NextRequest): string | null {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  return host?.split(":")[0] ?? null;
}

/**
 * Only the page's own widget may call this. Other sites embedding the endpoint
 * would be spending this site's quota; a browser always sends `Origin` on a
 * cross-origin POST, so comparing it with the host stops that. (A script can
 * forge the header — the rate limits and bot check are what stop scripts.)
 */
function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") === "same-origin";

  const hosts = [request.headers.get("x-forwarded-host"), request.headers.get("host")];
  try {
    const host = new URL(origin).host;
    return hosts.some((candidate) => candidate === host);
  } catch {
    return false;
  }
}
