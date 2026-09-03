import type { getOverviewData } from "@/lib/data";

export type OverviewData = Awaited<ReturnType<typeof getOverviewData>>;

export type DashboardSectionId =
  | "taskPipeline"
  | "events"
  | "projects"
  | "meetings"
  | "announcements"
  | "contributors"
  | "myTasks"
  | "finance"
  | "inventory";

export interface LeadershipRosterMember {
  id: string;
  full_name: string | null;
  email: string;
  member_id?: string | null;
  roles: string[];
  roleSlugs: string[];
  avatar_url: string | null;
  avatar_color?: string;
}
