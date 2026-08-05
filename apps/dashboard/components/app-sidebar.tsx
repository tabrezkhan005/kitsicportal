"use client";

import type { NavItem } from "@kitsic/types";
import { KitsicSidebar } from "@/components/ui/sidebar-component";

interface AppSidebarProps {
  items: NavItem[];
}

export function AppSidebar({ items }: AppSidebarProps) {
  return <KitsicSidebar items={items} />;
}
