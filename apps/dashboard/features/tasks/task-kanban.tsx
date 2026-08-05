"use client";

import { cn } from "@kitsic/utils";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@kitsic/ui";
import { ChevronRight, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteTask, updateTaskStatus } from "@/lib/actions";

const COLUMNS = [
  { id: "todo", label: "To Do", color: "border-muted" },
  { id: "in_progress", label: "In Progress", color: "border-accent" },
  { id: "under_review", label: "Under Review", color: "border-primary" },
  { id: "completed", label: "Completed", color: "border-success" },
] as const;

const NEXT_STATUS: Record<string, string> = {
  todo: "in_progress",
  in_progress: "under_review",
  under_review: "completed",
  completed: "todo",
};

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  progress: number;
  category: string | null;
  assignee: { full_name: string | null } | null;
}

interface TaskKanbanProps {
  tasks: Task[];
  canManage?: boolean;
  canDelete?: boolean;
}

export function TaskKanban({ tasks, canManage = false, canDelete = false }: TaskKanbanProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(taskId: string, status: string) {
    startTransition(async () => {
      await updateTaskStatus(taskId, status);
      router.refresh();
    });
  }

  function handleDelete(taskId: string) {
    startTransition(async () => {
      await deleteTask(taskId);
      router.refresh();
    });
  }

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-4", isPending && "opacity-70")}>
      {COLUMNS.map((column) => {
        const columnTasks = tasks.filter((t) => t.status === column.id);
        return (
          <div key={column.id} className="space-y-3">
            <div className={cn("flex items-center gap-2 border-l-4 pl-3", column.color)}>
              <h3 className="text-sm font-semibold text-primary">{column.label}</h3>
              <Badge variant="muted">{columnTasks.length}</Badge>
            </div>
            <div className="space-y-3">
              {columnTasks.map((task) => (
                <Card key={task.id} className="border-border/80 transition-shadow hover:shadow-[var(--shadow-elevated)]">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium leading-snug text-primary">{task.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4 pt-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={task.priority === "high" ? "accent" : "muted"}>{task.priority}</Badge>
                      {task.category && <span className="text-xs text-muted-foreground">{task.category}</span>}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{task.progress}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-border">
                        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${task.progress}%` }} />
                      </div>
                    </div>
                    {task.assignee?.full_name && (
                      <p className="text-xs text-muted-foreground">{task.assignee.full_name}</p>
                    )}
                    {canManage && (
                      <div className="flex items-center gap-1 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => handleStatusChange(task.id, NEXT_STATUS[task.status] ?? "in_progress")}
                        >
                          <ChevronRight className="mr-1 h-3 w-3" />
                          Advance
                        </Button>
                        {canDelete && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-danger" onClick={() => handleDelete(task.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {columnTasks.length === 0 && (
                <p className="rounded-[var(--radius-md)] border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
                  No tasks
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
