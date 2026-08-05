"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { CheckCircle, Plus, Receipt, Wallet } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageCreateButton } from "@/components/page-create-button";
import { PageHeader } from "@/components/page-header";
import { Modal } from "@/components/modal";
import { CreateForm } from "@/components/create-form";
import { approveExpense, createExpense } from "@/lib/actions";

interface FinanceDashboardProps {
  data: Awaited<ReturnType<typeof import("@/lib/data").getFinanceSummary>>;
  canManage?: boolean;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function FinanceDashboardInteractive({ data, canManage = false }: FinanceDashboardProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleApprove(id: string) {
    startTransition(async () => {
      await approveExpense(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description="Budgets, expenses, and sponsorship tracking"
        actions={
          canManage ? (
            <PageCreateButton label="Add expense" onClick={() => setOpen(true)} />
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total budget", value: formatCurrency(data.totalBudget) },
          { label: "Spent", value: formatCurrency(data.totalSpent) },
          { label: "Remaining", value: formatCurrency(data.remaining) },
          { label: "Sponsorships", value: formatCurrency(data.sponsorTotal) },
        ].map((stat) => (
          <Card key={stat.label} className="dashboard-card border-primary/10">
            <CardContent className="pt-6">
              <p className="dashboard-stat-value text-2xl font-bold text-primary">{stat.value}</p>
              <p className="mt-1 font-body text-sm text-primary/50">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.budgets.length > 0 && (
        <Card className="dashboard-card border-primary/10">
          <CardHeader>
            <CardTitle className="font-display text-base text-primary">Budgets</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Allocated</TableHead>
                  <TableHead>Spent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.budgets.map((budget) => (
                  <TableRow key={budget.id}>
                    <TableCell className="font-medium text-primary">{budget.category}</TableCell>
                    <TableCell>{formatCurrency(Number(budget.total_amount))}</TableCell>
                    <TableCell>{formatCurrency(Number(budget.spent_amount))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {data.sponsors.length > 0 && (
        <Card className="dashboard-card border-primary/10">
          <CardHeader>
            <CardTitle className="font-display text-base text-primary">Sponsors</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sponsors.map((sponsor) => (
                  <TableRow key={sponsor.id}>
                    <TableCell className="font-medium text-primary">{sponsor.name}</TableCell>
                    <TableCell className="capitalize text-primary/60">{sponsor.tier ?? "—"}</TableCell>
                    <TableCell>{formatCurrency(Number(sponsor.amount ?? 0))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {data.expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses recorded"
          description="Add club expenses and approve pending submissions from the treasury."
          action={
            canManage ? (
              <Button type="button" onClick={() => setOpen(true)} className="font-ui rounded-xl">
                <Plus className="h-4 w-4" />
                Add expense
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="dashboard-card border-primary/10">
          <CardHeader>
            <CardTitle className="font-display text-base text-primary">Expenses</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium text-primary">{expense.title}</TableCell>
                    <TableCell className="text-primary/60">{expense.category}</TableCell>
                    <TableCell>{formatCurrency(Number(expense.amount))}</TableCell>
                    <TableCell>
                      <Badge variant={expense.status === "approved" ? "accent" : "muted"} className="capitalize">
                        {expense.status}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        {expense.status === "pending" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleApprove(expense.id)}
                            className="font-ui rounded-lg"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Approve
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Modal open={open} onOpenChange={setOpen} title="Add expense">
        <CreateForm
          action={createExpense}
          onSuccess={() => setOpen(false)}
          fields={[
            { name: "title", label: "Title", required: true },
            { name: "amount", label: "Amount (INR)", type: "number", required: true },
            { name: "category", label: "Category", required: true },
            { name: "description", label: "Description", type: "textarea" },
          ]}
        />
      </Modal>
    </div>
  );
}
