"use client";

import { useEffect, useState } from "react";
import { Search, Bell } from "lucide-react";
import { Button } from "@kitsic/ui";
import type { SessionUser } from "@kitsic/types";
import { UserAvatar } from "@/components/user-avatar";
import { SignOutButton } from "@/components/sign-out-button";
import { CommandPalette } from "@/components/command-palette";

interface AppHeaderProps {
  user: SessionUser;
}

export function AppHeader({ user }: AppHeaderProps) {
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const primaryRole = user.roles[0]?.replace(/_/g, " ") ?? "member";

  return (
    <>
      <header className="dashboard-shell-header flex h-[4.5rem] shrink-0 items-center justify-between px-5 sm:px-6">
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="dashboard-input-surface flex h-10 w-full max-w-md items-center gap-2.5 rounded-lg px-3.5 text-sm text-muted transition-colors hover:border-[#c8d4e0] font-body"
        >
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <span>Search tasks, events, members…</span>
          <kbd className="ml-auto hidden rounded border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-1.5 py-0.5 text-[10px] font-mono-brand text-muted sm:inline">
            ⌘K
          </kbd>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button variant="ghost" size="icon" aria-label="Notifications" asChild className="rounded-lg text-muted hover:bg-[var(--dashboard-muted-surface)] hover:text-primary">
            <a href="/notifications"><Bell className="h-4 w-4" /></a>
          </Button>

          <div className="ml-1 flex items-center gap-3 border-l border-[var(--dashboard-border-subtle)] pl-3 sm:ml-2 sm:pl-4">
            <a href="/profile" className="flex items-center gap-2.5 transition-opacity hover:opacity-85 sm:gap-3">
              <UserAvatar
                name={user.fullName}
                email={user.email}
                avatarUrl={user.avatarUrl}
                avatarColor={user.avatarColor}
                size="md"
              />
              <div className="hidden sm:block">
                <p className="font-ui text-sm font-semibold text-primary">{user.fullName ?? "Member"}</p>
                <p className="font-body text-xs capitalize text-muted">
                  {user.memberId ? `${user.memberId} · ` : ""}{primaryRole}
                </p>
              </div>
            </a>
            <SignOutButton />
          </div>
        </div>
      </header>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  );
}
