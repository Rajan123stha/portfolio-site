"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

import { resolveIcon } from "@/lib/design-tokens";
import type {
  ContactLinkView,
  NavItemView,
  SiteSettingsView,
  SocialLinkView,
} from "@/lib/queries/public";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./command-palette";
import { ThemeToggle } from "./theme-toggle";

type SiteHeaderProps = {
  settings: SiteSettingsView;
  navItems: NavItemView[];
  socialLinks: SocialLinkView[];
  contactLinks: ContactLinkView[];
  cvUrl: string | null;
};

export function SiteHeader({
  settings,
  navItems,
  socialLinks,
  contactLinks,
  cvUrl,
}: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = useMemo(
    () => navItems.filter((item) => item.showInHeader),
    [navItems],
  );
  const socials = useMemo(
    () => socialLinks.filter((link) => link.showInHeader),
    [socialLinks],
  );

  /** Section ids from in-page anchors; external links are skipped. */
  const sectionIds = useMemo(
    () =>
      items
        .filter((item) => item.href.startsWith("#"))
        .map((item) => item.href.slice(1)),
    [items],
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll-spy. One observer for all sections rather than one each: the
  // callback receives every crossing in a batch, so the most recently entered
  // section wins without separate observers racing.
  useEffect(() => {
    if (sectionIds.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entered = entries.filter((entry) => entry.isIntersecting);
        if (entered.length > 0) setActive(entered[entered.length - 1].target.id);
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );

    for (const id of sectionIds) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [sectionIds]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    <>
      <motion.header
        className={cn(
          "sticky top-0 z-40 w-full transition-all duration-300",
          scrolled
            ? "border-b border-border bg-background/80 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
        )}
        initial={{ y: -70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
      >
        <div className="container flex h-16 max-w-6xl items-center justify-between gap-4">
          <Link
            href="/"
            aria-label={`${settings.brandPrefix} ${settings.brandName} — home`}
            className="group inline-flex items-center rounded-md font-mono text-lg font-semibold tracking-tight"
          >
            <span
              aria-hidden
              className="text-primary transition-transform duration-300 group-hover:-translate-x-0.5"
            >
              {"{"}
            </span>
            <span className="flex items-center gap-1.5 px-1.5">
              <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {settings.brandPrefix}
              </span>
              <span className="bg-gradient-to-r from-primary to-accent-2 bg-clip-text text-transparent">
                {settings.brandName}
              </span>
            </span>
            <span
              aria-hidden
              className="text-primary transition-transform duration-300 group-hover:translate-x-0.5"
            >
              {"}"}
            </span>
          </Link>

          {/* Desktop nav — a single pill container keeps the links visually
              grouped and gives the active indicator something to slide within. */}
          <nav
            aria-label="Primary"
            className="hidden items-center gap-0.5 rounded-full border border-border bg-card/60 p-1 backdrop-blur-md md:flex"
          >
            {items.map((item) => {
              const isActive = item.href === `#${active}`;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "relative rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {isActive ? (
                    <motion.span
                      layoutId="nav-pill"
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-muted"
                      transition={{ type: "spring", stiffness: 340, damping: 30 }}
                    />
                  ) : null}
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5">
            <CommandPalette
              navItems={navItems}
              socialLinks={socialLinks}
              contactLinks={contactLinks}
              cvUrl={cvUrl}
            />

            <div className="hidden items-center gap-1.5 lg:flex">
              {socials.map((link) => {
                const Icon = resolveIcon(link.icon);
                const external = link.href.startsWith("http");

                return (
                  <a
                    key={link.id}
                    href={link.href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    <Icon aria-hidden className="h-4 w-4" />
                    <span className="sr-only">{link.label}</span>
                  </a>
                );
              })}
            </div>

            <ThemeToggle />

            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground md:hidden"
              onClick={() => setMobileOpen((open) => !open)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? (
                <X aria-hidden className="h-4 w-4" />
              ) : (
                <Menu aria-hidden className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.div
              aria-hidden
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />

            <motion.div
              id="mobile-nav"
              className="fixed right-0 top-16 z-40 flex h-[calc(100dvh-4rem)] w-full max-w-xs flex-col border-l border-border bg-background md:hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
            >
              <nav aria-label="Mobile" className="flex flex-col gap-1 p-6">
                <p className="label-mono mb-3 text-muted-foreground">Menu</p>

                {items.map((item, index) => {
                  const isActive = item.href === `#${active}`;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * index }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        aria-current={isActive ? "true" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                        )}
                      >
                        <span className="font-mono text-[11px] tabular-nums text-muted-foreground/60">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        {item.label}
                        {isActive ? (
                          <span
                            aria-hidden
                            className="ml-auto h-1.5 w-1.5 rounded-full bg-primary"
                          />
                        ) : null}
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>

              {socials.length > 0 ? (
                <div className="mt-auto space-y-3 border-t border-border p-6">
                  <p className="label-mono text-muted-foreground">Connect</p>
                  <div className="flex gap-2">
                    {socials.map((link) => {
                      const Icon = resolveIcon(link.icon);
                      const external = link.href.startsWith("http");

                      return (
                        <a
                          key={link.id}
                          href={link.href}
                          target={external ? "_blank" : undefined}
                          rel={external ? "noopener noreferrer" : undefined}
                          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                        >
                          <Icon aria-hidden className="h-4 w-4" />
                          <span className="sr-only">{link.label}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
