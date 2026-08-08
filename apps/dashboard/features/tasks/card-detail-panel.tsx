"use client";

import { useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage, Button } from "@kitsic/ui";
import {
  AlignLeft,
  Calendar,
  CheckSquare,
  MessageSquare,
  Paperclip,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { BoardCard, BoardLabel, ClubMemberOption } from "@/lib/board-data";
import {
  addAttachmentFromFile,
  addCardAttachment,
  addCardComment,
  addChecklistItem,
  createChecklist,
  createLabel,
  deleteAttachment,
  deleteCard,
  deleteCardComment,
  deleteChecklistItem,
  toggleCardLabel,
  toggleCardMember,
  toggleChecklistItem,
  updateCard,
} from "@/lib/board-actions";

const LABEL_COLORS = [
  "#0079bf",
  "#c377e0",
  "#ff9f1a",
  "#61bd4f",
  "#eb5a46",
  "#00c2e0",
  "#344563",
  "#f2d600",
];

interface CardDetailPanelProps {
  card: BoardCard;
  boardId: string;
  boardLabels: BoardLabel[];
  members: ClubMemberOption[];
  currentUserId: string;
  onClose: () => void;
  onUpdate: () => void;
}

type ConfirmState =
  | { type: "delete-card" }
  | { type: "delete-comment"; id: string }
  | { type: "delete-attachment"; id: string }
  | { type: "delete-checklist-item"; id: string }
  | null;

export function CardDetailPanel({
  card,
  boardId,
  boardLabels,
  members,
  currentUserId,
  onClose,
  onUpdate,
}: CardDetailPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [dueDate, setDueDate] = useState(
    card.due_date ? new Date(card.due_date).toISOString().slice(0, 16) : "",
  );
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [newItemText, setNewItemText] = useState<Record<string, string>>({});
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [commentText, setCommentText] = useState("");
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);
  const [showLabelForm, setShowLabelForm] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  function run(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
      onUpdate();
    });
  }

  function handleConfirm() {
    if (!confirm) return;

    if (confirm.type === "delete-card") {
      run(async () => {
        await deleteCard(card.id);
        onClose();
      });
    } else if (confirm.type === "delete-comment") {
      run(() => deleteCardComment(confirm.id));
    } else if (confirm.type === "delete-attachment") {
      run(() => deleteAttachment(confirm.id));
    } else if (confirm.type === "delete-checklist-item") {
      run(() => deleteChecklistItem(confirm.id));
    }

    setConfirm(null);
  }

  const confirmCopy =
    confirm?.type === "delete-card"
      ? {
          title: "Delete this card?",
          description: "This card and all checklists, comments, and attachments will be removed from the board.",
          confirmLabel: "Delete card",
          variant: "destructive" as const,
        }
      : confirm?.type === "delete-comment"
        ? {
            title: "Delete comment?",
            description: "This comment will be permanently removed from the activity feed.",
            confirmLabel: "Delete comment",
            variant: "destructive" as const,
          }
        : confirm?.type === "delete-attachment"
          ? {
              title: "Remove attachment?",
              description: "The file or link will be removed from this card.",
              confirmLabel: "Remove",
              variant: "destructive" as const,
            }
          : confirm?.type === "delete-checklist-item"
            ? {
                title: "Delete checklist item?",
                description: "This checkpoint will be removed from the checklist.",
                confirmLabel: "Delete item",
                variant: "destructive" as const,
              }
            : null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
        onClick={onClose}
      >
        <div
          className="dashboard-scroll flex max-h-[96dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-[#f1f2f4] shadow-2xl sm:max-h-[92dvh] sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-primary/10 bg-white px-4 py-4 sm:px-6">
            <div className="min-w-0 flex-1">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => title !== card.title && run(() => updateCard(card.id, { title }))}
                className="font-display w-full bg-transparent text-lg font-bold tracking-tight text-primary outline-none sm:text-xl"
              />
              {card.labels.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {card.labels.map((label) => (
                    <span
                      key={label.id}
                      className="rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm"
                      style={{ backgroundColor: label.color }}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-primary/50 transition-colors hover:bg-primary/5"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="dashboard-scroll space-y-5 overflow-y-auto p-4 sm:p-6">
              <div className="flex flex-wrap gap-2">
                <ActionChip icon={Tag} label="Labels" />
                <ActionChip icon={Calendar} label="Due date" />
                <ActionChip icon={CheckSquare} label="Checklist" />
              </div>

              <section>
                <SectionTitle icon={Tag}>Labels</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {boardLabels.map((label) => {
                    const active = card.labels.some((l) => l.id === label.id);
                    return (
                      <button
                        key={label.id}
                        type="button"
                        disabled={isPending}
                        onClick={() => run(() => toggleCardLabel(card.id, label.id, !active))}
                        className={[
                          "rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-all",
                          active ? "ring-2 ring-primary/30 ring-offset-1" : "opacity-45 hover:opacity-80",
                        ].join(" ")}
                        style={{ backgroundColor: label.color }}
                      >
                        {label.name}
                      </button>
                    );
                  })}
                </div>
                {showLabelForm ? (
                  <div className="mt-3 rounded-xl border border-primary/10 bg-white p-3">
                    <input
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      placeholder="Label name"
                      className="auth-input-glow mb-2 w-full rounded-lg border border-primary/12 bg-white px-3 py-2 text-sm outline-none"
                    />
                    <div className="mb-3 flex flex-wrap gap-2">
                      {LABEL_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewLabelColor(color)}
                          className={[
                            "h-8 w-8 rounded-lg transition-transform",
                            newLabelColor === color ? "scale-110 ring-2 ring-primary/40 ring-offset-1" : "",
                          ].join(" ")}
                          style={{ backgroundColor: color }}
                          aria-label={`Color ${color}`}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={!newLabelName.trim() || isPending}
                        onClick={() =>
                          run(async () => {
                            await createLabel(boardId, newLabelName.trim(), newLabelColor);
                            setNewLabelName("");
                            setShowLabelForm(false);
                          })
                        }
                      >
                        Create label
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowLabelForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowLabelForm(true)}
                    className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-primary/55 hover:text-primary font-ui"
                  >
                    <Plus className="h-4 w-4" />
                    Create a new label
                  </button>
                )}
              </section>

              <section>
                <SectionTitle icon={Calendar}>Due date</SectionTitle>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  onBlur={() =>
                    run(() =>
                      updateCard(card.id, {
                        due_date: dueDate ? new Date(dueDate).toISOString() : null,
                      }),
                    )
                  }
                  className="auth-input-glow rounded-lg border border-primary/12 bg-white px-3 py-2 text-sm outline-none font-body"
                />
              </section>

              <section>
                <SectionTitle>Team members</SectionTitle>
                <p className="mb-2 font-body text-xs text-primary/50">
                  Add club members to form a team on this task. They will be notified when assigned.
                </p>
                <div className="flex flex-wrap gap-2">
                  {members.map((member) => {
                    const active = card.members.some((m) => m.user_id === member.id);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        disabled={isPending}
                        onClick={() => run(() => toggleCardMember(card.id, member.id, !active))}
                        className={[
                          "flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs transition-all font-ui",
                          active
                            ? "border-primary bg-primary text-white shadow-sm"
                            : "border-primary/10 bg-white text-primary/65 hover:border-primary/25",
                        ].join(" ")}
                      >
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={member.avatar_url ?? undefined} />
                          <AvatarFallback name={member.full_name} className="text-[8px]" />
                        </Avatar>
                        {member.full_name ?? member.email}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <SectionTitle icon={AlignLeft}>Description</SectionTitle>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => run(() => updateCard(card.id, { description: description || null }))}
                  placeholder="Add a more detailed description…"
                  rows={5}
                  className="auth-input-glow w-full resize-none rounded-xl border border-primary/12 bg-white p-3 text-sm outline-none font-body"
                />
              </section>

              <section>
                <SectionTitle icon={CheckSquare}>Checklists</SectionTitle>
                {card.checklists.map((checklist) => {
                  const done = checklist.items.filter((i) => i.is_completed).length;
                  const total = checklist.items.length;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

                  return (
                    <div key={checklist.id} className="mb-4 rounded-xl border border-primary/8 bg-white p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="font-ui text-sm font-semibold text-primary">{checklist.title}</p>
                        <span className="text-xs text-primary/45">{done}/{total}</span>
                      </div>
                      {total > 0 && (
                        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-primary/8">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                      <div className="space-y-1.5">
                        {checklist.items.map((item) => (
                          <label key={item.id} className="group flex items-center gap-2 text-sm font-body">
                            <input
                              type="checkbox"
                              checked={item.is_completed}
                              disabled={isPending}
                              onChange={(e) => run(() => toggleChecklistItem(item.id, e.target.checked))}
                              className="rounded border-primary/20"
                            />
                            <span className={item.is_completed ? "line-through text-primary/45" : "text-primary"}>
                              {item.title}
                            </span>
                            <button
                              type="button"
                              className="ml-auto opacity-0 transition-opacity group-hover:opacity-100 text-primary/30 hover:text-red-500"
                              onClick={() => setConfirm({ type: "delete-checklist-item", id: item.id })}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </label>
                        ))}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <input
                          value={newItemText[checklist.id] ?? ""}
                          onChange={(e) =>
                            setNewItemText((prev) => ({ ...prev, [checklist.id]: e.target.value }))
                          }
                          placeholder="Add a checkpoint…"
                          className="flex-1 rounded-lg border border-primary/10 px-2 py-1.5 text-sm outline-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newItemText[checklist.id]?.trim()) {
                              run(async () => {
                                await addChecklistItem(checklist.id, newItemText[checklist.id].trim());
                                setNewItemText((prev) => ({ ...prev, [checklist.id]: "" }));
                              });
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const text = newItemText[checklist.id]?.trim();
                            if (!text) return;
                            run(async () => {
                              await addChecklistItem(checklist.id, text);
                              setNewItemText((prev) => ({ ...prev, [checklist.id]: "" }));
                            });
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                <div className="flex gap-2">
                  <input
                    value={newChecklistTitle}
                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                    placeholder="Checklist title…"
                    className="flex-1 rounded-xl border border-primary/10 bg-white px-3 py-2 text-sm outline-none"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!newChecklistTitle.trim()) return;
                      run(async () => {
                        await createChecklist(card.id, newChecklistTitle.trim());
                        setNewChecklistTitle("");
                      });
                    }}
                  >
                    Add checklist
                  </Button>
                </div>
              </section>

              <section>
                <SectionTitle icon={Paperclip}>Attachments</SectionTitle>
                <div className="space-y-2">
                  {card.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between rounded-xl border border-primary/10 bg-white px-3 py-2"
                    >
                      <a
                        href={att.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-sm text-accent hover:underline font-ui"
                      >
                        {att.file_name}
                      </a>
                      <button
                        type="button"
                        onClick={() => setConfirm({ type: "delete-attachment", id: att.id })}
                        className="text-primary/30 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 space-y-2">
                  <input
                    type="file"
                    className="text-sm font-body"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const fd = new FormData();
                      fd.set("file", file);
                      run(() => addAttachmentFromFile(card.id, fd));
                      e.target.value = "";
                    }}
                  />
                  <div className="flex gap-2">
                    <input
                      value={attachmentUrl}
                      onChange={(e) => setAttachmentUrl(e.target.value)}
                      placeholder="Or paste a link…"
                      className="flex-1 rounded-xl border border-primary/10 bg-white px-3 py-2 text-sm outline-none"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (!attachmentUrl.trim()) return;
                        run(async () => {
                          await addCardAttachment(card.id, "Link", attachmentUrl.trim());
                          setAttachmentUrl("");
                        });
                      }}
                    >
                      Add link
                    </Button>
                  </div>
                </div>
              </section>
            </div>

            <aside className="dashboard-scroll flex min-h-[14rem] flex-col border-t border-primary/10 bg-white/70 lg:min-h-0 lg:border-l lg:border-t-0">
              <div className="border-b border-primary/8 px-4 py-3 sm:px-5">
                <SectionTitle icon={MessageSquare}>Comments & activity</SectionTitle>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-5">
                {card.comments.length === 0 ? (
                  <p className="font-body text-sm text-primary/45">No comments yet. Start the conversation.</p>
                ) : (
                  card.comments.map((comment) => (
                    <div key={comment.id} className="group flex gap-2.5">
                      <Avatar className="mt-0.5 h-8 w-8 shrink-0">
                        <AvatarImage src={comment.avatar_url ?? undefined} />
                        <AvatarFallback name={comment.full_name} className="text-[10px]" />
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="rounded-xl bg-[#f1f2f4] px-3 py-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-ui text-xs font-bold text-primary">
                              {comment.full_name ?? "Member"}
                            </p>
                            {comment.user_id === currentUserId && (
                              <button
                                type="button"
                                onClick={() => setConfirm({ type: "delete-comment", id: comment.id })}
                                className="opacity-0 transition-opacity group-hover:opacity-100 text-primary/30 hover:text-red-500"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="mt-1 whitespace-pre-wrap font-body text-sm text-primary/80">
                            {comment.body}
                          </p>
                        </div>
                        <p className="mt-1 font-body text-[11px] text-primary/40">
                          {new Date(comment.created_at).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-primary/8 p-4 sm:p-5">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment…"
                  rows={3}
                  className="auth-input-glow w-full resize-none rounded-xl border border-primary/12 bg-white p-3 text-sm outline-none font-body"
                />
                <Button
                  className="mt-2 w-full rounded-xl"
                  disabled={!commentText.trim() || isPending}
                  onClick={() =>
                    run(async () => {
                      await addCardComment(card.id, commentText.trim());
                      setCommentText("");
                    })
                  }
                >
                  Save comment
                </Button>
              </div>
            </aside>
          </div>

          <div className="border-t border-primary/10 bg-white px-4 py-3 sm:px-6">
            <Button
              variant="ghost"
              className="w-full rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={isPending}
              onClick={() => setConfirm({ type: "delete-card" })}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete card
            </Button>
          </div>
        </div>
      </div>

      {confirmCopy && (
        <ConfirmDialog
          open={!!confirm}
          onOpenChange={(open) => !open && setConfirm(null)}
          title={confirmCopy.title}
          description={confirmCopy.description}
          confirmLabel={confirmCopy.confirmLabel}
          variant={confirmCopy.variant}
          loading={isPending}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}

function SectionTitle({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <h4 className="mb-2 flex items-center gap-1.5 font-ui text-xs font-semibold uppercase tracking-wide text-primary/50">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </h4>
  );
}

function ActionChip({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/6 px-2.5 py-1.5 text-[11px] font-semibold text-primary/55 font-ui">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
