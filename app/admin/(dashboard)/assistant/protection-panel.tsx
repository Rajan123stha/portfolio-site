import { Check, Minus } from "lucide-react";

import { Panel } from "@/components/admin/page-header";
import { cn } from "@/lib/utils";

type Layer = {
  label: string;
  detail: string;
  active: boolean;
  /** What to do when the layer is off. */
  hint?: string;
};

type ProtectionPanelProps = {
  cacheHits: number | null;
  blocked: number | null;
  layers: Layer[];
};

/**
 * Every safeguard in front of the provider, and whether it's on — so the
 * owner can see at a glance what stands between the public endpoint and
 * their quota, rather than taking it on trust.
 */
export function ProtectionPanel({ cacheHits, blocked, layers }: ProtectionPanelProps) {
  return (
    <Panel
      title="Protection"
      description="Each request passes these checks in order; the model is only called once all of them allow it."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Figure
          value={cacheHits}
          label="Answered from cache today"
          detail="Repeat suggested questions, served for 0 tokens."
        />
        <Figure
          value={blocked}
          label="Requests blocked today"
          detail="Over a rate limit or failed the bot check."
        />
      </div>

      <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {layers.map((layer, index) => (
          <li key={layer.label} className="flex items-start gap-3 px-4 py-3">
            <span className="mt-0.5 w-5 shrink-0 font-mono text-[11px] text-muted-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{layer.label}</p>
              <p className="text-xs text-muted-foreground text-pretty">{layer.detail}</p>
              {!layer.active && layer.hint ? (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400 text-pretty">{layer.hint}</p>
              ) : null}
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                layer.active
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
              )}
            >
              {layer.active ? <Check aria-hidden className="h-3 w-3" /> : <Minus aria-hidden className="h-3 w-3" />}
              {layer.active ? "On" : "Off"}
            </span>
          </li>
        ))}
      </ol>

      <p className="text-xs text-muted-foreground text-pretty">
        The full threat model, deployment checklist and ways to test each layer are in{" "}
        <code className="font-mono">docs/ai-assistant-security.md</code>.
      </p>
    </Panel>
  );
}

function Figure({ value, label, detail }: { value: number | null; label: string; detail: string }) {
  return (
    <div className="rounded-xl border border-border px-4 py-3">
      <p className="font-mono text-xl font-semibold text-foreground">
        {value === null ? "—" : value.toLocaleString()}
      </p>
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
