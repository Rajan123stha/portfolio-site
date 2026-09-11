import { ProviderError } from "./types";

/**
 * Yields the `data:` payload of each server-sent event in a response body.
 *
 * Both Gemini (`alt=sse`) and OpenAI-compatible APIs stream SSE; this is the
 * only framing either needs. Multi-line `data:` fields are joined per the spec,
 * and CRLF line endings — which Gemini uses — are handled.
 */
export async function* readSse(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let data: string[] = [];

  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });

      let newline: number;
      while ((newline = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);

        if (line === "") {
          // A blank line dispatches the event.
          if (data.length > 0) yield data.join("\n");
          data = [];
        } else if (line.startsWith("data:")) {
          data.push(line.slice(5).replace(/^ /, ""));
        }
        // `event:`, `id:`, `retry:` and comments carry nothing we use.
      }

      if (done) break;
    }

    if (data.length > 0) yield data.join("\n");
  } finally {
    reader.releaseLock();
  }
}

/** Turns a non-2xx provider response into a `ProviderError` with its message. */
export async function providerError(response: Response, provider: string): Promise<ProviderError> {
  let detail = response.statusText;
  try {
    const body = (await response.json()) as {
      error?: { message?: string } | string;
    };
    detail =
      typeof body.error === "string" ? body.error : (body.error?.message ?? detail);
  } catch {
    // Not JSON; keep the status text.
  }
  return new ProviderError(`${provider} ${response.status}: ${detail}`, response.status);
}
