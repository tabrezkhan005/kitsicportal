import { getSessionUser } from "@kitsic/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getClubWhiteboard } from "@/lib/board-data";
import { ClubWhiteboard } from "@/features/whiteboard/club-whiteboard";

export const metadata = { title: "Whiteboard" };

export default async function WhiteboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const whiteboard = await getClubWhiteboard();

  if (!whiteboard) {
    return (
      <div className="space-y-6">
        <PageHeader title="Club Whiteboard" description="Collaborative planning canvas" />
        <p className="font-body text-sm text-primary/50">
          Whiteboard not initialized. Run the database migration.
        </p>
      </div>
    );
  }

  const scene =
    typeof whiteboard.scene_data === "string"
      ? whiteboard.scene_data
      : JSON.stringify(whiteboard.scene_data ?? {});

  return (
    <div className="space-y-4">
      <PageHeader
        title="Club Whiteboard"
        description="Draw, brainstorm, and plan together — like Excalidraw, shared with everyone"
      />
      <ClubWhiteboard whiteboardId={whiteboard.id} initialScene={scene} />
    </div>
  );
}
