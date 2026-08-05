import { PageHeader, Panel } from "@/components/admin/page-header";
import { getCoreStackItems, getHighlightGroupsWithItems } from "@/lib/queries/admin";
import { CoreStackEditor } from "./core-stack-editor";
import { HighlightManager } from "./highlight-manager";

export const metadata = { title: "Why work with me" };

export default async function HighlightsPage() {
  const [groups, coreStack] = await Promise.all([
    getHighlightGroupsWithItems(),
    getCoreStackItems(),
  ]);

  return (
    <>
      <PageHeader
        title="Why work with me"
        description="The two-card section near the bottom of the page, plus the core-stack list in your About section."
      />

      <div className="space-y-6">
        <HighlightManager groups={groups} />

        <Panel
          title="Core stack"
          description="The icon list beside your About paragraphs."
        >
          <CoreStackEditor items={coreStack} />
        </Panel>
      </div>
    </>
  );
}
