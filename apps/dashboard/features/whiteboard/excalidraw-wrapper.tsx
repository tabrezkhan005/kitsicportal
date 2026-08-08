"use client";

import {
  sceneCoordsToViewportCoords,
  CaptureUpdateAction,
  Excalidraw,
  newElementWith,
  restore,
  serializeAsJSON,
} from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAvatarColorForUser } from "@/lib/avatar-color";

interface WhiteboardUser {
  id: string;
  fullName: string | null;
  email: string;
}

interface ExcalidrawWrapperProps {
  initialScene: string;
  currentUser: WhiteboardUser;
  onChange: (sceneJson: string) => void;
}

interface AuthorMeta {
  authorId: string;
  authorName: string;
  authorColor: string;
}

interface HoverLabel {
  name: string;
  color: string;
  x: number;
  y: number;
}

function parseInitialScene(initialScene: string) {
  try {
    const raw = JSON.parse(initialScene) as {
      elements?: unknown[];
      appState?: Record<string, unknown>;
      files?: Record<string, unknown>;
    };

    const appState = { ...(raw.appState ?? {}) };
    delete appState.collaborators;

    return restore(
      {
        elements: (raw.elements ?? []) as never[],
        appState: {
          viewBackgroundColor: "#fefefe",
          ...appState,
        },
        files: (raw.files ?? {}) as never,
      },
      null,
      null,
    );
  } catch {
    return restore(
      {
        elements: [],
        appState: { viewBackgroundColor: "#fefefe" },
        files: {},
      },
      null,
      null,
    );
  }
}

function readAuthorMeta(customData: Record<string, unknown> | undefined): AuthorMeta | null {
  if (!customData?.authorId || typeof customData.authorId !== "string") return null;
  return {
    authorId: customData.authorId,
    authorName: typeof customData.authorName === "string" ? customData.authorName : "Club member",
    authorColor: typeof customData.authorColor === "string" ? customData.authorColor : "#033565",
  };
}

export function ExcalidrawWrapper({ initialScene, currentUser, onChange }: ExcalidrawWrapperProps) {
  const ready = useRef(false);
  // Excalidraw API surface is wider than we need; keep the ref loosely typed.
  const apiRef = useRef<{
    getAppState: () => Record<string, unknown>;
    getSceneElements: () => ReadonlyArray<Record<string, unknown>>;
    updateScene: (scene: Record<string, unknown>) => void;
  } | null>(null);
  const knownIds = useRef<Set<string>>(new Set());
  const [hoverLabel, setHoverLabel] = useState<HoverLabel | null>(null);

  const userColor = useMemo(() => getAvatarColorForUser(currentUser.id), [currentUser.id]);
  const displayName = currentUser.fullName ?? currentUser.email.split("@")[0] ?? "Member";

  const initialData = useMemo(() => {
    const parsed = parseInitialScene(initialScene);
    for (const element of parsed.elements) {
      knownIds.current.add(element.id);
    }
    return {
      ...parsed,
      appState: {
        ...parsed.appState,
        currentItemStrokeColor: userColor,
        currentItemBackgroundColor: "transparent",
      },
    };
  }, [initialScene, userColor]);

  const stampElements = useCallback(
    (elements: readonly Record<string, unknown>[]) => {
      let changed = false;
      const nextElements = elements.map((element) => {
        const el = element as {
          id: string;
          isDeleted?: boolean;
          customData?: Record<string, unknown>;
          strokeColor?: string;
        };

        if (el.isDeleted || knownIds.current.has(el.id)) {
          knownIds.current.add(el.id);
          return element;
        }

        knownIds.current.add(el.id);
        changed = true;
        return newElementWith(element as never, {
          customData: {
            ...(el.customData ?? {}),
            authorId: currentUser.id,
            authorName: displayName,
            authorColor: userColor,
          },
          strokeColor: userColor,
        } as never);
      });

      return changed ? nextElements : null;
    },
    [currentUser.id, displayName, userColor],
  );

  useEffect(() => {
    ready.current = true;
  }, []);

  return (
    <div className="relative" style={{ height: "calc(100vh - 10rem)" }}>
      <Excalidraw
        initialData={initialData}
        excalidrawAPI={(api) => {
          apiRef.current = api as typeof apiRef.current;
        }}
        onPointerUpdate={() => {
          const appState = apiRef.current?.getAppState() as {
            hoveredElementIds?: Record<string, boolean>;
            zoom?: { value: number };
            offsetLeft?: number;
            offsetTop?: number;
            scrollX?: number;
            scrollY?: number;
          } | undefined;
          const elements = (apiRef.current?.getSceneElements() ?? []) as Array<{
            id: string;
            x: number;
            y: number;
            width: number;
            height: number;
            customData?: Record<string, unknown>;
          }>;
          const hoveredIds = appState?.hoveredElementIds ?? {};
          const hoveredId = Object.keys(hoveredIds).find((id) => hoveredIds[id]);

          if (!hoveredId) {
            setHoverLabel(null);
            return;
          }

          const element = elements.find((item) => item.id === hoveredId);
          const author = readAuthorMeta(element?.customData as Record<string, unknown> | undefined);
          if (!author) {
            setHoverLabel(null);
            return;
          }

          const viewport = sceneCoordsToViewportCoords(
            { sceneX: element!.x + element!.width / 2, sceneY: element!.y },
            appState as never,
          );

          setHoverLabel({
            name: author.authorName,
            color: author.authorColor,
            x: viewport.x,
            y: Math.max(8, viewport.y - 8),
          });
        }}
        onChange={(elements, appState, files) => {
          if (!ready.current) return;

          const stamped = stampElements(elements as readonly Record<string, unknown>[]);
          if (stamped && apiRef.current) {
            apiRef.current.updateScene({
              elements: stamped as never[],
              captureUpdate: CaptureUpdateAction.NEVER,
            });
            onChange(serializeAsJSON(stamped as never[], appState, files, "database"));
            return;
          }

          onChange(serializeAsJSON(elements, appState, files, "database"));
        }}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            export: false,
            saveAsImage: true,
          },
        }}
      />

      {hoverLabel && (
        <div
          className="pointer-events-none absolute z-20 max-w-[12rem] truncate rounded-full px-3 py-1 text-xs font-semibold text-white shadow-lg font-ui"
          style={{
            left: hoverLabel.x,
            top: hoverLabel.y,
            backgroundColor: hoverLabel.color,
            transform: "translate(-50%, -100%)",
          }}
        >
          {hoverLabel.name}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full border border-primary/10 bg-white/95 px-3 py-1.5 text-[11px] shadow-sm font-ui">
        <span className="text-primary/50">Your ink · </span>
        <span className="inline-flex items-center gap-1.5 font-semibold text-primary">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: userColor }} />
          {displayName}
        </span>
      </div>
    </div>
  );
}
