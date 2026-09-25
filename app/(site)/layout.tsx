import Script from "next/script";

import { AnalyticsBeacon } from "@/components/layout/analytics-beacon";
import { DeferredCursor } from "@/components/layout/deferred-cursor";
import { MotionProvider } from "@/components/layout/motion-provider";
import { getSiteSettings } from "@/lib/queries/public";

/**
 * Public-site chrome.
 *
 * The custom cursor and analytics live here rather than in the root layout so
 * the admin panel — which shares that root — gets neither. A data-entry UI
 * needs the real system cursor, and admin activity shouldn't land in the site's
 * analytics.
 */
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings().catch(() => null);
  const gaId = settings?.gaMeasurementId;

  return (
    <div data-custom-cursor="true" className="min-h-screen bg-background">
      {/*
        Without JavaScript the page would render blank.
        Framer Motion serialises each element's `initial` variant into the
        server-rendered markup as `style="opacity:0"`; the sections that don't
        use framer instead reach for the `.reveal` class (see `Reveal` /
        `globals.css`), which starts at `opacity: 0` in CSS rather than inline.
        Either way, the script that would animate it to 1 never runs without
        JS. The reveal is pure decoration, so the fallback simply skips it and
        shows the finished state.
      */}
      <noscript>
        <style>{`
          [style*="opacity:0"], .reveal {
            opacity: 1 !important;
            transform: none !important;
          }
        `}</style>
      </noscript>

      {/*
        Mounted here rather than in the root layout so it only ever sees public
        traffic — the owner's own admin sessions would otherwise dominate every
        figure on the analytics dashboard.
      */}
      <AnalyticsBeacon />

      <MotionProvider>
        <DeferredCursor />
        {children}
      </MotionProvider>

      {gaId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${gaId}');
            `}
          </Script>
        </>
      ) : null}
    </div>
  );
}
