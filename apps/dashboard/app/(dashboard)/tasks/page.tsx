import { getSessionUser } from "@kitsic/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { TasksBoardClient } from "@/components/tasks-board-client";
import {
  getClubMembersForBoard,
  getTaskBoardFull,
  getTaskBoards,
} from "@/lib/board-data";

export const metadata = { title: "Tasks" };

export default async function TasksPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [boards, board, members] = await Promise.all([
    getTaskBoards(),
    getTaskBoardFull(),
    getClubMembersForBoard(),
  ]);

  if (!board) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Club Boards"
          description="Shared Trello-style task boards for the whole club"
        />
        <p className="font-body text-sm text-primary/50">
          No board found. Run the database migration to set up task boards.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <PageHeader
        title="Tasks"
        description={
          boards.length > 1
            ? `${boards.length} shared boards · all members can edit`
            : "Shared club board · drag cards, add labels, checklists & members"
        }
      />
      <TasksBoardClient board={board} members={members} />
    </div>
  );
}
