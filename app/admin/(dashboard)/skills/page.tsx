import { PageHeader } from "@/components/admin/page-header";
import { getSkillGroupsWithSkills } from "@/lib/queries/admin";
import { GroupManager } from "./group-manager";

export const metadata = { title: "Skills" };

export default async function SkillsPage() {
  const groups = await getSkillGroupsWithSkills();

  return (
    <>
      <PageHeader
        title="Skills"
        description="Grouped into cards on the public page. Drag groups or the skills inside them to reorder."
      />
      <GroupManager groups={groups} />
    </>
  );
}
