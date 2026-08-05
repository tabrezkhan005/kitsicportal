import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@kitsic/ui";

export function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md text-center">
        <CardHeader className="items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10">
            <ShieldX className="h-6 w-6 text-danger" />
          </div>
          <CardTitle>Access denied</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You don&apos;t have permission to view this page. Contact your club president if you believe this is an error.
          </p>
          <Button asChild variant="outline">
            <Link href="/">Back to overview</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
