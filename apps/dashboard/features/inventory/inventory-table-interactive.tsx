"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@kitsic/ui";
import { Package, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageCreateButton } from "@/components/page-create-button";
import { PageHeader } from "@/components/page-header";
import { Modal } from "@/components/modal";
import { CreateForm } from "@/components/create-form";
import { createInventoryItem } from "@/lib/actions";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  condition: string;
  location: string | null;
  assignee: { full_name: string | null } | { full_name: string | null }[] | null;
}

interface InventoryTableInteractiveProps {
  items: InventoryItem[];
  canManage?: boolean;
}

function getAssigneeName(assignee: InventoryItem["assignee"]) {
  if (!assignee) return "Unassigned";
  if (Array.isArray(assignee)) return assignee[0]?.full_name ?? "Unassigned";
  return assignee.full_name ?? "Unassigned";
}

export function InventoryTableInteractive({ items, canManage = false }: InventoryTableInteractiveProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description={`${items.length} tracked item${items.length === 1 ? "" : "s"}`}
        actions={
          canManage ? (
            <PageCreateButton label="Add item" onClick={() => setOpen(true)} />
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Inventory is empty"
          description="Track club equipment, kits, and assets with quantity and condition."
          action={
            canManage ? (
              <Button type="button" onClick={() => setOpen(true)} className="font-ui rounded-xl">
                <Plus className="h-4 w-4" />
                Add first item
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="dashboard-card border-primary/10">
          <CardHeader>
            <CardTitle className="font-display text-base text-primary">Club inventory</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Assigned to</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-primary">{item.name}</TableCell>
                    <TableCell>
                      <Badge variant="muted" className="text-[10px]">
                        {item.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell className="capitalize text-primary/60">{item.condition}</TableCell>
                    <TableCell className="text-primary/60">{item.location ?? "—"}</TableCell>
                    <TableCell className="text-primary/60">{getAssigneeName(item.assignee)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Modal open={open} onOpenChange={setOpen} title="Add inventory item">
        <CreateForm
          action={createInventoryItem}
          onSuccess={() => setOpen(false)}
          fields={[
            { name: "name", label: "Name", required: true },
            { name: "category", label: "Category", required: true },
            { name: "quantity", label: "Quantity", type: "number" },
            {
              name: "condition",
              label: "Condition",
              options: [
                { value: "excellent", label: "Excellent" },
                { value: "good", label: "Good" },
                { value: "fair", label: "Fair" },
              ],
            },
            { name: "location", label: "Location" },
            { name: "notes", label: "Notes", type: "textarea" },
          ]}
        />
      </Modal>
    </div>
  );
}
