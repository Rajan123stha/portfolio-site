"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Download,
  Moon,
  Search,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { resolveIcon } from "@/lib/design-tokens";
import type {
  ContactLinkView,
  NavItemView,
  SocialLinkView,
} from "@/lib/queries/public";
import { cn } from "@/lib/utils";

type CommandPaletteProps = {
  navItems: NavItemView[];
  socialLinks: SocialLinkView[];
  contactLinks: ContactLinkView[];
  cvUrl: string | null;
};

/**
 * ⌘K launcher for the whole site.
 *
 * Every entry is built from the same CMS data the page renders, so adding a
 * menu item or a social link in the admin panel makes it searchable here
 * automatically — there is no second list to keep in sync.
 *
 * It's a genuine convenience on a long single-page scroll, and for this
 * audience it's also the expected interaction: a developer landing on a
 * developer's portfolio will try ⌘K.
 */
export function CommandPalette({
  navItems,
  socialLinks,
  contactLinks,
  cvUrl,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // ⌘K on macOS, Ctrl+K elsewhere. `event.key` is already layout-aware.
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((isOpen) => !isOpen);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  /** Close first, then act — otherwise the dialog fights the scroll. */
  const run = useCallback((action: () => void) => {
    setOpen(false);
    // A frame's delay lets the dialog release its scroll lock before an
    // in-page jump, which would otherwise be swallowed.
    requestAnimationFrame(action);
  }, []);

  const goTo = (href: string) =>
    run(() => {
      if (href.startsWith("#")) {
        document
          .getElementById(href.slice(1))
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        router.push(href);
      }
    });

  const openExternal = (href: string) =>
    run(() => window.open(href, "_blank", "noopener,noreferrer"));

  const email = contactLinks.find((link) =>
    link.href.startsWith("mailto:"),
  )?.value;

  const copyEmail = () =>
    run(async () => {
      if (!email) return;
      try {
        await navigator.clipboard.writeText(email);
        setCopied(true);
        toast.success("Email copied to clipboard.");
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard access needs a secure context and can be denied outright.
        toast.error("Couldn't copy — your browser blocked clipboard access.");
      }
    });

  const isDark = resolvedTheme === "dark";

  return (
    <>
      <PaletteTrigger onClick={() => setOpen(true)} />

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Jump to a section, open a link, run a command…" />

        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>

          {navItems.length > 0 ? (
            <CommandGroup heading="Navigate">
              {navItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`go ${item.label}`}
                  onSelect={() => goTo(item.href)}
                >
                  <Search aria-hidden className="mr-2 h-4 w-4 opacity-60" />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {socialLinks.length > 0 || contactLinks.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Links">
                {[...contactLinks, ...socialLinks].map((link) => {
                  const Icon = resolveIcon(link.icon);
                  const isMailto = link.href.startsWith("mailto:");

                  return (
                    <CommandItem
                      key={`${link.id}-${link.label}`}
                      value={`open ${link.label}`}
                      onSelect={() =>
                        isMailto
                          ? run(() => {
                              window.location.href = link.href;
                            })
                          : openExternal(link.href)
                      }
                    >
                      <Icon aria-hidden className="mr-2 h-4 w-4 opacity-60" />
                      {link.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </>
          ) : null}

          <CommandSeparator />
          <CommandGroup heading="Actions">
            {email ? (
              <CommandItem value="copy email address" onSelect={copyEmail}>
                {copied ? (
                  <Check aria-hidden className="mr-2 h-4 w-4 opacity-60" />
                ) : (
                  <Copy aria-hidden className="mr-2 h-4 w-4 opacity-60" />
                )}
                Copy email address
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  {email}
                </span>
              </CommandItem>
            ) : null}

            {cvUrl ? (
              <CommandItem
                value="download cv resume"
                onSelect={() => run(() => window.open(cvUrl, "_blank"))}
              >
                <Download aria-hidden className="mr-2 h-4 w-4 opacity-60" />
                Download CV
              </CommandItem>
            ) : null}

            <CommandItem
              value="toggle theme dark light"
              onSelect={() => run(() => setTheme(isDark ? "light" : "dark"))}
            >
              {isDark ? (
                <Sun aria-hidden className="mr-2 h-4 w-4 opacity-60" />
              ) : (
                <Moon aria-hidden className="mr-2 h-4 w-4 opacity-60" />
              )}
              Switch to {isDark ? "light" : "dark"} theme
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

/**
 * The visible entry point.
 *
 * A keyboard-only feature is invisible to everyone who doesn't already know it
 * exists, so the shortcut is advertised as a button — which is also what makes
 * it reachable on touch devices.
 */
function PaletteTrigger({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  const [isApple, setIsApple] = useState(false);

  // The platform is unknown during SSR, so the key hint renders after mount.
  useEffect(() => {
    setIsApple(/Mac|iPhone|iPad|iPod/.test(navigator.platform));
  }, []);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open command palette"
      className={cn(
        "group flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground",
        className,
      )}
    >
      <Search aria-hidden className="h-3.5 w-3.5" />
      <span className="hidden text-xs sm:inline">Search</span>
      <kbd className="hidden items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
        {isApple ? "⌘" : "Ctrl"} K
      </kbd>
    </button>
  );
}
