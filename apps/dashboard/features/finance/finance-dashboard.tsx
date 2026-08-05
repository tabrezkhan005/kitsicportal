"use client";

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartTooltip,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type ChartConfig,
} from "@kitsic/ui";
import { IndianRupee, TrendingDown, TrendingUp, Wallet } from "lucide-react";

interface FinanceDashboardProps {
  data: Awaited<ReturnType<typeof import("@/lib/data").getFinanceSummary>>;
}

const categoryConfig = {
  amount: { label: "Amount", color: "#033565" },
} satisfies ChartConfig;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export function FinanceDashboard({ data }: FinanceDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="h-4 w-4 text-accent" /> Total budget
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-primary">{formatCurrency(data.totalBudget)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingDown className="h-4 w-4 text-accent" /> Spent
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-primary">{formatCurrency(data.totalSpent)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <IndianRupee className="h-4 w-4 text-accent" /> Remaining
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-accent">{formatCurrency(data.remaining)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-accent" /> Sponsorships
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-primary">{formatCurrency(data.sponsorTotal)}</p></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Expenses by category</CardTitle>
            <CardDescription>Breakdown of approved and pending expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={categoryConfig} className="h-[260px] w-full">
              <BarChart data={data.expensesByCategory} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="category" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip />
                <Bar dataKey="amount" fill="#033565" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sponsors</CardTitle>
            <CardDescription>Club sponsorship partners</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.sponsors.map((sponsor) => (
              <div key={sponsor.id} className="flex items-center justify-between rounded-[var(--radius-md)] border border-border p-3">
                <div>
                  <p className="font-medium text-primary">{sponsor.name}</p>
                  <p className="text-xs text-muted-foreground">{sponsor.contact_email}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-accent">{formatCurrency(Number(sponsor.amount ?? 0))}</p>
                  <Badge variant="muted" className="capitalize text-[10px]">{sponsor.tier}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Budgets</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Budget</TableHead>
                <TableHead>Fiscal year</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Spent</TableHead>
                <TableHead>Utilization</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.budgets.map((budget) => {
                const utilization = Number(budget.total_amount) > 0
                  ? Math.round((Number(budget.spent_amount) / Number(budget.total_amount)) * 100)
                  : 0;
                return (
                  <TableRow key={budget.id}>
                    <TableCell className="font-medium text-primary">{budget.name}</TableCell>
                    <TableCell className="text-muted-foreground">{budget.fiscal_year}</TableCell>
                    <TableCell>{formatCurrency(Number(budget.total_amount))}</TableCell>
                    <TableCell>{formatCurrency(Number(budget.spent_amount))}</TableCell>
                    <TableCell>
                      <Badge variant={utilization > 80 ? "accent" : "muted"}>{utilization}%</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent expenses</CardTitle>
          <CardDescription>{data.pendingCount} pending approval</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium text-primary">{expense.title}</TableCell>
                  <TableCell className="text-muted-foreground">{expense.category}</TableCell>
                  <TableCell>{formatCurrency(Number(expense.amount))}</TableCell>
                  <TableCell>
                    <Badge variant={expense.status === "approved" ? "accent" : "muted"}>{expense.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
