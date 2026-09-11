import { providerError, readSse } from "./sse";
import type { FinishReason, Provider } from "./types";

/**
 * Google Gemini via the `streamGenerateContent` REST endpoint.
 *
 * Plain `fetch` rather than an SDK: the surface used here is one endpoint and
 * one chunk shape, and a dependency would buy nothing but weight.
 */

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

type GeminiChunk = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string; thought?: boolean }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
  };
};

export const streamGemini: Provider = async function* (config, request) {
  const model = config.model.replace(/^models\//, "");
  const url = `${config.baseUrl ?? DEFAULT_BASE_URL}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;

  const body = (thinking: boolean) =>
    JSON.stringify({
      systemInstruction: { parts: [{ text: request.system }] },
      contents: request.turns.map((turn) => ({
        role: turn.role === "assistant" ? "model" : "user",
        parts: [{ text: turn.text }],
      })),
      generationConfig: {
        maxOutputTokens: request.maxOutputTokens,
        ...samplingFor(model),
        ...(thinking ? thinkingFor(model) : {}),
      },
    });

  const send = (thinking: boolean) =>
    fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": config.apiKey,
      },
      body: body(thinking),
      signal: request.signal,
    });

  let response = await send(true);

  // Thinking controls differ between model generations. If a model rejects
  // the ones we sent, retry once with the model's defaults rather than failing.
  if (response.status === 400 && thinkingFor(model).thinkingConfig) {
    response = await send(false);
  }

  if (!response.ok || !response.body) throw await providerError(response, "Gemini");

  let finish: FinishReason = "other";
  let usage: { inputTokens: number; outputTokens: number } | null = null;

  for await (const data of readSse(response.body)) {
    let chunk: GeminiChunk;
    try {
      chunk = JSON.parse(data) as GeminiChunk;
    } catch {
      continue;
    }

    // Running totals; the last chunk carries the final figures.
    if (chunk.usageMetadata) {
      const meta = chunk.usageMetadata;
      usage = {
        inputTokens: meta.promptTokenCount ?? 0,
        // Thinking is billed as output, so it counts against the budget too.
        outputTokens: (meta.candidatesTokenCount ?? 0) + (meta.thoughtsTokenCount ?? 0),
      };
    }

    if (chunk.promptFeedback?.blockReason) {
      finish = "blocked";
      break;
    }

    const candidate = chunk.candidates?.[0];
    for (const part of candidate?.content?.parts ?? []) {
      // Thought summaries are only sent on request, but never show them.
      if (part.thought || !part.text) continue;
      yield { type: "text", text: part.text };
    }

    // Keep reading after the finish reason: usage can arrive in the same
    // chunk or just after it, and the stream ends on its own.
    if (candidate?.finishReason) finish = finishReason(candidate.finishReason);
  }

  if (usage) yield { type: "usage", ...usage };
  yield { type: "finish", reason: finish };
};

/**
 * Keeps thinking to a minimum: these are short lookups over a provided list,
 * and on a chat every second before the first word is visible.
 */
function thinkingFor(model: string): { thinkingConfig?: Record<string, unknown> } {
  // 2.5 Flash / Flash-Lite can switch thinking off entirely (Pro cannot).
  if (/^gemini-2\.5-flash/.test(model)) return { thinkingConfig: { thinkingBudget: 0 } };
  // Gemini 3 and later take a level. "minimal" answers these lookups in about a
  // second; "low" measured ~25s on gemini-3.6-flash for the same request, and
  // thinking tokens are billed as output. Grounding doesn't depend on it — the
  // server checks every answer regardless.
  if (/^gemini-([3-9]|\d{2,})/.test(model)) return { thinkingConfig: { thinkingLevel: "minimal" } };
  return {};
}

/**
 * Low temperature for older models, where it measurably reduces invention.
 * Gemini 3+ is tuned for its default and is left alone.
 */
function samplingFor(model: string): { temperature?: number } {
  return /^gemini-([3-9]|\d{2,})/.test(model) ? {} : { temperature: 0.2 };
}

function finishReason(reason: string): FinishReason {
  switch (reason) {
    case "STOP":
      return "stop";
    case "MAX_TOKENS":
      return "length";
    case "SAFETY":
    case "RECITATION":
    case "BLOCKLIST":
    case "PROHIBITED_CONTENT":
    case "SPII":
    case "IMAGE_SAFETY":
      return "blocked";
    default:
      return "other";
  }
}
