import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { getProjectCategories } from "@/lib/queries/admin";
import { CategoryEditor } from "./category-editor";

export const metadata = { title: "Project categories" };

export default async function CategoriesPage() {
  const categories = await getProjectCategories();

  return (
    <>
      <PageHeader
        title="Project categories"
        description="These become the filter tabs above the project grid. A tab only appears when it has at least one visible project."
        actions={
          <Button asChild variant="outline" className="gap-1.5">
            <Link href="/admin/projects">
              <ArrowLeft aria-hidden className="h-4 w-4" />
              Back to projects
            </Link>
          </Button>
        }
      />
      <CategoryEditor categories={categories} />
    </>
  );
}
