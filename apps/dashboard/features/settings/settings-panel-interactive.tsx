"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@kitsic/ui";
import { Key, Settings2, Trash2 } from "lucide-react";
import { createApiKey, revokeApiKey, updateSystemSetting } from "@/lib/actions";

interface SystemSetting {
  key: string;
  value: Record<string, unknown>;
}

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
}

interface SettingsPanelInteractiveProps {
  settings: SystemSetting[];
  apiKeys: ApiKey[];
  canManage?: boolean;
}

const SETTING_LABELS: Record<string, string> = {
  club_name: "Club name",
  academic_year: "Academic year",
  notifications: "Notifications",
  integrations: "Integrations",
};

export function SettingsPanelInteractive({ settings, apiKeys, canManage = false }: SettingsPanelInteractiveProps) {
  const router = useRouter();
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleUpdateSetting(key: string, field: string, value: string) {
    const setting = settings.find((s) => s.key === key);
    if (!setting) return;
    const updated = { ...setting.value, [field]: value };
    startTransition(async () => {
      await updateSystemSetting(key, updated);
      router.refresh();
    });
  }

  function handleCreateKey() {
    if (!newKeyName.trim()) return;
    startTransition(async () => {
      const result = await createApiKey(newKeyName.trim());
      if (result.data?.key) setGeneratedKey(String(result.data.key));
      setNewKeyName("");
      router.refresh();
    });
  }

  function handleRevoke(id: string) {
    startTransition(async () => {
      await revokeApiKey(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {settings.map((setting) => (
          <Card key={setting.key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings2 className="h-4 w-4 text-accent" />
                {SETTING_LABELS[setting.key] ?? setting.key}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {canManage && setting.key === "club_name" ? (
                <Input
                  defaultValue={String((setting.value as { name?: string }).name ?? "")}
                  onBlur={(e) => handleUpdateSetting(setting.key, "name", e.target.value)}
                  disabled={isPending}
                />
              ) : (
                <pre className="overflow-x-auto rounded-[var(--radius-md)] bg-background p-3 text-xs text-muted-foreground">
                  {JSON.stringify(setting.value, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-accent" />
            API Keys
          </CardTitle>
          <CardDescription>For public website and external integrations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canManage && (
            <div className="flex gap-2">
              <Input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key name (e.g. Public Website)"
              />
              <Button onClick={handleCreateKey} disabled={isPending}>Create key</Button>
            </div>
          )}
          {generatedKey && (
            <div className="rounded-[var(--radius-md)] border border-accent/40 bg-accent/5 p-3">
              <p className="text-xs font-medium text-primary">Save this key — it won&apos;t be shown again:</p>
              <code className="mt-1 block break-all text-xs">{generatedKey}</code>
            </div>
          )}
          {apiKeys.map((key) => (
            <div key={key.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-border p-4">
              <div>
                <p className="font-medium text-primary">{key.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{key.key_prefix}…</p>
              </div>
              <div className="flex items-center gap-2">
                {key.scopes.map((scope) => (
                  <Badge key={scope} variant="muted" className="font-mono text-[10px]">{scope}</Badge>
                ))}
                <Badge variant={key.is_active ? "accent" : "muted"}>{key.is_active ? "Active" : "Revoked"}</Badge>
                {canManage && key.is_active && (
                  <Button variant="ghost" size="icon" onClick={() => handleRevoke(key.id)} disabled={isPending}>
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
