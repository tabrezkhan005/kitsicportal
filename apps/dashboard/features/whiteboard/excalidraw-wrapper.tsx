"use client";

import { Excalidraw, restore, serializeAsJSON } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useEffect, useMemo, useRef } from "react";

interface ExcalidrawWrapperProps {
  initialScene: string;
  onChange: (sceneJson: string) => void;
}

function parseInitialScene(initialScene: string) {
  try {
    const raw = JSON.parse(initialScene) as {
      elements?: unknown[];
      appState?: Record<string, unknown>;
      files?: Record<string, unknown>;
    };

    // Strip runtime-only fields that break when JSON-serialized (e.g. collaborators Map → {})
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

export function ExcalidrawWrapper({ initialScene, onChange }: ExcalidrawWrapperProps) {
  const ready = useRef(false);
  const initialData = useMemo(() => parseInitialScene(initialScene), [initialScene]);

  useEffect(() => {
    ready.current = true;
  }, []);

  return (
    <div style={{ height: "calc(100vh - 10rem)" }}>
      <Excalidraw
        initialData={initialData}
        onChange={(elements, appState, files) => {
          if (!ready.current) return;
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
    </div>
  );
}
