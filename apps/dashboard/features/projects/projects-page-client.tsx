"use client";

import { useState } from "react";
import { Button } from "@kitsic/ui";
import { FolderKanban, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageCreateButton } from "@/components/page-create-button";
import { PageHeader } from "@/components/page-header";
import { Modal } from "@/components/modal";
import { CreateForm } from "@/components/create-form";
import { createProject } from "@/lib/actions";
import { ProjectsGrid } from "@/features/projects/projects-grid";

interface ProjectsPageClientProps {
  projects: Parameters<typeof ProjectsGrid>[0]["projects"];
  canManage: boolean;
}

export function ProjectsPageClient({ projects, canManage }: ProjectsPageClientProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description={`${projects.length} club project${projects.length === 1 ? "" : "s"}`}
        actions={
          canManage ? (
            <PageCreateButton label="New project" onClick={() => setOpen(true)} />
          ) : undefined
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Track club initiatives, assign leads, and monitor progress."
          action={
            canManage ? (
              <Button type="button" onClick={() => setOpen(true)} className="font-ui rounded-xl">
                <Plus className="h-4 w-4" />
                Create first project
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ProjectsGrid projects={projects} />
      )}

      <Modal open={open} onOpenChange={setOpen} title="Create project">
        <CreateForm
          action={createProject}
          onSuccess={() => setOpen(false)}
          fields={[
            { name: "name", label: "Name", required: true },
            { name: "description", label: "Description", type: "textarea" },
            {
              name: "domain",
              label: "Domain",
              options: [
                { value: "Technical", label: "Technical" },
                { value: "Events", label: "Events" },
                { value: "Marketing", label: "Marketing" },
              ],
            },
          ]}
        />
      </Modal>
    </div>
  );
}
