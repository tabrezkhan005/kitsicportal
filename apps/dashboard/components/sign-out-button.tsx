"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@kitsic/ui";
import { signOut } from "@/features/auth/actions";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      const result = await signOut();
      if (result.redirectTo) {
        router.push(result.redirectTo);
        router.refresh();
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      onClick={handleSignOut}
      disabled={isPending}
      aria-label="Sign out"
    >
      <LogOut className="h-4 w-4" />
    </Button>
  );
}
