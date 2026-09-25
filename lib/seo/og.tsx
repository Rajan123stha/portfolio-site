import { ImageResponse } from "next/og";

/**
 * Link-preview cards (1200×630), rendered on demand.
 *
 * Every shared link — LinkedIn, Slack, X, WhatsApp — shows this card. A page
 * without one gets a bare text link, which is noticeably less clicked. Built
 * from CMS content, so a new project gets a card without anyone designing one.
 *
 * Satori (which renders these) supports a subset of CSS: every element with
 * more than one child needs `display: flex`.
 */

export const OG_SIZE = { width: 1200, height: 630 };

type CardOptions = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  tags?: string[];
  footer: string;
};

export function renderOgCard({ eyebrow, title, subtitle, tags = [], footer }: CardOptions) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#09090b",
          backgroundImage:
            "radial-gradient(circle at 85% 10%, rgba(99, 102, 241, 0.35), transparent 45%), radial-gradient(circle at 10% 100%, rgba(168, 85, 247, 0.22), transparent 40%)",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 26, color: "#a5b4fc" }}>
          <div style={{ display: "flex", width: 40, height: 2, background: "#818cf8" }} />
          {eyebrow}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              display: "flex",
              fontSize: title.length > 48 ? 58 : 72,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div style={{ display: "flex", fontSize: 30, lineHeight: 1.35, color: "#a1a1aa", maxWidth: 980 }}>
              {subtitle}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 12 }}>
            {tags.slice(0, 5).map((tag) => (
              <div
                key={tag}
                style={{
                  display: "flex",
                  padding: "8px 18px",
                  borderRadius: 999,
                  border: "1px solid rgba(165, 180, 252, 0.35)",
                  background: "rgba(99, 102, 241, 0.12)",
                  color: "#c7d2fe",
                  fontSize: 22,
                }}
              >
                {tag}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#71717a" }}>{footer}</div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}

/** Trims to a whole word so a long description never ends mid-word on the card. */
export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,.;:—–-]+$/, "")}…`;
}
