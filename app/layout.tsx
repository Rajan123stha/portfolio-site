import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { publicEnv } from "@/lib/env.public";
import { getSiteSettings } from "@/lib/queries/public";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

/** Used when the database is unreachable, so the site still renders titled. */
const FALLBACK_METADATA = {
  title: "Rajan Shrestha — Frontend & Fullstack Developer",
  description:
    "Portfolio of Rajan Shrestha — Frontend & Fullstack Developer specializing in React, Next.js, CMS architectures, and AWS deployments.",
};

export async function generateMetadata(): Promise<Metadata> {
  // Metadata must never be the reason a page 500s: a failed lookup degrades to
  // sensible defaults rather than taking the whole route down.
  const settings = await getSiteSettings().catch(() => null);

  const title = settings?.metaTitle ?? FALLBACK_METADATA.title;
  const description =
    settings?.metaDescription ?? FALLBACK_METADATA.description;
  const images = settings?.ogImageUrl ? [{ url: settings.ogImageUrl }] : undefined;

  return {
    metadataBase: new URL(publicEnv.siteUrl),
    title,
    description,
    keywords: settings?.metaKeywords,
    authors: [{ name: settings?.footerBrand ?? "Rajan Shrestha" }],
    alternates: { canonical: "/" },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "en_US",
      url: publicEnv.siteUrl,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
    robots: { index: true, follow: true },
  };
}

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
