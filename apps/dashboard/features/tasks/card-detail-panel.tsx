"use client";

import { useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage, Button } from "@kitsic/ui";
import {
  Calendar,
  CheckSquare,
  Paperclip,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { BoardCard, BoardLabel, ClubMemberOption } from "@/lib/board-data";
import {
  addAttachmentFromFile,
  addCardAttachment,
  addChecklistItem,
  createChecklist,
  deleteAttachment,
  deleteCard,
  deleteChecklistItem,
  toggleCardLabel,
  toggleCardMember,
  toggleChecklistItem,
  updateCard,
} from "@/lib/board-actions";

interface CardDetailPanelProps {
  card: BoardCard;
  boardLabels: BoardLabel[];
  members: ClubMemberOption[];
  onClose: () => void;
  onUpdate: () => void;
}

export function CardDetailPanel({
  card,
  boardLabels,
  members,
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

  function run(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
      onUpdate();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="dashboard-scroll flex h-full w-full max-w-lg flex-col bg-[#f1f2f4] shadow-2xl sm:max-w-xl">
        <div className="flex items-start justify-between gap-4 border-b border-primary/10 bg-white px-5 py-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title !== card.title && run(() => updateCard(card.id, { title }))}
            className="font-display flex-1 bg-transparent text-lg font-bold tracking-tight text-primary outline-none"
          />
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-primary/50 hover:bg-primary/5">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {card.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {card.labels.map((l) => (
                <span
                  key={l.id}
                  className="rounded px-2 py-0.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: l.color }}
                >
                  {l.name}
                </span>
              ))}
            </div>
          )}

          {/* Labels picker */}
          <section>
            <h4 className="mb-2 font-ui text-xs font-semibold uppercase tracking-wide text-primary/50">Labels</h4>
            <div className="flex flex-wrap gap-2">
              {boardLabels.map((label) => {
                const active = card.labels.some((l) => l.id === label.id);
                return (
                  <button
                    key={label.id}
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      run(() => toggleCardLabel(card.id, label.id, !active))
                    }
                    className="rounded px-3 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-80"
                    style={{
                      backgroundColor: label.color,
                      opacity: active ? 1 : 0.35,
                    }}
                  >
                    {label.name}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Due date */}
          <section>
            <h4 className="mb-2 flex items-center gap-1.5 font-ui text-xs font-semibold uppercase tracking-wide text-primary/50">
              <Calendar className="h-3.5 w-3.5" /> Due date
            </h4>
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

          {/* Members */}
          <section>
            <h4 className="mb-2 font-ui text-xs font-semibold uppercase tracking-wide text-primary/50">Members</h4>
            <div className="flex flex-wrap gap-2">
              {members.map((member) => {
                const active = card.members.some((m) => m.user_id === member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      run(() => toggleCardMember(card.id, member.id, !active))
                    }
                    className={[
                      "flex items-center gap-2 rounded-lg border px-2 py-1 text-xs transition-colors font-ui",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-primary/10 bg-white text-primary/60 hover:border-primary/25",
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

          {/* Description */}
          <section>
            <h4 className="mb-2 font-ui text-xs font-semibold uppercase tracking-wide text-primary/50">Description</h4>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() =>
                run(() => updateCard(card.id, { description: description || null }))
              }
              placeholder="Add a more detailed description…"
              rows={4}
              className="auth-input-glow w-full resize-none rounded-lg border border-primary/12 bg-white p-3 text-sm outline-none font-body"
            />
          </section>

          {/* Checklists */}
          <section>
            <h4 className="mb-2 flex items-center gap-1.5 font-ui text-xs font-semibold uppercase tracking-wide text-primary/50">
              <CheckSquare className="h-3.5 w-3.5" /> Checklists
            </h4>
            {card.checklists.map((checklist) => (
              <div key={checklist.id} className="mb-4 rounded-lg bg-white p-3">
                <p className="mb-2 font-ui text-sm font-semibold text-primary">{checklist.title}</p>
                <div className="space-y-1.5">
                  {checklist.items.map((item) => (
                    <label key={item.id} className="flex items-center gap-2 text-sm font-body">
                      <input
                        type="checkbox"
                        checked={item.is_completed}
                        disabled={isPending}
                        onChange={(e) =>
                          run(() => toggleChecklistItem(item.id, e.target.checked))
                        }
                        className="rounded border-primary/20"
                      />
                      <span className={item.is_completed ? "line-through text-primary/45" : "text-primary"}>
                        {item.title}
                      </span>
                      <button
                        type="button"
                        className="ml-auto text-primary/30 hover:text-red-500"
                        onClick={() => run(() => deleteChecklistItem(item.id))}
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
                    placeholder="Add an item…"
                    className="flex-1 rounded border border-primary/10 px-2 py-1 text-sm outline-none"
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
            ))}
            <div className="flex gap-2">
              <input
                value={newChecklistTitle}
                onChange={(e) => setNewChecklistTitle(e.target.value)}
                placeholder="Checklist title…"
                className="flex-1 rounded-lg border border-primary/10 bg-white px-3 py-2 text-sm outline-none"
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

          {/* Attachments */}
          <section>
            <h4 className="mb-2 flex items-center gap-1.5 font-ui text-xs font-semibold uppercase tracking-wide text-primary/50">
              <Paperclip className="h-3.5 w-3.5" /> Attachments
            </h4>
            <div className="space-y-2">
              {card.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between rounded-lg border border-primary/10 bg-white px-3 py-2"
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
                    onClick={() => run(() => deleteAttachment(att.id))}
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
                  className="flex-1 rounded-lg border border-primary/10 bg-white px-3 py-2 text-sm outline-none"
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

        <div className="border-t border-primary/10 bg-white p-4">
          <Button
            variant="ghost"
            className="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
            disabled={isPending}
            onClick={() => {
              if (confirm("Delete this card?")) {
                run(async () => {
                  await deleteCard(card.id);
                  onClose();
                });
              }
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete card
          </Button>
        </div>
      </div>
    </div>
  );
}
