import { CitationParser, type ParsedEvent } from "./citations";
import type { Fact, Knowledge } from "./knowledge";
import type {
  AssistantCitation,
  GroundingSummary,
  SegmentCheck,
  StreamEvent,
} from "./protocol";
import { createVerifier, type Verifier } from "./verify";

/**
 * Turns the model's raw streamed text into what the visitor sees.
 *
 * The answer is split into *segments*: the text leading up to each citation
 * marker. Every segment is verified the moment its marker arrives, so a flag
 * appears on the offending sentence while the rest of the answer is still
 * streaming, rather than after the fact.
 *
 * Kept free of HTTP and provider concerns so the whole grounding pipeline can
 * be exercised with nothing but a string.
 */
export class AnswerAssembler {
  private readonly parser = new CitationParser();
  private readonly verifier: Verifier;

  /** Raw model output, markers included — what goes back into history. */
  private raw = "";
  /** Visible text of segments already closed. */
  private closed = "";
  /** Visible text of the segment still being written. */
  private open = "";

  private readonly citedIds = new Set<string>();
  private invalidCitations = 0;
  private flaggedSegments = 0;
  private hasGap = false;

  constructor(private readonly knowledge: Knowledge) {
    this.verifier = createVerifier(knowledge);
  }

  push(text: string): StreamEvent[] {
    this.raw += text;
    return this.parser.push(text).flatMap((event) => this.handle(event));
  }

  /** End of the model's output: releases held-back text, closes the last segment. */
  finish(): StreamEvent[] {
    const events = this.parser.flush().flatMap((event) => this.handle(event));
    if (this.open.trim()) events.push(this.close([]));
    return events;
  }

  get rawText(): string {
    return this.raw;
  }

  summary(): GroundingSummary {
    const factsCited = this.citedIds.size;
    const troubled = this.flaggedSegments > 0 || this.invalidCitations > 0;

    const status: GroundingSummary["status"] =
      factsCited === 0
        ? this.hasGap && !troubled
          ? "unanswered"
          : "unverified"
        : troubled
          ? "partial"
          : "grounded";

    return {
      status,
      factsCited,
      flaggedSegments: this.flaggedSegments,
      invalidCitations: this.invalidCitations,
      hasGap: this.hasGap,
    };
  }

  private handle(event: ParsedEvent): StreamEvent[] {
    switch (event.type) {
      case "text":
        this.open += event.text;
        return [{ type: "text", text: event.text }];

      case "cite": {
        const facts: Fact[] = [];
        for (const id of event.ids) {
          const fact = this.knowledge.byId.get(id);
          if (fact) facts.push(fact);
          else this.invalidCitations += 1;
        }
        return [this.close(facts)];
      }

      case "no-source":
        this.hasGap = true;
        return [this.close([], { gap: true })];
    }
  }

  private close(facts: Fact[], options: { gap?: boolean } = {}): StreamEvent {
    let check: SegmentCheck = this.verifier.checkSegment(this.open, facts, this.closed);

    // A "the portfolio doesn't say" sentence naturally names what's missing;
    // that's the honest answer, not an uncited claim.
    if (options.gap && check.status === "uncited") check = { status: "neutral", issues: [] };

    if (check.status === "unsupported" || check.status === "uncited") {
      this.flaggedSegments += 1;
    }

    for (const fact of facts) this.citedIds.add(fact.id);

    const citations: AssistantCitation[] = facts.map((fact) => ({
      factId: fact.id,
      quote: fact.text,
      source: fact.source,
    }));

    this.closed += this.open;
    this.open = "";

    return { type: "segment", citations, check };
  }
}
