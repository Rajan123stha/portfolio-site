import { PageHeader, Panel } from "@/components/admin/page-header";
import { getSkillGroupsWithSkills, getSkillLevels } from "@/lib/queries/admin";
import { LevelEditor } from "./level-editor";
import { GroupManager } from "./group-manager";

export const metadata = { title: "Skills" };

export default async function SkillsPage() {
  const [levels, groups] = await Promise.all([
    getSkillLevels(),
    getSkillGroupsWithSkills(),
  ]);

  return (
    <>
      <PageHeader
        title="Skills"
        description="Two cards on the public page, each holding a list of skills rated against a shared set of proficiency tiers."
      />

      <div className="space-y-6">
        <Panel
          title="Proficiency tiers"
          description="The legend above the grid. The percentage sets how far each bar fills."
        >
          <LevelEditor levels={levels} />
        </Panel>

        <GroupManager groups={groups} levels={levels} />
      </div>
    </>
  );
}
