import { requirePermission } from "@kitsic/auth";
import { getInventory } from "@/lib/data";
import { ForbiddenPage } from "@/components/forbidden-page";
import { InventoryTableInteractive } from "@/features/inventory/inventory-table-interactive";

export const metadata = { title: "Inventory" };

export default async function InventoryPage() {
  let user;
  try {
    user = await requirePermission("inventory.read");
  } catch {
    return <ForbiddenPage />;
  }

  const items = await getInventory();

  return (
    <InventoryTableInteractive
      items={items}
      canManage={user.permissions.includes("inventory.manage")}
    />
  );
}
