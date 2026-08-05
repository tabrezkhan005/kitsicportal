"use client";

import { SidebarProvider } from "@/components/ui/sidebar-component";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { AiAssistant } from "@/components/ai-assistant";
import type { NavItem, SessionUser } from "@kitsic/types";

interface DashboardShellProps {
  navigation: NavItem[];
  user: SessionUser;
  children: React.ReactNode;
}

export function DashboardShell({ navigation, user, children }: DashboardShellProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar items={navigation} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <AppHeader user={user} />
          <main className="dashboard-grid-bg dashboard-scroll flex-1 overflow-y-auto p-5 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
        <AiAssistant />
      </div>
    </SidebarProvider>
  );
}
