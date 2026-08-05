import type { NavItem } from "@kitsic/types";

export interface NavGroup {
  id: string;
  title: string;
  icon: string;
  hrefs: string[];
}

/** Groups dashboard routes into collapsible sidebar sections */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "home",
    title: "Home",
    icon: "layout-dashboard",
    hrefs: ["/", "/analytics", "/calendar"],
  },
  {
    id: "workspace",
    title: "Workspace",
    icon: "layout-kanban",
    hrefs: ["/tasks", "/whiteboard", "/meetings", "/projects"],
  },
  {
    id: "club",
    title: "Club",
    icon: "users",
    hrefs: ["/members", "/events", "/learning", "/resources", "/messages", "/attendance", "/announcements"],
  },
  {
    id: "operations",
    title: "Operations",
    icon: "wallet",
    hrefs: ["/finance", "/inventory", "/reports"],
  },
  {
    id: "account",
    title: "Account",
    icon: "user",
    hrefs: ["/profile", "/settings", "/audit"],
  },
];

export function buildGroupedNavigation(items: NavItem[]) {
  const itemByHref = new Map(items.map((item) => [item.href, item]));
  const used = new Set<string>();

  const groups = NAV_GROUPS.map((group) => {
    const groupItems = group.hrefs
      .map((href) => itemByHref.get(href))
      .filter((item): item is NavItem => Boolean(item));

    groupItems.forEach((item) => used.add(item.href));
    return { ...group, items: groupItems };
  }).filter((group) => group.items.length > 0);

  const ungrouped = items.filter((item) => !used.has(item.href));
  if (ungrouped.length > 0) {
    groups.push({
      id: "more",
      title: "More",
      icon: "settings",
      hrefs: ungrouped.map((i) => i.href),
      items: ungrouped,
    });
  }

  return groups;
}

export function getActiveGroupId(pathname: string, groups: ReturnType<typeof buildGroupedNavigation>) {
  const match = groups.find((group) =>
    group.items.some((item) =>
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href),
    ),
  );
  return match?.id ?? groups[0]?.id ?? "home";
}
