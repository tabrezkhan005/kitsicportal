/** Roles hidden from the member-facing leaderboard (leadership & department heads) */
export const LEADERBOARD_EXCLUDED_ROLE_SLUGS = [
  "president",
  "vice_president",
  "secretary",
  "treasurer",
  "technical_head",
  "social_media_head",
  "resource_head",
  "logistics_head",
  "student_lead",
] as const;

export type LeaderboardExcludedRole = (typeof LEADERBOARD_EXCLUDED_ROLE_SLUGS)[number];

export function isLeaderboardPeer(roleSlugs: string[]): boolean {
  if (roleSlugs.length === 0) return true;
  return !roleSlugs.some((slug) =>
    (LEADERBOARD_EXCLUDED_ROLE_SLUGS as readonly string[]).includes(slug),
  );
}

export function viewerSeesFullLeaderboard(viewerRoles: string[]): boolean {
  return viewerRoles.some((slug) =>
    (LEADERBOARD_EXCLUDED_ROLE_SLUGS as readonly string[]).includes(slug),
  );
}

export function filterLeaderboardForViewer<T extends { roles: string[] }>(
  entries: T[],
  viewerRoles: string[],
): T[] {
  if (viewerSeesFullLeaderboard(viewerRoles)) return entries;
  return entries.filter((entry) => isLeaderboardPeer(entry.roles));
}

export function rankLeaderboardEntry<T extends { id: string }>(
  entries: T[],
  userId: string,
): number {
  const index = entries.findIndex((entry) => entry.id === userId);
  return index >= 0 ? index + 1 : 0;
}
