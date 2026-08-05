"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  CheckCheck,
  Mail,
  MailOpen,
  Reply,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmButton } from "@/components/admin/confirm-button";
import { Button } from "@/components/ui/button";
import {
  deleteMessage,
  markAllRead,
  setMessageArchived,
  setMessageRead,
} from "@/lib/actions/messages";
import type { Message } from "@/db/schema";
import type { MessageFilter } from "@/lib/queries/admin";
import { cn } from "@/lib/utils";

/**
 * Absolute date plus a relative hint. "3 days ago" alone is ambiguous once a
 * thread matters; the exact timestamp is what you quote back to someone.
 */
function formatWhen(date: Date): { absolute: string; relative: string } {
  const absolute = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);

  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.round(diffMs / 86_400_000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  const relative =
    Math.abs(diffDays) >= 1
      ? formatter.format(diffDays, "day")
      : formatter.format(Math.round(diffMs / 3_600_000), "hour");

  return { absolute, relative };
}

export function MessageList({
  messages,
  filter,
}: {
  messages: Message[];
  filter: MessageFilter;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const unreadIds = messages.filter((m) => !m.isRead).map((m) => m.id);

  const onMarkAllRead = () => {
    startTransition(async () => {
      const result = await markAllRead({ ids: unreadIds });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Done.");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {unreadIds.length > 0 ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onMarkAllRead}
            disabled={isPending}
            className="gap-1.5"
          >
            <CheckCheck aria-hidden className="h-3.5 w-3.5" />
            Mark all read ({unreadIds.length})
          </Button>
        </div>
      ) : null}

      <ul className="space-y-3">
        {messages.map((message) => (
          <li key={message.id}>
            <MessageCard
              message={message}
              filter={filter}
              onChanged={() => router.refresh()}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function MessageCard({
  message,
  filter,
  onChanged,
}: {
  message: Message;
  filter: MessageFilter;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(!message.isRead);
  const [isPending, startTransition] = useTransition();

  const { absolute, relative } = formatWhen(new Date(message.createdAt));

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) => {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      onChanged();
    });
  };

  /** Opening a message is what marks it read — no separate step. */
  const onToggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !message.isRead) {
      startTransition(async () => {
        await setMessageRead(message.id, true);
        onChanged();
      });
    }
  };

  const replyHref = `mailto:${message.email}?subject=${encodeURIComponent(
    `Re: your message`,
  )}`;

  return (
    <article
      className={cn(
        "rounded-xl border bg-card shadow-sm transition-colors",
        message.isRead ? "border-border" : "border-primary/40 bg-primary/[0.03]",
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <span
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              message.isRead
                ? "bg-muted text-muted-foreground"
                : "bg-primary/10 text-primary",
            )}
          >
            {message.isRead ? (
              <MailOpen aria-hidden className="h-4 w-4" />
            ) : (
              <Mail aria-hidden className="h-4 w-4" />
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span
                className={cn(
                  "truncate text-sm",
                  message.isRead ? "font-medium" : "font-semibold",
                )}
              >
                {message.name}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {message.email}
              </span>
            </span>

            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {expanded ? (
                <time dateTime={new Date(message.createdAt).toISOString()}>
                  {absolute} · {relative}
                </time>
              ) : (
                message.body
              )}
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            asChild
            variant="ghost"
            size="icon"
            title={`Reply to ${message.name}`}
          >
            <a href={replyHref}>
              <Reply aria-hidden className="h-4 w-4" />
              <span className="sr-only">Reply to {message.name}</span>
            </a>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isPending}
            onClick={() =>
              run(() => setMessageArchived(message.id, filter !== "archived"))
            }
            title={filter === "archived" ? "Restore to inbox" : "Archive"}
          >
            {filter === "archived" ? (
              <ArchiveRestore aria-hidden className="h-4 w-4" />
            ) : (
              <Archive aria-hidden className="h-4 w-4" />
            )}
            <span className="sr-only">
              {filter === "archived" ? "Restore" : "Archive"} message from{" "}
              {message.name}
            </span>
          </Button>

          <ConfirmButton
            action={() => deleteMessage(message.id)}
            title="Delete this message?"
            description={`The message from ${message.name} will be permanently removed. Archive it instead if you might need it later.`}
            onDone={onChanged}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 aria-hidden className="h-4 w-4" />
            <span className="sr-only">Delete message from {message.name}</span>
          </ConfirmButton>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-border px-4 py-4">
          {/* `whitespace-pre-wrap` preserves the sender's line breaks. */}
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {message.body}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm" className="gap-1.5">
              <a href={replyHref}>
                <Reply aria-hidden className="h-3.5 w-3.5" />
                Reply by email
              </a>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => run(() => setMessageRead(message.id, false))}
            >
              Mark unread
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
