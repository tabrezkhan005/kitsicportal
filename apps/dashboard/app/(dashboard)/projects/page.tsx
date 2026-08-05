import { requirePermission } from "@kitsic/auth";
import { getProjects } from "@/lib/data";
import { ForbiddenPage } from "@/components/forbidden-page";
import { ProjectsPageClient } from "@/features/projects/projects-page-client";

export const metadata = { title: "Projects" };

export default async function ProjectsPage() {
  let user;
  try {
    user = await requirePermission("projects.read");
  } catch {
    return <ForbiddenPage />;
  }

  const projects = await getProjects();

  return (
    <ProjectsPageClient
      projects={projects}
      canManage={user.permissions.includes("projects.manage")}
    />
  );
}
