import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth/guard";
import { getUnreadMessageCount } from "@/lib/queries/admin";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

/**
 * The authenticated half of /admin.
 *
 * `/admin/login` sits outside this route group so it doesn't inherit the shell
 * — or the `requireAdmin()` call, which would otherwise redirect the login page
 * to itself.
 *
 * The middleware has already rejected anonymous requests by this point; this
 * second check is what catches a session that was revoked after the token was
 * issued, which the Edge runtime can't see.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  const unreadMessages = await getUnreadMessageCount();

  return (
    <AdminShell
      admin={{ name: admin.name, email: admin.email }}
      unreadMessages={unreadMessages}
    >
      {children}
    </AdminShell>
  );
}
