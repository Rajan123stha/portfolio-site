import { PageHeader, Panel } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/guard";
import { signOutEverywhere } from "@/lib/actions/auth";
import { AccountForm, PasswordForm } from "./account-forms";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const admin = await requireAdmin();

  return (
    <>
      <PageHeader
        title="Account"
        description="Your sign-in details for this panel."
      />

      <div className="space-y-6">
        <Panel title="Profile">
          <AccountForm name={admin.name} email={admin.email} />
        </Panel>

        <Panel
          title="Password"
          description="Changing your password signs out every other device."
        >
          <PasswordForm />
        </Panel>

        <Panel
          title="Sessions"
          description="Use this if you think someone else has access, or you signed in on a device you no longer have."
        >
          <form action={signOutEverywhere}>
            <Button type="submit" variant="outline">
              Sign out everywhere
            </Button>
          </form>
        </Panel>
      </div>
    </>
  );
}
