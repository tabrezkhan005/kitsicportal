import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="dashboard-card flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--dashboard-muted-surface)]">
        <Icon className="h-5 w-5 text-muted" />
      </div>
      <h3 className="font-display text-lg font-bold tracking-tight text-primary">{title}</h3>
      <p className="mt-2 max-w-sm font-body text-sm text-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
