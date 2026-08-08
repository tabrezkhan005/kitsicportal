"use client";

import { useEffect, useRef } from "react";
import { Button } from "@kitsic/ui";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  loading?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
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
      className="fixed left-1/2 top-1/2 z-[60] w-[min(100vw-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-0 shadow-[var(--shadow-elevated)] backdrop:bg-foreground/30"
    >
      <div className="px-6 py-5">
        <h2 className="font-display text-lg font-bold text-primary">{title}</h2>
        <p className="mt-2 font-body text-sm leading-relaxed text-primary/65">{description}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={[
              "rounded-xl",
              variant === "destructive" ? "bg-red-600 text-white hover:bg-red-700" : "",
            ].join(" ")}
          >
            {loading ? "Please wait…" : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
