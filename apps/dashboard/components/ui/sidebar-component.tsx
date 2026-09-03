"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@kitsic/utils";
import type { NavItem } from "@kitsic/types";
import { getNavIcon } from "@/lib/nav-icons";
import {
  buildGroupedNavigation,
  getActiveGroupId,
} from "@/lib/nav-groups";

const softSpring = "cubic-bezier(0.25, 1.1, 0.4, 1)";

interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  toggleCollapsed: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("kitsic-sidebar-collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);

  function setCollapsedPersist(value: boolean) {
    setCollapsed(value);
    localStorage.setItem("kitsic-sidebar-collapsed", String(value));
  }

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        setCollapsed: setCollapsedPersist,
        toggleCollapsed: () => setCollapsedPersist(!collapsed),
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}

interface KitsicSidebarProps {
  items: NavItem[];
}

export function KitsicSidebar({ items }: KitsicSidebarProps) {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed } = useSidebar();
  const groups = useMemo(() => buildGroupedNavigation(items), [items]);
  const [activeGroupId, setActiveGroupId] = useState(() => getActiveGroupId(pathname, groups));
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set([activeGroupId]));

  useEffect(() => {
    const id = getActiveGroupId(pathname, groups);
    setActiveGroupId(id);
    setExpandedSections((prev) => new Set(prev).add(id));
  }, [pathname, groups]);

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? groups[0];

  function toggleSection(id: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div
      className={cn(
        "dashboard-shell-sidebar flex h-full shrink-0 transition-[width] duration-500",
        collapsed ? "w-[4.5rem]" : "w-[17.5rem]",
      )}
      style={{ transitionTimingFunction: softSpring }}
    >
      {/* Icon rail */}
      <aside className="flex w-[4.5rem] shrink-0 flex-col items-center border-r border-[var(--dashboard-border-subtle)] py-3">
        <Link href="/" className="mb-3 flex h-10 w-10 items-center justify-center">
          <Image
            src="/logo/bgic.png"
            alt="KITSIC"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
            priority
            unoptimized
          />
        </Link>

        <div className="flex flex-1 flex-col gap-1.5">
          {groups.map((group) => {
            const Icon = getNavIcon(group.icon);
            const isActive = activeGroupId === group.id;
            return (
              <button
                key={group.id}
                type="button"
                title={group.title}
                onClick={() => {
                  setActiveGroupId(group.id);
                  setExpandedSections((prev) => new Set(prev).add(group.id));
                  if (collapsed) toggleCollapsed();
                }}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-200",
                  isActive
                    ? "sidebar-rail-active"
                    : "text-muted hover:bg-[var(--dashboard-muted-surface)] hover:text-primary",
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="mt-2 flex h-9 w-9 items-center justify-center rounded-lg text-primary/40 transition-colors hover:bg-primary/5 hover:text-primary"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      {/* Detail panel */}
      <aside
        className={cn(
          "flex min-w-0 flex-1 flex-col overflow-hidden transition-all duration-500",
          collapsed ? "w-0 opacity-0 pointer-events-none" : "opacity-100",
        )}
        style={{ transitionTimingFunction: softSpring }}
      >
        <div className="border-b border-[var(--dashboard-border-subtle)] px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-base font-bold tracking-tight text-primary">
                {activeGroup?.title ?? "Menu"}
              </p>
              <p className="font-mono-brand text-[10px] uppercase tracking-[0.14em] text-muted">
                Innovation Club
              </p>
            </div>
          </div>
          <div className="mt-3 flex h-9 items-center gap-2 rounded-lg dashboard-input-surface px-3">
            <Search className="h-3.5 w-3.5 text-muted" />
            <span className="font-body text-xs text-muted">⌘K to search</span>
          </div>
        </div>

        <nav className="dashboard-scroll flex-1 overflow-y-auto p-3">
          {groups.map((group) => {
            const isOpen = expandedSections.has(group.id);
            const GroupIcon = getNavIcon(group.icon);
            return (
              <div key={group.id} className="mb-2">
                <button
                  type="button"
                  onClick={() => toggleSection(group.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[var(--dashboard-muted-surface)]"
                >
                  <GroupIcon className="h-3.5 w-3.5 text-muted" />
                  <span className="flex-1 font-ui text-[11px] font-semibold uppercase tracking-wide text-muted">
                    {group.title}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 text-primary/30 transition-transform duration-300",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>

                <div
                  className={cn(
                    "grid transition-all duration-300 ease-out",
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <ul className="mt-0.5 space-y-0.5 pb-2 pl-1">
                      {group.items.map((item) => {
                        const Icon = getNavIcon(item.icon);
                        const isActive =
                          item.href === "/"
                            ? pathname === "/"
                            : pathname.startsWith(item.href);

                        return (
                          <li key={item.id}>
                            <Link
                              href={item.href}
                              className={cn(
                                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 font-ui",
                                isActive ? "sidebar-nav-active" : "sidebar-nav-item",
                              )}
                            >
                              <Icon className="h-4 w-4 shrink-0 opacity-80" />
                              <span className="truncate">{item.label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-[var(--dashboard-border-subtle)] p-4">
          <p className="font-mono-brand text-[10px] uppercase tracking-[0.16em] text-muted">
            Ideate · Innovate · Impact
          </p>
        </div>
      </aside>
    </div>
  );
}

/** Demo wrapper matching the integrated component export name */
export function Frame760({ items }: { items?: NavItem[] }) {
  const demoItems: NavItem[] = items ?? [];
  return (
    <SidebarProvider>
      <KitsicSidebar items={demoItems} />
    </SidebarProvider>
  );
}

export default KitsicSidebar;
