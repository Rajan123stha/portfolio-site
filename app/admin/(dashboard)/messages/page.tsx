import Link from "next/link";

import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { getMessages, type MessageFilter } from "@/lib/queries/admin";
import { cn } from "@/lib/utils";
import { MessageList } from "./message-list";

export const metadata = { title: "Messages" };

const TABS: { value: MessageFilter; label: string }[] = [
  { value: "inbox", label: "Inbox" },
  { value: "archived", label: "Archived" },
];

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const active: MessageFilter = filter === "archived" ? "archived" : "inbox";

  const messages = await getMessages(active);

  return (
    <>
      <PageHeader
        title="Messages"
        description="Enquiries submitted through your contact form."
      />

      <nav className="mb-6 flex gap-1" aria-label="Message filter">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={
              tab.value === "inbox"
                ? "/admin/messages"
                : `/admin/messages?filter=${tab.value}`
            }
            aria-current={active === tab.value ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active === tab.value
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {messages.length === 0 ? (
        <EmptyState
          title={active === "inbox" ? "Inbox is empty" : "Nothing archived"}
          description={
            active === "inbox"
              ? "New enquiries from your contact form land here."
              : "Messages you archive are kept here rather than deleted."
          }
        />
      ) : (
        <MessageList messages={messages} filter={active} />
      )}
    </>
  );
}
