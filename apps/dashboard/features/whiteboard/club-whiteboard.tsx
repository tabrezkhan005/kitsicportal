"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState, useTransition } from "react";
import { saveWhiteboardScene } from "@/lib/board-actions";

const ExcalidrawWrapper = dynamic(
  () => import("@/features/whiteboard/excalidraw-wrapper").then((m) => m.ExcalidrawWrapper),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center rounded-xl border border-primary/10 bg-white">
        <p className="font-body text-sm text-primary/50">Loading whiteboard…</p>
      </div>
    ),
  },
);

interface ClubWhiteboardProps {
  whiteboardId: string;
  initialScene: string;
  currentUser: {
    id: string;
    fullName: string | null;
    email: string;
  };
}

export function ClubWhiteboard({ whiteboardId, initialScene, currentUser }: ClubWhiteboardProps) {
  const [isPending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (sceneJson: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        startTransition(async () => {
          const result = await saveWhiteboardScene(whiteboardId, sceneJson);
          if (result.success) {
            setSavedAt(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
          }
        });
      }, 1500);
    },
    [whiteboardId],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-body text-sm text-primary/50">
          Shared club whiteboard — hover any stroke to see who drew it. Each member gets their own color.
        </p>
        <p className="font-mono-brand shrink-0 text-xs text-primary/40">
          {isPending ? "Saving…" : savedAt ? `Saved ${savedAt}` : "Auto-save enabled"}
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border border-primary/10 bg-white shadow-sm">
        <ExcalidrawWrapper initialScene={initialScene} currentUser={currentUser} onChange={handleChange} />
      </div>
    </div>
  );
}
