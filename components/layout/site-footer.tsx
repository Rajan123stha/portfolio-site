"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";

import { resolveIcon } from "@/lib/design-tokens";
import type {
  NavItemView,
  SiteSettingsView,
  SocialLinkView,
} from "@/lib/queries/public";

type SiteFooterProps = {
  settings: SiteSettingsView;
  navItems: NavItemView[];
  socialLinks: SocialLinkView[];
  /** Rendered on the server so the year matches the request, not the build. */
  year: number;
};

export function SiteFooter({
  settings,
  navItems,
  socialLinks,
  year,
}: SiteFooterProps) {
  const items = navItems.filter((item) => item.showInFooter);
  const socials = socialLinks.filter((link) => link.showInFooter);

  return (
    <footer className="relative overflow-hidden border-t border-border bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 left-1/2 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-[130px]"
      />

      <div className="container relative max-w-6xl py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <motion.div
            className="col-span-2 space-y-4"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
          >
            <p className="font-mono text-xl font-semibold tracking-tight">
              <span aria-hidden className="text-primary">
                {"{"}
              </span>
              <span className="px-1">{settings.footerBrand}</span>
              <span aria-hidden className="text-primary">
                {"}"}
              </span>
            </p>

            {settings.footerTagline ? (
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">
                {settings.footerTagline}
              </p>
            ) : null}
          </motion.div>

          {items.length > 0 ? (
            <motion.nav
              aria-label="Footer"
              className="space-y-4"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.1 }}
            >
              <p className="label-mono text-muted-foreground">Navigate</p>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.nav>
          ) : null}

          {socials.length > 0 ? (
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.15 }}
            >
              <p className="label-mono text-muted-foreground">Connect</p>
              <ul className="space-y-2.5">
                {socials.map((link) => {
                  const Icon = resolveIcon(link.icon);
                  const external = link.href.startsWith("http");

                  return (
                    <li key={link.id}>
                      <a
                        href={link.href}
                        target={external ? "_blank" : undefined}
                        rel={external ? "noopener noreferrer" : undefined}
                        className="group inline-flex items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        <Icon aria-hidden className="h-3.5 w-3.5" />
                        {link.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          ) : null}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="font-mono text-xs text-muted-foreground">
            © {year} {settings.footerBrand}
          </p>

          <button
            type="button"
            onClick={() =>
              window.scrollTo({
                top: 0,
                // Respect the OS reduced-motion setting rather than always
                // animating a full-page scroll.
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                  .matches
                  ? "auto"
                  : "smooth",
              })
            }
            className="group inline-flex items-center gap-2 rounded font-mono text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            Back to top
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-primary/40">
              <ArrowUp aria-hidden className="h-3 w-3" />
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
}
