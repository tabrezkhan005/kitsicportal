"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kitsic/ui";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";

interface ReportsPanelProps {
  stats: {
    memberCount: number;
    taskCount: number;
    taskCompletionRate: number;
    eventCount: number;
    meetingCount: number;
    attendanceRate: number;
  };
}

const REPORT_TYPES = [
  { id: "members", label: "Members", description: "Full member directory with roles" },
  { id: "tasks", label: "Tasks", description: "All tasks with status and priority" },
  { id: "events", label: "Events", description: "Club events schedule" },
  { id: "attendance", label: "Attendance", description: "Attendance records export" },
  { id: "finance", label: "Finance", description: "Budgets, expenses, and sponsors" },
  { id: "summary", label: "Executive summary", description: "High-level club metrics" },
] as const;

export function ReportsPanel({ stats }: ReportsPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleExport(type: string) {
    setLoading(type);
    try {
      const response = await fetch(`/api/reports/export?type=${type}`);
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `kitsic-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export report. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Members", value: stats.memberCount },
          { label: "Tasks", value: stats.taskCount },
          { label: "Task completion", value: `${stats.taskCompletionRate}%` },
          { label: "Events", value: stats.eventCount },
          { label: "Meetings", value: stats.meetingCount },
          { label: "Attendance", value: `${stats.attendanceRate}%` },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold text-primary">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REPORT_TYPES.map((report) => (
          <Card key={report.id} className="border-border/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-primary">
                <FileSpreadsheet className="h-4 w-4 text-accent" />
                {report.label}
              </CardTitle>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport(report.id)}
                disabled={loading === report.id}
                className="w-full"
              >
                {loading === report.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export CSV
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
