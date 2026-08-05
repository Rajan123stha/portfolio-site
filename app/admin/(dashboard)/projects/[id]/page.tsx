import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { getProjectById, getProjectCategories } from "@/lib/queries/admin";
import { ProjectForm } from "../project-form";

export const metadata = { title: "Edit project" };

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [project, categories] = await Promise.all([
    getProjectById(id),
    getProjectCategories(),
  ]);

  if (!project) notFound();

  return (
    <>
      <PageHeader
        title={project.title}
        description={project.visible ? "Live on the site." : "Hidden from the site."}
      />
      <ProjectForm project={project} categories={categories} />
    </>
  );
}
