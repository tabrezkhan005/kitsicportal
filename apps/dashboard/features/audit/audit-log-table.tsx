import { Badge, Card, CardContent, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@kitsic/ui";

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
  user: { full_name: string | null; email: string } | { full_name: string | null; email: string }[] | null;
}

interface AuditLogTableProps {
  logs: AuditLog[];
}

function getUserName(user: AuditLog["user"]) {
  if (!user) return "System";
  if (Array.isArray(user)) return user[0]?.full_name ?? user[0]?.email ?? "Unknown";
  return user.full_name ?? user.email;
}

export function AuditLogTable({ logs }: AuditLogTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No audit logs recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="font-medium text-primary">{getUserName(log.user)}</TableCell>
                  <TableCell>
                    <Badge variant="muted" className="font-mono text-[10px]">{log.action}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {log.entity_type}
                    {log.entity_id && <span className="ml-1 font-mono text-xs">({log.entity_id.slice(0, 8)}…)</span>}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate font-mono text-xs text-muted-foreground">
                    {log.new_value ? JSON.stringify(log.new_value) : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
