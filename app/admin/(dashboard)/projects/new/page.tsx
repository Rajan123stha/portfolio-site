import { PageHeader } from "@/components/admin/page-header";
import { getProjectCategories } from "@/lib/queries/admin";
import { ProjectForm } from "../project-form";

export const metadata = { title: "New project" };

export default async function NewProjectPage() {
  const categories = await getProjectCategories();

  return (
    <>
      <PageHeader
        title="New project"
        description="It goes to the end of the grid — drag it into place from the list afterwards."
      />
      <ProjectForm project={null} categories={categories} />
    </>
  );
}
