"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageOff, Pencil, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmButton } from "@/components/admin/confirm-button";
import { SortableList } from "@/components/admin/sortable-list";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  deleteProject,
  reorderProjects,
  toggleProjectVisibility,
} from "@/lib/actions/projects";
import type { Project, ProjectCategory } from "@/db/schema";
import { cn } from "@/lib/utils";

type ProjectWithCategory = Project & { category: ProjectCategory | null };

export function ProjectList({ projects }: { projects: ProjectWithCategory[] }) {
  const router = useRouter();

  return (
    <SortableList items={projects} onReorder={reorderProjects}>
      {(project) => (
        <ProjectRow project={project} onChanged={() => router.refresh()} />
      )}
    </SortableList>
  );
}

function ProjectRow({
  project,
  onChanged,
}: {
  project: ProjectWithCategory;
  onChanged: () => void;
}) {
  const [visible, setVisible] = useState(project.visible);
  const [, startToggle] = useTransition();

  const onToggle = (next: boolean) => {
    setVisible(next);
    startToggle(async () => {
      const result = await toggleProjectVisibility(project.id, next);
      if (!result.ok) {
        setVisible(!next);
        toast.error(result.error);
        return;
      }
      onChanged();
    });
  };

  return (
    <div className={cn("flex items-center gap-3", !visible && "opacity-60")}>
      <div className="relative hidden h-12 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted sm:block">
        {project.imageUrl ? (
          <Image
            src={project.imageUrl}
            alt=""
            fill
            sizes="80px"
            className="object-cover"
            unoptimized={!project.imageUrl.includes("res.cloudinary.com")}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageOff aria-hidden className="h-4 w-4" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
          {project.title}
          {project.featured ? (
            <Star
              aria-label="Featured"
              className="h-3 w-3 shrink-0 fill-primary text-primary"
            />
          ) : null}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {project.category?.label ?? "Uncategorised"} · /{project.slug}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Switch
          checked={visible}
          onCheckedChange={onToggle}
          aria-label={`${visible ? "Hide" : "Show"} ${project.title}`}
        />

        <Button asChild variant="ghost" size="icon">
          <Link href={`/admin/projects/${project.id}`}>
            <Pencil aria-hidden className="h-4 w-4" />
            <span className="sr-only">Edit {project.title}</span>
          </Link>
        </Button>

        <ConfirmButton
          action={() => deleteProject(project.id)}
          title="Delete this project?"
          description={`“${project.title}” will be permanently removed. If you just want it off the site, hide it instead.`}
          onDone={onChanged}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 aria-hidden className="h-4 w-4" />
          <span className="sr-only">Delete {project.title}</span>
        </ConfirmButton>
      </div>
    </div>
  );
}
