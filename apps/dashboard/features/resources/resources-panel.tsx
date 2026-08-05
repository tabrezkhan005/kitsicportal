"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@kitsic/ui";
import { BookOpen, ExternalLink, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageCreateButton } from "@/components/page-create-button";
import { PageHeader } from "@/components/page-header";
import { Modal } from "@/components/modal";
import { AddResourceForm } from "@/features/resources/add-resource-form";
import { RESOURCE_CATEGORIES } from "@/lib/platform-constants";

interface Resource {
  id: string;
  title: string;
  description: string | null;
  url: string;
  category: string;
  author: { full_name: string | null } | null;
}

interface ResourcesPanelProps {
  resources: Resource[];
  canManage?: boolean;
}

export function ResourcesPanel({ resources, canManage = false }: ResourcesPanelProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? resources : resources.filter((r) => r.category === filter);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Resources"
        description="Internships, roadmaps, tools, and learning links"
        actions={canManage ? <PageCreateButton label="Add resource" onClick={() => setOpen(true)} /> : undefined}
      />

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setFilter("all")} className={filter === "all" ? "members-filter-active rounded-full px-3 py-1.5 font-ui text-xs font-semibold" : "members-filter-inactive rounded-full px-3 py-1.5 font-ui text-xs font-semibold"}>
          All
        </button>
        {RESOURCE_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setFilter(cat.value)}
            className={filter === cat.value ? "members-filter-active rounded-full px-3 py-1.5 font-ui text-xs font-semibold" : "members-filter-inactive rounded-full px-3 py-1.5 font-ui text-xs font-semibold"}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="No resources yet" description="Leadership can add internship links, roadmaps, and tools here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((resource) => (
            <Card key={resource.id} className="dashboard-card">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="font-display text-base text-primary">{resource.title}</CardTitle>
                  <Badge variant="muted" className="capitalize">{resource.category}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {resource.description && <p className="font-body text-sm text-muted">{resource.description}</p>}
                <a href={resource.url} target="_blank" rel="noopener noreferrer" className="dashboard-action-btn inline-flex font-ui text-sm">
                  Open resource
                  <ExternalLink className="h-4 w-4" />
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onOpenChange={setOpen} title="Add resource">
        <AddResourceForm onSuccess={() => setOpen(false)} />
      </Modal>
    </div>
  );
}
