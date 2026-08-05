import { PageHeader } from "@/components/admin/page-header";
import { getSiteSettingsForAdmin } from "@/lib/queries/admin";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings & SEO" };

export default async function SettingsPage() {
  const settings = await getSiteSettingsForAdmin();

  return (
    <>
      <PageHeader
        title="Settings & SEO"
        description="Branding, search-engine metadata and analytics."
      />
      <SettingsForm settings={settings} />
    </>
  );
}
