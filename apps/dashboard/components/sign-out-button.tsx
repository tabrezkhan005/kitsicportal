"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@kitsic/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { signOut } from "@/features/auth/actions";
import { toActionErrorMessage } from "@/lib/action-error";

export function SignOutButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirmSignOut() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await signOut();
        if (result.error) {
          setError(result.error);
          return;
        }
        setOpen(false);
        if (result.redirectTo) {
          router.push(result.redirectTo);
          router.refresh();
        }
      } catch (err) {
        setError(toActionErrorMessage(err, "Could not sign out. Please try again."));
      }
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={() => setOpen(true)}
        disabled={isPending}
        aria-label="Sign out"
        className="rounded-lg text-muted hover:bg-[var(--dashboard-muted-surface)] hover:text-primary"
      >
        <LogOut className="h-4 w-4" />
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          if (!isPending) {
            setOpen(next);
            if (!next) setError(null);
          }
        }}
        title="Sign out?"
        description={
          error ??
          "You will leave the Innovation Club dashboard and need to sign in again to access tasks, events, and learning."
        }
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        variant="destructive"
        loading={isPending}
        onConfirm={handleConfirmSignOut}
      />
    </>
  );
}
