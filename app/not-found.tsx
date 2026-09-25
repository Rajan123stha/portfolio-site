import Link from "next/link";

export const metadata = { title: "Page not found", robots: { index: false } };

/**
 * A 404 that leads somewhere. The default one is a dead end; this one points
 * back to the pages that exist, so a broken inbound link still delivers a
 * visitor (and a crawler) to real content.
 */
export default function NotFound() {
  return (
    <main className="container flex min-h-[70vh] max-w-xl flex-col items-start justify-center gap-6 py-20">
      <p className="label-mono text-primary">404</p>
      <h1 className="text-section font-semibold text-balance">This page doesn’t exist</h1>
      <p className="text-lg leading-relaxed text-muted-foreground">
        The link may be old, or the address mistyped. Here’s where to go instead:
      </p>
      <nav aria-label="Suggested pages" className="flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Home
        </Link>
        <Link
          href="/projects"
          className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary/40"
        >
          Projects
        </Link>
        <Link
          href="/#contact"
          className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary/40"
        >
          Contact
        </Link>
      </nav>
    </main>
  );
}
