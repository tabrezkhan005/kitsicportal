import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kitsic/ui";
import { Key, Settings2 } from "lucide-react";

interface SystemSetting {
  key: string;
  value: Record<string, unknown>;
  updated_at?: string;
}

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

interface SettingsPanelProps {
  settings: SystemSetting[];
  apiKeys: ApiKey[];
}

const SETTING_LABELS: Record<string, string> = {
  club_name: "Club name",
  academic_year: "Academic year",
  notifications: "Notifications",
  integrations: "Integrations",
};

export function SettingsPanel({ settings, apiKeys }: SettingsPanelProps) {
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
              <CardDescription className="font-mono text-xs">{setting.key}</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-[var(--radius-md)] bg-background p-3 text-xs text-muted-foreground">
                {JSON.stringify(setting.value, null, 2)}
              </pre>
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
          <CardDescription>Keys for public website and external integrations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API keys configured yet. Create one from the leadership settings panel.</p>
          ) : (
            apiKeys.map((key) => (
              <div key={key.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-border p-4">
                <div>
                  <p className="font-medium text-primary">{key.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{key.key_prefix}…</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {key.scopes.map((scope) => (
                    <Badge key={scope} variant="muted" className="font-mono text-[10px]">{scope}</Badge>
                  ))}
                  <Badge variant={key.is_active ? "accent" : "muted"}>{key.is_active ? "Active" : "Inactive"}</Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
