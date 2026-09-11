import "server-only";

import type { AssistantConfig } from "../config";
import { streamGemini } from "./gemini";
import { streamOpenAICompatible } from "./openai-compatible";
import type { Provider } from "./types";

const PROVIDERS: Record<AssistantConfig["provider"], Provider> = {
  gemini: streamGemini,
  "openai-compatible": streamOpenAICompatible,
};

export function providerFor(config: AssistantConfig): Provider {
  return PROVIDERS[config.provider];
}

export { ProviderError, type FinishReason, type ProviderChunk } from "./types";
