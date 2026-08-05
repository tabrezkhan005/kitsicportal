import { Suspense } from "react";
import { Skeleton } from "@kitsic/ui";
import AuthSectionOne from "@/components/ui/auth-section-1";

export const metadata = {
  title: "Sign In",
};

function AuthSkeleton() {
  return (
    <div className="flex h-screen items-center justify-center overflow-hidden bg-[#fefefe] p-6">
      <Skeleton className="h-full w-full max-w-5xl rounded-md" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <AuthSectionOne />
    </Suspense>
  );
}
