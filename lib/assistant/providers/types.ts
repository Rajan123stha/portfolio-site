import type { AssistantConfig } from "../config";
import type { Turn } from "../transcript";

/**
 * The narrow contract every model provider is adapted to.
 *
 * Deliberately tiny: stream text, then say why it stopped. Everything that
 * makes the assistant trustworthy — citations, verification, history signing —
 * lives above this line, so switching provider changes nothing about how
 * answers are checked.
 */

export type ProviderRequest = {
  system: string;
  turns: Turn[];
  maxOutputTokens: number;
  signal: AbortSignal;
};

export type FinishReason = "stop" | "length" | "blocked" | "other";

export type ProviderChunk =
  | { type: "text"; text: string }
  /** What the call cost, when the provider reports it. Sent before `finish`. */
  | { type: "usage"; inputTokens: number; outputTokens: number }
  | { type: "finish"; reason: FinishReason };

export type Provider = (
  config: AssistantConfig,
  request: ProviderRequest,
) => AsyncGenerator<ProviderChunk>;

/**
 * A failure reaching the provider, raised before any text was produced.
 * `status` is the provider's HTTP status when there was one.
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = "ProviderError";
  }

  /** Quota or overload — worth telling the visitor to try again shortly. */
  get isBusy(): boolean {
    return this.status === 429 || this.status === 503;
  }
}
