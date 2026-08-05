import { PageHeader } from "@/components/admin/page-header";
import { getExperiences } from "@/lib/queries/admin";
import { ExperienceManager } from "./experience-manager";

export const metadata = { title: "Experience" };

export default async function ExperiencePage() {
  const experiences = await getExperiences();

  return (
    <>
      <PageHeader
        title="Experience"
        description="Your career timeline. Drag to reorder — the top entry appears first."
      />
      <ExperienceManager experiences={experiences} />
    </>
  );
}
