import { Badge, Card, CardContent, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@kitsic/ui";
import { MapPin, Package } from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  condition: string;
  location: string | null;
  notes: string | null;
  assignee: { full_name: string | null } | { full_name: string | null }[] | null;
}

interface InventoryTableProps {
  items: InventoryItem[];
}

function getAssigneeName(assignee: InventoryItem["assignee"]) {
  if (!assignee) return "Unassigned";
  if (Array.isArray(assignee)) return assignee[0]?.full_name ?? "Unassigned";
  return assignee.full_name ?? "Unassigned";
}

export function InventoryTable({ items }: InventoryTableProps) {
  const categories = [...new Set(items.map((i) => i.category))];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Package className="h-8 w-8 text-accent" />
            <div>
              <p className="text-2xl font-bold text-primary">{items.length}</p>
              <p className="text-sm text-muted-foreground">Total items</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Package className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold text-primary">{categories.length}</p>
              <p className="text-sm text-muted-foreground">Categories</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <MapPin className="h-8 w-8 text-accent" />
            <div>
              <p className="text-2xl font-bold text-primary">{items.reduce((s, i) => s + i.quantity, 0)}</p>
              <p className="text-sm text-muted-foreground">Total units</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
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
                  <TableCell><Badge variant="muted" className="text-[10px]">{item.category}</Badge></TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{item.condition}</TableCell>
                  <TableCell className="text-muted-foreground">{item.location ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{getAssigneeName(item.assignee)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
