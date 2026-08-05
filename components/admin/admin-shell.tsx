"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ExternalLink,
  LogOut,
  Menu,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";
import { resolveIcon } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { ADMIN_NAV } from "./nav-config";

type AdminShellProps = {
  admin: { name: string; email: string };
  unreadMessages: number;
  children: React.ReactNode;
};

/**
 * Admin chrome: fixed sidebar on desktop, slide-over drawer below `lg`.
 *
 * A client component because it owns the drawer, the theme toggle and
 * active-route highlighting. Everything inside it stays a server component —
 * the page content is passed through as `children`, so none of the editors get
 * pulled into the client bundle by this wrapper.
 */
export function AdminShell({
  admin,
  unreadMessages,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Navigating from the drawer should close it.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-screen bg-muted/30">
      <Sidebar
        pathname={pathname}
        unreadMessages={unreadMessages}
        admin={admin}
        className="hidden lg:flex"
      />

      {/* Mobile drawer */}
      {open ? (
        <>
          <div
            aria-hidden
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          />
          <Sidebar
            pathname={pathname}
            unreadMessages={unreadMessages}
            admin={admin}
            className="fixed z-50 flex lg:hidden"
            onClose={() => setOpen(false)}
          />
        </>
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu aria-hidden className="h-4 w-4" />
          </Button>

          <p className="truncate text-sm font-medium text-muted-foreground lg:hidden">
            Portfolio CMS
          </p>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <a href="/" target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">View site</span>
              </a>
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

function Sidebar({
  pathname,
  unreadMessages,
  admin,
  className,
  onClose,
}: {
  pathname: string;
  unreadMessages: number;
  admin: { name: string; email: string };
  className?: string;
  onClose?: () => void;
}) {
  return (
    <aside
      className={cn(
        "inset-y-0 left-0 w-72 flex-col border-r border-border bg-background lg:fixed",
        className,
      )}
    >
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-5">
        <Link
          href="/admin"
          className="font-mono text-sm font-semibold tracking-tight"
        >
          <span className="text-primary">{"{"}</span>
          <span className="px-1 uppercase tracking-widest">CMS</span>
          <span className="text-primary">{"}"}</span>
        </Link>

        {onClose ? (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X aria-hidden className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <nav
        aria-label="Admin"
        className="flex-1 space-y-6 overflow-y-auto px-3 py-5"
      >
        {ADMIN_NAV.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {group.label}
            </p>

            {group.items.map((item) => {
              const Icon = resolveIcon(item.icon);
              // `/admin` would otherwise match every child route.
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon aria-hidden className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>

                  {item.badge === "unreadMessages" && unreadMessages > 0 ? (
                    <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary-foreground">
                      {unreadMessages > 99 ? "99+" : unreadMessages}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="shrink-0 space-y-3 border-t border-border p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{admin.name}</p>
          <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
        </div>

        {/*
          A plain form posting to the action: signing out must work even if the
          client bundle failed to hydrate.
        */}
        <form action={logout}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
          >
            <LogOut aria-hidden className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // The theme is unknown until the client resolves it, so render a stable
  // placeholder first rather than guessing and flipping after hydration.
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {mounted && isDark ? (
        <Sun aria-hidden className="h-4 w-4" />
      ) : (
        <Moon aria-hidden className="h-4 w-4" />
      )}
    </Button>
  );
}
