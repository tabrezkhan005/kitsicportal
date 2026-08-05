"use client";

import { useState } from "react";
import { Button } from "@kitsic/ui";
import { Plus } from "lucide-react";
import { Modal } from "@/components/modal";
import { CreateForm } from "@/components/create-form";
import { createTask } from "@/lib/actions";

interface TasksPageClientProps {
  canCreate: boolean;
}

export function TasksPageClient({ canCreate }: TasksPageClientProps) {
  const [open, setOpen] = useState(false);
  if (!canCreate) return null;

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        New task
      </Button>
      <Modal open={open} onOpenChange={setOpen} title="Create task">
        <CreateForm
          action={createTask}
          onSuccess={() => setOpen(false)}
          fields={[
            { name: "title", label: "Title", required: true },
            { name: "description", label: "Description", type: "textarea" },
            { name: "priority", label: "Priority", options: [
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
            ]},
            { name: "category", label: "Category" },
            { name: "due_date", label: "Due date", type: "datetime-local" },
          ]}
        />
      </Modal>
    </>
  );
}
