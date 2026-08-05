"use client";

import { Button } from "@kitsic/ui";
import { Plus } from "lucide-react";

interface PageCreateButtonProps {
  label: string;
  onClick: () => void;
}

export function PageCreateButton({ label, onClick }: PageCreateButtonProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      className="font-ui shrink-0 rounded-xl bg-primary px-4 text-white hover:bg-secondary"
    >
      <Plus className="h-4 w-4" />
      {label}
    </Button>
  );
}
