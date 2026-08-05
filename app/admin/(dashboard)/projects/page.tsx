import Link from "next/link";
import { Plus, Tags } from "lucide-react";

import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { getProjectsForAdmin } from "@/lib/queries/admin";
import { ProjectList } from "./project-list";

export const metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const projects = await getProjectsForAdmin();

  return (
    <>
      <PageHeader
        title="Projects"
        description="Drag to reorder. Hidden projects keep their content but disappear from the public grid."
        actions={
          <>
            <Button asChild variant="outline" className="gap-1.5">
              <Link href="/admin/projects/categories">
                <Tags aria-hidden className="h-4 w-4" />
                Categories
              </Link>
            </Button>
            <Button asChild className="gap-1.5">
              <Link href="/admin/projects/new">
                <Plus aria-hidden className="h-4 w-4" />
                New project
              </Link>
            </Button>
          </>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Add your first project to fill the portfolio grid."
          action={
            <Button asChild>
              <Link href="/admin/projects/new">New project</Link>
            </Button>
          }
        />
      ) : (
        <ProjectList projects={projects} />
      )}
    </>
  );
}
