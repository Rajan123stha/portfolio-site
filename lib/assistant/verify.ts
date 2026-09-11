import type { Fact, Knowledge } from "./knowledge";
import type { SegmentCheck, SegmentIssue } from "./protocol";

/**
 * Deterministic fact-checking of an answer, segment by segment.
 *
 * A citation only proves the model *pointed* at a fact; it doesn't prove the
 * sentence says what the fact says. This closes the most damaging part of that
 * gap with checks that need no second model call:
 *
 * - **Numbers** must appear in the facts the segment cites. An invented year,
 *   duration or metric is the classic hallucination, and the easiest to catch.
 * - **Names** — technologies, companies, products, places — must appear
 *   somewhere in the portfolio. "Built with Vue" when the portfolio never
 *   mentions Vue is flagged even if a citation is attached.
 * - **Links** must be URLs the portfolio actually publishes.
 *
 * It is deliberately a *flagging* layer, not a filter. Paraphrase is fine and
 * expected; only specifics that can be checked are checked, and a failure marks
 * the text for the visitor instead of silently deleting a sentence.
 */

/** Capitalised words that carry no factual claim when they appear mid-sentence. */
const STOPWORDS = new Set([
  "i", "i'm", "i've", "i'd", "ok", "okay", "yes", "no", "hi", "hello", "hey",
  "thanks", "e.g", "i.e", "etc", "vs", "ai", "faq", "faqs", "cv", "resume",
  "portfolio", "contact", "about", "projects", "project", "skills", "services",
  "experience", "profile", "section", "sources", "source",
]);

// Words, including technology spellings: Next.js, C#, C++, Node.js, K8s.
const TOKEN = /[A-Za-z][\w.+#'’-]*[\w+#]|[A-Za-z]/g;
// Standalone figures only — the digits inside S3, EC2 or K8s are part of a name.
const NUMBER = /(?<![A-Za-z\d.])\d+(?:[.,]\d+)*(?![A-Za-z\d])/g;
const URL_PATTERN = /\b(?:https?:\/\/|mailto:)[^\s)\]>"']+/gi;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

export function createVerifier(knowledge: Knowledge) {
  const corpusText = [
    ...knowledge.facts.map((fact) => fact.text),
    ...knowledge.sources.map((source) => source.label),
  ].join(" ");

  const corpusWords = wordSet(corpusText);
  const corpusNumbers = numberSet(corpusText);
  const knownLinks = new Set(knowledge.links.map(normaliseUrl));
  const ownerWords = wordSet(knowledge.owner.fullName);

  const factNumbers = new Map<string, Set<string>>(
    knowledge.facts.map((fact) => [fact.id, numberSet(fact.text)]),
  );

  /**
   * @param text      the segment's text, citation markers already removed
   * @param cited     the valid facts cited at the end of the segment
   * @param lead      the answer text before this segment, for deciding
   *                  whether the segment's first word starts a sentence
   */
  function checkSegment(text: string, cited: Fact[], lead: string): SegmentCheck {
    const issues: SegmentIssue[] = [];

    // ── Links ──
    for (const url of text.match(URL_PATTERN) ?? []) {
      if (!knownLinks.has(normaliseUrl(url))) issues.push({ kind: "link", value: url });
    }

    // URLs and emails are checked above (or are plain contact values); strip
    // them so their digits and path segments aren't re-checked as claims.
    const prose = text.replace(URL_PATTERN, " ").replace(EMAIL, " ");

    // ── Numbers ──
    const allowedNumbers =
      cited.length > 0
        ? union(cited.map((fact) => factNumbers.get(fact.id) ?? new Set()))
        : corpusNumbers;

    let mentionsKnownNumber = false;
    for (const value of numbersIn(prose)) {
      if (allowedNumbers.has(value)) mentionsKnownNumber = true;
      else issues.push({ kind: "number", value });
    }

    // ── Names ──
    let mentionsKnownName = false;
    for (const token of namesIn(prose, lead)) {
      const key = normaliseWord(token);
      if (STOPWORDS.has(key) || ownerWords.has(key)) continue;
      if (corpusWords.has(key)) mentionsKnownName = true;
      else issues.push({ kind: "name", value: token });
    }

    if (issues.length > 0) return { status: "unsupported", issues: dedupe(issues) };
    if (cited.length > 0) return { status: "supported", issues };

    // Uncited but clean: either connective text, or a factual-sounding claim
    // that happens to use real portfolio terms without citing them.
    return {
      status: mentionsKnownName || mentionsKnownNumber ? "uncited" : "neutral",
      issues,
    };
  }

  return { checkSegment };
}

export type Verifier = ReturnType<typeof createVerifier>;

// ── Extraction ───────────────────────────────────────────────────────────────

function numbersIn(text: string): string[] {
  // Ordinal list markers ("1. ", "2) ") at a line start aren't claims.
  const withoutListMarkers = text.replace(/(^|\n)\s*\d+[.)]\s/g, "$1");
  return (withoutListMarkers.match(NUMBER) ?? []).map(normaliseNumber);
}

/**
 * Tokens that look like a proper name or a technology.
 *
 * A capitalised word only counts mid-sentence — "Built with…" starting a
 * sentence says nothing. Spellings that are unambiguous wherever they appear
 * (AWS, TypeScript, Next.js, K8s) count anywhere.
 */
function namesIn(text: string, lead: string): string[] {
  const names: string[] = [];

  for (const match of text.matchAll(TOKEN)) {
    const token = match[0];
    const index = match.index ?? 0;

    const distinctive =
      /^[A-Z][A-Z0-9]+$/.test(token) || // acronym: AWS, CSS, API
      /[a-z][A-Z]/.test(token) || // inner capital: TypeScript, GraphQL
      /[.#+]/.test(token) || // Next.js, C#, C++
      (/\d/.test(token) && /[A-Za-z]/.test(token)); // S3, K8s, EC2

    const capitalised = /^[A-Z]/.test(token);

    if (distinctive || (capitalised && !startsSentence(lead + text.slice(0, index)))) {
      names.push(token);
    }
  }

  return names;
}

/** True when the next word would begin a sentence or a list item. */
function startsSentence(before: string): boolean {
  const trimmed = before.replace(/[\s"“'‘(]+$/, "");
  if (trimmed === "") return true;
  if (/[.!?:;]$/.test(trimmed)) return true;
  // List items: "- React", "• React", "1. React" at the start of a line.
  return /(^|\n)\s*(?:[-*•]|\d+[.)])$/.test(trimmed);
}

// ── Normalisation ────────────────────────────────────────────────────────────

function wordSet(text: string): Set<string> {
  const words = new Set<string>();
  for (const match of text.matchAll(TOKEN)) {
    const word = normaliseWord(match[0]);
    words.add(word);
    // "Node.js" should also vouch for "Node"; "full-stack" for "full".
    for (const part of word.split(/[.\-/]/)) if (part) words.add(part);
  }
  return words;
}

/**
 * Month names and their abbreviations are the same word. Periods are usually
 * stored short ("Aug 2024 — Feb 2025") and models write them out in full;
 * flagging "February" as unverified would be a false alarm on a correct date.
 */
const MONTHS: Record<string, string> = {
  january: "jan", february: "feb", march: "mar", april: "apr", june: "jun",
  july: "jul", august: "aug", september: "sep", sept: "sep", october: "oct",
  november: "nov", december: "dec",
};

function normaliseWord(token: string): string {
  const word = token
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/'s$/, "")
    .replace(/\.+$/, "");

  return MONTHS[word] ?? word.replace(/(?<=[a-z]{3})s$/, ""); // plural: "APIs" ≈ "API"
}

function numberSet(text: string): Set<string> {
  return new Set((text.match(NUMBER) ?? []).map(normaliseNumber));
}

/** `1,000` → `1000`; `3.50` → `3.5`; keeps years and version numbers intact. */
function normaliseNumber(value: string): string {
  const plain = /^\d{1,3}(,\d{3})+$/.test(value) ? value.replace(/,/g, "") : value;
  return plain.includes(".") ? plain.replace(/\.?0+$/, "") : plain;
}

function normaliseUrl(url: string): string {
  return url.trim().replace(/[.,;:!?]+$/, "").replace(/\/+$/, "").toLowerCase();
}

function union(sets: Set<string>[]): Set<string> {
  const all = new Set<string>();
  for (const set of sets) for (const value of set) all.add(value);
  return all;
}

function dedupe(issues: SegmentIssue[]): SegmentIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.kind}:${issue.value.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
