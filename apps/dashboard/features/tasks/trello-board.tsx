"use client";

import { memo, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, AvatarFallback, AvatarImage, Button } from "@kitsic/ui";
import {
  Calendar,
  CheckSquare,
  GripVertical,
  LayoutGrid,
  Paperclip,
  Plus,
  X,
} from "lucide-react";
import { cn } from "@kitsic/utils";
import type { BoardCard, BoardList, ClubMemberOption, TaskBoardFull } from "@/lib/board-data";
import { CardDetailPanel } from "@/features/tasks/card-detail-panel";
import { createCard, createList, moveCard } from "@/lib/board-actions";

interface TrelloBoardProps {
  board: TaskBoardFull;
  members: ClubMemberOption[];
}

const LIST_ACCENTS: Record<string, string> = {
  "to do": "border-t-slate-400",
  "in progress": "border-t-accent",
  "under review": "border-t-secondary",
  done: "border-t-emerald-500",
};

const SortableCard = memo(function SortableCard({
  card,
  onOpen,
}: {
  card: BoardCard;
  onOpen: (card: BoardCard) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: "card", card },
  });

  const checklistTotal = card.checklists.reduce((sum, cl) => sum + cl.items.length, 0);
  const checklistDone = card.checklists.reduce(
    (sum, cl) => sum + cl.items.filter((i) => i.is_completed).length,
    0,
  );

  const dueSoon =
    card.due_date &&
    new Date(card.due_date).getTime() - Date.now() < 86400000 * 2;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? "transform 200ms cubic-bezier(0.25, 1.1, 0.4, 1)",
      }}
      className={cn(
        "group touch-manipulation cursor-pointer rounded-xl border border-primary/8 bg-white p-3 shadow-[0_1px_3px_rgba(3,53,101,0.06)]",
        "transition-shadow duration-200 hover:border-accent/25 hover:shadow-[0_8px_20px_rgba(3,53,101,0.1)]",
        isDragging && "scale-[1.02] opacity-50 shadow-lg",
      )}
      onClick={() => onOpen(card)}
    >
      {card.labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {card.labels.map((label) => (
            <span
              key={label.id}
              className="h-2 min-w-[2.5rem] rounded-full"
              style={{ backgroundColor: label.color }}
              title={label.name}
            />
          ))}
        </div>
      )}
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-grab touch-none opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-primary/30" />
        </button>
        <p className="flex-1 text-sm font-semibold leading-snug text-primary font-ui">{card.title}</p>
      </div>
      {(card.due_date || checklistTotal > 0 || card.attachments.length > 0 || card.members.length > 0) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {card.due_date && (
            <span
              className={cn(
                "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                dueSoon ? "bg-red-50 text-red-600" : "bg-primary/5 text-primary/55",
              )}
            >
              <Calendar className="h-3 w-3" />
              {new Date(card.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
          )}
          {checklistTotal > 0 && (
            <span
              className={cn(
                "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                checklistDone === checklistTotal ? "bg-emerald-50 text-emerald-700" : "bg-primary/5 text-primary/55",
              )}
            >
              <CheckSquare className="h-3 w-3" />
              {checklistDone}/{checklistTotal}
            </span>
          )}
          {card.attachments.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-primary/45">
              <Paperclip className="h-3 w-3" />
              {card.attachments.length}
            </span>
          )}
          {card.members.length > 0 && (
            <div className="ml-auto flex -space-x-1.5">
              {card.members.slice(0, 3).map((m) => (
                <Avatar key={m.user_id} className="h-6 w-6 border-2 border-white">
                  <AvatarImage src={m.avatar_url ?? undefined} />
                  <AvatarFallback name={m.full_name} className="text-[8px]" />
                </Avatar>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

function ListColumn({
  list,
  boardId,
  onOpenCard,
  onAddCard,
}: {
  list: BoardList;
  boardId: string;
  onOpenCard: (card: BoardCard) => void;
  onAddCard: (listId: string, title: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: list.id, data: { type: "list", list } });
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  const accent = LIST_ACCENTS[list.name.toLowerCase()] ?? "border-t-primary/30";

  function submitCard() {
    if (!title.trim()) return;
    onAddCard(list.id, title.trim());
    setTitle("");
    setAdding(false);
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex max-h-[calc(100vh-11rem)] w-[17.5rem] shrink-0 flex-col rounded-2xl border border-primary/8 border-t-4 bg-white/80 p-2.5 backdrop-blur-sm",
        accent,
        isOver && "ring-2 ring-accent/40 ring-offset-2",
      )}
    >
      <div className="mb-2 flex items-center justify-between px-1.5 pt-0.5">
        <h3 className="font-ui text-sm font-bold text-primary">{list.name}</h3>
        <span className="rounded-full bg-primary/8 px-2 py-0.5 text-[11px] font-semibold text-primary/50">
          {list.cards.length}
        </span>
      </div>

      <SortableContext items={list.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="dashboard-scroll min-h-[3rem] flex-1 space-y-2 overflow-y-auto px-0.5 pb-1">
          {list.cards.map((card) => (
            <SortableCard key={card.id} card={card} onOpen={onOpenCard} />
          ))}
        </div>
      </SortableContext>

      {adding ? (
        <div className="mt-2 space-y-2 px-0.5">
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a title…"
            className="auth-input-glow w-full resize-none rounded-xl border border-primary/12 bg-white p-2.5 text-sm outline-none font-body"
            rows={2}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submitCard();
              }
            }}
          />
          <div className="flex gap-2">
            <Button size="sm" className="rounded-lg" onClick={submitCard}>
              Add card
            </Button>
            <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => setAdding(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-2 flex w-full items-center gap-2 rounded-xl px-2 py-2.5 text-sm text-primary/50 transition-colors hover:bg-primary/5 hover:text-primary font-ui"
        >
          <Plus className="h-4 w-4" />
          Add a card
        </button>
      )}
    </div>
  );
}

export function TrelloBoard({ board, members }: TrelloBoardProps) {
  const router = useRouter();
  const [lists, setLists] = useState(board.lists);
  const [activeCard, setActiveCard] = useState<BoardCard | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [showNewList, setShowNewList] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setLists(board.lists);
  }, [board.lists]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const allCards = useMemo(() => lists.flatMap((l) => l.cards), [lists]);
  const selectedCard = selectedCardId
    ? allCards.find((c) => c.id === selectedCardId) ?? null
    : null;

  const totalCards = allCards.length;

  const applyMove = useCallback((cardId: string, targetListId: string, targetIndex: number) => {
    setLists((prev) => {
      const next = prev.map((list) => ({ ...list, cards: [...list.cards] }));
      let movedCard: BoardCard | undefined;

      for (const list of next) {
        const idx = list.cards.findIndex((c) => c.id === cardId);
        if (idx >= 0) {
          [movedCard] = list.cards.splice(idx, 1);
          break;
        }
      }
      if (!movedCard) return prev;

      movedCard = { ...movedCard, list_id: targetListId };
      const targetList = next.find((l) => l.id === targetListId);
      if (!targetList) return prev;

      targetList.cards.splice(targetIndex, 0, movedCard);
      targetList.cards.forEach((c, i) => {
        c.position = i;
      });
      return next;
    });
  }, []);

  function handleDragStart(event: DragStartEvent) {
    const card = allCards.find((c) => c.id === event.active.id);
    if (card) setActiveCard(card);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const cardId = active.id as string;
    const sourceList = lists.find((l) => l.cards.some((c) => c.id === cardId));
    if (!sourceList) return;

    let targetListId = sourceList.id;
    let targetIndex = sourceList.cards.findIndex((c) => c.id === cardId);

    if (over.data.current?.type === "list") {
      targetListId = over.id as string;
      const targetList = lists.find((l) => l.id === targetListId);
      targetIndex = targetList?.cards.length ?? 0;
    } else {
      const overCard = allCards.find((c) => c.id === over.id);
      if (!overCard) return;
      targetListId = overCard.list_id;
      const targetList = lists.find((l) => l.id === targetListId);
      targetIndex = targetList?.cards.findIndex((c) => c.id === overCard.id) ?? 0;
    }

    if (sourceList.id === targetListId) {
      const oldIndex = sourceList.cards.findIndex((c) => c.id === cardId);
      if (oldIndex === targetIndex) return;
      setLists((prev) =>
        prev.map((list) =>
          list.id === sourceList.id
            ? { ...list, cards: arrayMove(list.cards, oldIndex, targetIndex) }
            : list,
        ),
      );
    } else {
      applyMove(cardId, targetListId, targetIndex);
    }

    startTransition(async () => {
      await moveCard(cardId, targetListId, targetIndex);
    });
  }

  function handleAddCard(listId: string, title: string) {
    const tempId = `temp-${Date.now()}`;
    const optimistic: BoardCard = {
      id: tempId,
      list_id: listId,
      board_id: board.id,
      title,
      description: null,
      position: lists.find((l) => l.id === listId)?.cards.length ?? 0,
      due_date: null,
      cover_color: null,
      labels: [],
      members: [],
      checklists: [],
      attachments: [],
    };

    setLists((prev) =>
      prev.map((list) =>
        list.id === listId ? { ...list, cards: [...list.cards, optimistic] } : list,
      ),
    );

    startTransition(async () => {
      const result = await createCard(listId, board.id, title);
      if (result.success && result.data?.id) {
        setLists((prev) =>
          prev.map((list) => ({
            ...list,
            cards: list.cards.map((c) =>
              c.id === tempId ? { ...c, id: result.data!.id as string } : c,
            ),
          })),
        );
      }
    });
  }

  function handleAddList() {
    if (!newListName.trim()) return;
    startTransition(async () => {
      await createList(board.id, newListName.trim());
      setNewListName("");
      setShowNewList(false);
      router.refresh();
    });
  }

  function handlePanelUpdate() {
    router.refresh();
  }

  return (
    <div className="relative">
      {/* Board toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-white/90 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/8">
            <LayoutGrid className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-ui text-sm font-bold text-primary">{board.name}</p>
            <p className="font-body text-xs text-primary/45">{totalCards} cards · drag to reorder</p>
          </div>
        </div>
      </div>

      <div
        className="relative min-h-[calc(100vh-13rem)] overflow-hidden rounded-2xl p-4"
        style={{
          background: `linear-gradient(135deg, ${board.background_color} 0%, #044a8a 100%)`,
        }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 overflow-x-auto pb-2">
            {lists.map((list) => (
              <ListColumn
                key={list.id}
                list={list}
                boardId={board.id}
                onOpenCard={(card) => setSelectedCardId(card.id)}
                onAddCard={handleAddCard}
              />
            ))}

            {showNewList ? (
              <div className="w-[17.5rem] shrink-0 rounded-2xl bg-white/90 p-3 backdrop-blur-sm">
                <input
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="List name…"
                  className="auth-input-glow mb-2 w-full rounded-xl border border-primary/12 bg-white px-3 py-2 text-sm outline-none"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleAddList()}
                />
                <div className="flex gap-2">
                  <Button size="sm" className="rounded-lg" onClick={handleAddList}>
                    Add list
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowNewList(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowNewList(true)}
                className="flex h-fit w-[17.5rem] shrink-0 items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20 font-ui"
              >
                <Plus className="h-4 w-4" />
                Add another list
              </button>
            )}
          </div>

          <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.25, 1.1, 0.4, 1)" }}>
            {activeCard ? (
              <div className="w-[17.5rem] rotate-2 rounded-xl border border-accent/30 bg-white p-3 shadow-2xl">
                <p className="text-sm font-semibold text-primary font-ui">{activeCard.title}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {selectedCard && (
        <CardDetailPanel
          card={selectedCard}
          boardLabels={board.labels}
          members={members}
          onClose={() => setSelectedCardId(null)}
          onUpdate={handlePanelUpdate}
        />
      )}
    </div>
  );
}
