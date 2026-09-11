import { providerError, readSse } from "./sse";
import type { FinishReason, Provider } from "./types";

/**
 * Any provider speaking the OpenAI chat-completions protocol — Groq,
 * OpenRouter (including its free models), Together, a local Ollama or LM
 * Studio server. Set `AI_BASE_URL` to the API root that `/chat/completions`
 * hangs off.
 */

type CompletionChunk = {
  choices?: Array<{
    delta?: { content?: string | null };
    finish_reason?: string | null;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number } | null;
};

export const streamOpenAICompatible: Provider = async function* (config, request) {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      stream: true,
      // Asks for a final chunk with token counts, for the daily budget.
      stream_options: { include_usage: true },
      max_tokens: request.maxOutputTokens,
      temperature: 0.2,
      messages: [
        { role: "system", content: request.system },
        ...request.turns.map((turn) => ({ role: turn.role, content: turn.text })),
      ],
    }),
    signal: request.signal,
  });

  if (!response.ok || !response.body) throw await providerError(response, "Provider");

  let finish: FinishReason = "other";
  let usage: { inputTokens: number; outputTokens: number } | null = null;

  for await (const data of readSse(response.body)) {
    if (data === "[DONE]") break;

    let chunk: CompletionChunk;
    try {
      chunk = JSON.parse(data) as CompletionChunk;
    } catch {
      continue;
    }

    if (chunk.usage) {
      usage = {
        inputTokens: chunk.usage.prompt_tokens ?? 0,
        outputTokens: chunk.usage.completion_tokens ?? 0,
      };
    }

    const choice = chunk.choices?.[0];
    // Reasoning models may also stream a separate `reasoning` field; only
    // `content` is the answer.
    if (choice?.delta?.content) yield { type: "text", text: choice.delta.content };

    // The usage chunk follows the finish reason, so keep reading to [DONE].
    if (choice?.finish_reason) finish = finishReason(choice.finish_reason);
  }

  if (usage) yield { type: "usage", ...usage };
  yield { type: "finish", reason: finish };
};

function finishReason(reason: string): FinishReason {
  if (reason === "stop") return "stop";
  if (reason === "length") return "length";
  if (reason === "content_filter") return "blocked";
  return "other";
}
