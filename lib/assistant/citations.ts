/**
 * Pulls citation markers out of a streamed answer.
 *
 * The model is told to write `[F12]` or `[F3, F7]` after each claim, and
 * `[NO_SOURCE]` when the portfolio doesn't cover the question. Those markers
 * must never reach the visitor as text — they become structured citation
 * events instead.
 *
 * The complication is streaming: a marker can arrive split across chunks
 * (`"built with [F1"` then `"2]."`). Anything that could still turn out to be a
 * marker is held back until it either closes or stops looking like one, so a
 * half-marker is never shown and then retracted.
 */

export type ParsedEvent =
  | { type: "text"; text: string }
  | { type: "cite"; ids: string[] }
  | { type: "no-source" };

const NO_SOURCE = "NO_SOURCE";

/** A complete marker: `[F1]`, `[F1, F2]`, `[F1; F2]`, `[F1 F2]`, `[NO_SOURCE]`. */
const CITE_MARKER = /^\[\s*F\d+(?:\s*[,;\s]\s*F?\d+)*\s*\]$/i;
const NO_SOURCE_MARKER = /^\[\s*NO[_ ]SOURCE\s*\]$/i;

/** The body of an unclosed marker that could still become a valid one. */
const CITE_PREFIX = /^\s*(?:F\d*(?:\s*[,;\s]\s*F?\d*)*)?$/i;

/** Past this length an unclosed `[` is ordinary text, not a marker. */
const MAX_MARKER_LENGTH = 48;

export class CitationParser {
  private pending = "";

  /** Feeds one streamed chunk; returns whatever can be decided so far. */
  push(chunk: string): ParsedEvent[] {
    this.pending += chunk;
    return this.drain(false);
  }

  /** End of stream: anything still held back is released as text. */
  flush(): ParsedEvent[] {
    return this.drain(true);
  }

  private drain(final: boolean): ParsedEvent[] {
    const events: ParsedEvent[] = [];
    let text = "";

    while (this.pending.length > 0) {
      const open = this.pending.indexOf("[");

      if (open === -1) {
        text += this.pending;
        this.pending = "";
        break;
      }

      text += this.pending.slice(0, open);
      this.pending = this.pending.slice(open);

      const close = this.pending.indexOf("]");

      if (close === -1) {
        // Unclosed: wait for more input if it could still be a marker.
        if (!final && couldBeMarker(this.pending)) break;
        text += this.pending[0];
        this.pending = this.pending.slice(1);
        continue;
      }

      const candidate = this.pending.slice(0, close + 1);

      if (CITE_MARKER.test(candidate)) {
        if (text) events.push({ type: "text", text });
        text = "";
        events.push({ type: "cite", ids: parseIds(candidate) });
        this.pending = this.pending.slice(close + 1);
      } else if (NO_SOURCE_MARKER.test(candidate)) {
        if (text) events.push({ type: "text", text });
        text = "";
        events.push({ type: "no-source" });
        this.pending = this.pending.slice(close + 1);
      } else {
        // An ordinary bracket in prose. Release just the `[` so a real marker
        // nested after it (`[see [F2]]`) is still found.
        text += this.pending[0];
        this.pending = this.pending.slice(1);
      }
    }

    if (text) events.push({ type: "text", text });
    return events;
  }
}

function couldBeMarker(unclosed: string): boolean {
  if (unclosed.length > MAX_MARKER_LENGTH) return false;

  const body = unclosed.slice(1);
  const upper = body.trim().toUpperCase().replace(" ", "_");
  return CITE_PREFIX.test(body) || NO_SOURCE.startsWith(upper);
}

/** `[F3, 7; f12]` → `["F3", "F7", "F12"]`, de-duplicated, order kept. */
function parseIds(marker: string): string[] {
  const ids = marker
    .slice(1, -1)
    .split(/[,;\s]+/)
    .filter(Boolean)
    .map((token) => `F${token.replace(/^f/i, "")}`);

  return [...new Set(ids)];
}
