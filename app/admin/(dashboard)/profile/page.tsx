import { PageHeader } from "@/components/admin/page-header";
import { getProfileForAdmin } from "@/lib/queries/admin";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Profile & hero" };

export default async function ProfilePage() {
  const profile = await getProfileForAdmin();

  return (
    <>
      <PageHeader
        title="Profile & hero"
        description="Your name, tagline, portrait and the intro paragraphs that open the page."
      />
      <ProfileForm profile={profile} />
    </>
  );
}
