"use client";

import { useEffect, useRef } from "react";
import { Button } from "@kitsic/ui";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  size?: "default" | "wide";
}

export function Modal({ open, onOpenChange, title, children, size = "default" }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={() => onOpenChange(false)}
      className={[
        "fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-xl)] border border-border bg-surface p-0 shadow-[var(--shadow-elevated)] backdrop:bg-foreground/20",
        size === "wide" ? "max-w-2xl" : "max-w-lg",
      ].join(" ")}
    >
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
        <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="px-6 py-4">{children}</div>
    </dialog>
  );
}
