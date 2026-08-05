"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Users,
  CalendarDays,
  FolderKanban,
  Megaphone,
  Loader2,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResults {
  members: Array<{ id: string; full_name: string | null; email: string }>;
  tasks: Array<{ id: string; title: string; status: string }>;
  events: Array<{ id: string; title: string; status: string }>;
  projects: Array<{ id: string; name: string; status: string }>;
  announcements: Array<{ id: string; title: string }>;
}

const NAV_COMMANDS = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Analytics", href: "/analytics", icon: LayoutDashboard },
  { label: "Members", href: "/members", icon: Users },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Events", href: "/events", icon: CalendarDays },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Announcements", href: "/announcements", icon: Megaphone },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (response.ok) {
        setResults(await response.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(null);
    }
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const hasResults = results && (
    results.members.length > 0 ||
    results.tasks.length > 0 ||
    results.events.length > 0 ||
    results.projects.length > 0 ||
    results.announcements.length > 0
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
            className="fixed left-1/2 top-[15%] z-50 w-full max-w-lg -translate-x-1/2 rounded-[var(--radius-xl)] border border-border bg-surface p-2 shadow-[var(--shadow-elevated)]"
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search members, tasks, events..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            <div className="max-h-[400px] overflow-y-auto py-2">
              {query.length >= 2 && hasResults && (
                <>
                  {results!.members.length > 0 && (
                    <ResultSection title="Members">
                      {results!.members.map((m) => (
                        <ResultLink key={m.id} href="/members" icon={Users} label={m.full_name ?? m.email} sub={m.email} onClose={() => onOpenChange(false)} />
                      ))}
                    </ResultSection>
                  )}
                  {results!.tasks.length > 0 && (
                    <ResultSection title="Tasks">
                      {results!.tasks.map((t) => (
                        <ResultLink key={t.id} href="/tasks" icon={CheckSquare} label={t.title} sub={t.status} onClose={() => onOpenChange(false)} />
                      ))}
                    </ResultSection>
                  )}
                  {results!.events.length > 0 && (
                    <ResultSection title="Events">
                      {results!.events.map((e) => (
                        <ResultLink key={e.id} href="/events" icon={CalendarDays} label={e.title} sub={e.status} onClose={() => onOpenChange(false)} />
                      ))}
                    </ResultSection>
                  )}
                  {results!.projects.length > 0 && (
                    <ResultSection title="Projects">
                      {results!.projects.map((p) => (
                        <ResultLink key={p.id} href="/projects" icon={FolderKanban} label={p.name} sub={p.status} onClose={() => onOpenChange(false)} />
                      ))}
                    </ResultSection>
                  )}
                  {results!.announcements.length > 0 && (
                    <ResultSection title="Announcements">
                      {results!.announcements.map((a) => (
                        <ResultLink key={a.id} href="/announcements" icon={Megaphone} label={a.title} onClose={() => onOpenChange(false)} />
                      ))}
                    </ResultSection>
                  )}
                </>
              )}

              {query.length >= 2 && !loading && !hasResults && (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">No results found</p>
              )}

              {query.length < 2 && (
                <>
                  <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Quick navigation</p>
                  {NAV_COMMANDS.map((cmd) => (
                    <a
                      key={cmd.href}
                      href={cmd.href}
                      onClick={() => onOpenChange(false)}
                      className="flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm transition-colors hover:bg-background"
                    >
                      <cmd.icon className="h-4 w-4 text-muted-foreground" />
                      {cmd.label}
                    </a>
                  ))}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ResultSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function ResultLink({
  href,
  icon: Icon,
  label,
  sub,
  onClose,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub?: string;
  onClose: () => void;
}) {
  return (
    <a
      href={href}
      onClick={onClose}
      className="flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm transition-colors hover:bg-background"
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="truncate font-medium">{label}</p>
        {sub && <p className="truncate text-xs capitalize text-muted-foreground">{sub}</p>}
      </div>
    </a>
  );
}
