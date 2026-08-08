"use client";

import { TrelloBoard } from "@/features/tasks/trello-board";
import type { ClubMemberOption, TaskBoardFull } from "@/lib/board-data";

interface TasksBoardClientProps {
  board: TaskBoardFull;
  members: ClubMemberOption[];
  currentUserId: string;
}

export function TasksBoardClient({ board, members, currentUserId }: TasksBoardClientProps) {
  return <TrelloBoard board={board} members={members} currentUserId={currentUserId} />;
}
