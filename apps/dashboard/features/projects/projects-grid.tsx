import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kitsic/ui";
import { ExternalLink, FolderKanban, User } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  progress: number;
  domain: string | null;
  repository_url: string | null;
  is_public: boolean;
  lead: { full_name: string | null } | { full_name: string | null }[] | null;
}

interface ProjectsGridProps {
  projects: Project[];
}

function getLeadName(lead: Project["lead"]) {
  if (!lead) return "—";
  if (Array.isArray(lead)) return lead[0]?.full_name ?? "—";
  return lead.full_name ?? "—";
}

export function ProjectsGrid({ projects }: ProjectsGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <Card key={project.id} className="border-border/80 transition-shadow hover:shadow-[var(--shadow-elevated)]">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-accent" />
                <CardTitle className="text-primary">{project.name}</CardTitle>
              </div>
              <Badge variant={project.status === "completed" ? "accent" : "muted"}>{project.status.replace("_", " ")}</Badge>
            </div>
            <CardDescription>{project.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-primary">{project.progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-background">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${project.progress}%` }} />
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4 text-accent" />
              Lead: {getLeadName(project.lead)}
            </div>
            {project.domain && (
              <Badge variant="muted" className="text-[10px]">{project.domain}</Badge>
            )}
            {project.repository_url && (
              <a href={project.repository_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-accent hover:underline">
                <ExternalLink className="h-3 w-3" />
                Repository
              </a>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
