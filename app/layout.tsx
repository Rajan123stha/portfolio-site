import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { getPortfolio, getSiteSettings } from "@/lib/queries/public";
import { siteUrl } from "@/lib/seo/site";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

/** Used when the database is unreachable, so the site still renders titled. */
const FALLBACK_METADATA = {
  name: "Rajan Shrestha",
  title: "Rajan Shrestha — Freelance Next.js Developer, Kathmandu",
  description:
    "Rajan Shrestha: freelance Next.js & React developer in Kathmandu, Nepal. Fast websites, web apps and AI features. Available remote or freelance.",
};

export async function generateMetadata(): Promise<Metadata> {
  // Metadata must never be the reason a page 500s: a failed lookup degrades to
  // sensible defaults rather than taking the whole route down.
  const [settings, portfolio] = await Promise.all([
    getSiteSettings().catch(() => null),
    getPortfolio().catch(() => null),
  ]);

  const name = portfolio?.profile.fullName || FALLBACK_METADATA.name;
  const title = settings?.metaTitle || FALLBACK_METADATA.title;
  const description = settings?.metaDescription || FALLBACK_METADATA.description;

  /*
   * An uploaded share image wins; otherwise a card is generated from the
   * profile (app/og/route.tsx). Previously there was no fallback at all, so
   * links shared to LinkedIn or Slack showed no preview image.
   */
  const images = settings?.ogImageUrl
    ? [{ url: settings.ogImageUrl, alt: title }]
    : [{ url: "/og", width: 1200, height: 630, alt: title }];

  return {
    metadataBase: siteUrl(),
    // Pages set their own title; the template brands it, so a project page
    // reads "Trabra Travel Management — Rajan Shrestha" in search results.
    title: { default: title, template: `%s — ${name}` },
    description,
    applicationName: name,
    keywords: settings?.metaKeywords,
    authors: [{ name, url: "/" }],
    creator: name,
    category: "technology",
    // No canonical here: a canonical set in the root layout is inherited by
    // every page that doesn't override it, and would tell search engines each
    // of them is a duplicate of the homepage. Pages declare their own.
    openGraph: {
      title,
      description,
      type: "website",
      locale: "en_US",
      siteName: name,
      url: "/",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
    verification: process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : undefined,
  };
}

/** Colours the browser UI to match the page in both themes. */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // `suppressHydrationWarning` is required by next-themes: it writes the
    // resolved theme onto <html> before React hydrates, so the server and
    // client markup legitimately differ on that one attribute.
    <html
      lang="en"
      suppressHydrationWarning
      className={`scroll-smooth ${geist.variable} ${geistMono.variable}`}
    >
      <body className={`${geist.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
