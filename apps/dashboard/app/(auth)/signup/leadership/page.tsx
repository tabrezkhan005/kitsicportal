import { Suspense } from "react";
import { Skeleton } from "@kitsic/ui";
import { LeadershipSignupForm } from "@/components/ui/leadership-signup-form";

export const metadata = { title: "Leadership signup" };

function LeadershipSignupSkeleton() {
  return (
    <div className="flex h-screen items-center justify-center overflow-hidden bg-[#fefefe] p-6">
      <Skeleton className="h-full w-full max-w-5xl rounded-md" />
    </div>
  );
}

export default function LeadershipSignupPage() {
  return (
    <Suspense fallback={<LeadershipSignupSkeleton />}>
      <LeadershipSignupForm />
    </Suspense>
  );
}
