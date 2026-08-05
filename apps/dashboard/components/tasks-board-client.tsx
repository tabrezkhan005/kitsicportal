"use client";

import { TrelloBoard } from "@/features/tasks/trello-board";
import type { ClubMemberOption, TaskBoardFull } from "@/lib/board-data";

interface TasksBoardClientProps {
  board: TaskBoardFull;
  members: ClubMemberOption[];
}

export function TasksBoardClient({ board, members }: TasksBoardClientProps) {
  return <TrelloBoard board={board} members={members} />;
}
