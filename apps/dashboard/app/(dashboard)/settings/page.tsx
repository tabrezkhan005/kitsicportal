import { requirePermission } from "@kitsic/auth";
import { getApiKeys, getSystemSettings } from "@/lib/data";
import { ForbiddenPage } from "@/components/forbidden-page";
import { PageHeader } from "@/components/page-header";
import { SettingsPanelInteractive } from "@/features/settings/settings-panel-interactive";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  let user;
  try {
    user = await requirePermission("settings.read");
  } catch {
    return <ForbiddenPage />;
  }

  const [settings, apiKeys] = await Promise.all([getSystemSettings(), getApiKeys()]);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Club configuration and API integrations" />
      <SettingsPanelInteractive
        settings={settings}
        apiKeys={apiKeys}
        canManage={user.permissions.includes("settings.manage")}
      />
    </div>
  );
}
