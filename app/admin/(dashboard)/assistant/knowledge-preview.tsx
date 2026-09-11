import Link from "next/link";
import { ArrowUpRight, Check, ChevronDown, Minus } from "lucide-react";

import { Panel } from "@/components/admin/page-header";
import { SOURCE_ICONS } from "@/components/assistant/source-meta";
import type { CoverageItem } from "@/lib/assistant/coverage";
import type { AssistantSource } from "@/lib/assistant/protocol";

type PreviewSource = AssistantSource & { facts: Array<{ id: string; text: string }> };

type KnowledgePreviewProps = {
  firstName: string;
  sources: PreviewSource[];
  factCount: number;
  approxTokens: number;
  coverage: CoverageItem[];
};

/**
 * Exactly what the assistant is given — the same facts, IDs and grouping the
 * model sees. The point is trust: if a detail isn't listed here, the assistant
 * cannot state it, and the owner can check that for themselves.
 */
export function KnowledgePreview({
  firstName,
  sources,
  factCount,
  approxTokens,
  coverage,
}: KnowledgePreviewProps) {
  const gaps = coverage.filter((item) => !item.covered);

  return (
    <>
      <Panel
        title="What recruiters can find out"
        description={
          gaps.length === 0
            ? "Every standard recruiter question has something to answer from."
            : `${gaps.length} common ${gaps.length === 1 ? "question has" : "questions have"} nothing to answer from yet — the assistant will say the portfolio doesn’t cover ${gaps.length === 1 ? "it" : "them"} rather than guess.`
        }
      >
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {coverage.map((item) => (
            <li
              key={item.label}
              className={
                item.covered
                  ? "flex items-start gap-3 rounded-xl border border-border px-3.5 py-3"
                  : "flex items-start gap-3 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/[0.04] px-3.5 py-3"
              }
            >
              <span
                aria-hidden
                className={
                  item.covered
                    ? "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400"
                }
              >
                {item.covered ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {item.label}
                  <span className="sr-only">{item.covered ? " — covered" : " — not covered"}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  “{item.question.replaceAll("{name}", firstName)}”
                </p>
                {!item.covered ? (
                  <Link
                    href={item.fixHref}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Add in {item.fixLabel}
                    <ArrowUpRight aria-hidden className="h-3 w-3" />
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground text-pretty">
          Hidden sections and hidden items count as missing — the assistant never knows anything the
          site doesn’t show.
        </p>
      </Panel>

      <Panel
        title="What the assistant knows"
        description="Built live from your published content. Every answer must cite one of these facts, and any number or name that isn’t in them is flagged to the visitor."
      >
        <div className="flex flex-wrap gap-2">
          <Stat value={factCount} label="facts" />
          <Stat value={sources.length} label="sources" />
          <Stat value={`~${approxTokens.toLocaleString()}`} label="tokens per question" />
        </div>

        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {sources.map((source) => {
            const Icon = SOURCE_ICONS[source.kind];
            return (
              <details key={source.id} className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
                  <Icon aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{source.label}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {source.facts.length} {source.facts.length === 1 ? "fact" : "facts"}
                  </span>
                  <ChevronDown
                    aria-hidden
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  />
                </summary>
                <ol className="space-y-2 border-t border-border bg-muted/20 px-4 py-3">
                  {source.facts.map((fact) => (
                    <li key={fact.id} className="flex gap-3 text-xs leading-relaxed">
                      <span className="w-9 shrink-0 font-mono text-primary">{fact.id}</span>
                      <span className="min-w-0 text-foreground/90 text-pretty">{fact.text}</span>
                    </li>
                  ))}
                </ol>
              </details>
            );
          })}
        </div>
      </Panel>
    </>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-full border border-border bg-background px-3 py-1">
      <span className="font-mono text-sm font-semibold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </span>
  );
}
