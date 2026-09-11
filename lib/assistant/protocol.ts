/**
 * Wire format between `/api/assistant` and the chat widget.
 *
 * The response body is NDJSON — one `StreamEvent` per line — rather than SSE:
 * the client reads it with `fetch` and a stream reader, so there is no need for
 * `EventSource` framing, and a POST body is required anyway.
 *
 * Shared by the route and the browser, so nothing here may import server code.
 */

export type SourceKind =
  | "profile"
  | "about"
  | "service"
  | "skills"
  | "experience"
  | "project"
  | "highlight"
  | "contact";

/** A place on the page a fact came from — what a citation links to. */
export type AssistantSource = {
  id: string;
  kind: SourceKind;
  label: string;
  /** In-page anchor, e.g. `#project-dg-market`. */
  href: string;
  /** Section to scroll to when `href`'s element isn't rendered (filtered out). */
  fallbackHref: string;
};

export type AssistantCitation = {
  factId: string;
  /** The fact exactly as stored in the knowledge base — never model output. */
  quote: string;
  source: AssistantSource;
};

/**
 * Result of checking one segment of an answer against the knowledge base.
 *
 * - `supported`: cited, and every number and name in it was found in the facts
 * - `unsupported`: contains a number or name the facts don't back up
 * - `uncited`: talks about the owner's work but cites nothing
 * - `neutral`: connective text with no factual content (greetings, sign-posts)
 */
export type SegmentStatus = "supported" | "unsupported" | "uncited" | "neutral";

export type SegmentIssue = {
  /** A figure, a proper name / technology, or a URL the facts don't contain. */
  kind: "number" | "name" | "link";
  value: string;
};

export type SegmentCheck = {
  status: SegmentStatus;
  issues: SegmentIssue[];
};

/**
 * Whole-answer verdict, computed mechanically by the server — never the
 * model's own opinion of how grounded it was.
 */
export type GroundingStatus =
  /** Cited throughout, nothing flagged. */
  | "grounded"
  /** Cited, but at least one detail couldn't be verified. */
  | "partial"
  /** The model said the portfolio doesn't cover the question. */
  | "unanswered"
  /** No citations at all — e.g. a greeting, or the model ignored the protocol. */
  | "unverified";

export type GroundingSummary = {
  status: GroundingStatus;
  factsCited: number;
  flaggedSegments: number;
  /** Citations to fact IDs that don't exist — a fabricated reference. */
  invalidCitations: number;
  /** Part of the question isn't covered by the portfolio. */
  hasGap: boolean;
};

export type FinishState = "complete" | "truncated" | "blocked";

export type StreamEvent =
  /** Appends to the open segment. */
  | { type: "text"; text: string }
  /** Closes the open segment with its citations and verdict. */
  | { type: "segment"; citations: AssistantCitation[]; check: SegmentCheck }
  | {
      type: "done";
      finish: FinishState;
      summary: GroundingSummary;
      /** Opaque, signed conversation state to send back with the next question. */
      transcript: string;
      signature: string;
    }
  | { type: "error"; code: AssistantErrorCode; message: string };

export type AssistantErrorCode =
  | "invalid_request"
  | "forbidden"
  /** The bot check failed or expired — the widget fetches a fresh token and retries. */
  | "verification_failed"
  | "disabled"
  | "rate_limited"
  /** The conversation is full, expired or unreadable — start a new one. */
  | "conversation_reset"
  | "busy"
  | "unavailable";

/** Body of a POST to `/api/assistant`. */
export type AssistantRequest = {
  question: string;
  transcript?: string;
  signature?: string;
  /** Turnstile token; required on a conversation's first question when enabled. */
  verification?: string;
};

/** Longest question accepted, in characters. Mirrored in the composer. */
export const MAX_QUESTION_LENGTH = 600;
