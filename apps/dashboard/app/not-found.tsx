import { Card, CardContent, CardHeader, CardTitle } from "@kitsic/ui";
import { Button } from "@kitsic/ui";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-4xl font-semibold">404</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">This page doesn&apos;t exist.</p>
          <Button asChild>
            <Link href="/">Go to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
