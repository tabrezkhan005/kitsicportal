"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  Bar,
  BarChart,
  Area,
  AreaChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  type ChartConfig,
} from "@kitsic/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kitsic/ui";

interface AnalyticsChartsProps {
  data: Awaited<ReturnType<typeof import("@/lib/data").getAnalyticsData>>;
}

const statusConfig = {
  count: { label: "Tasks", color: "#033565" },
} satisfies ChartConfig;

const priorityConfig = {
  count: { label: "Tasks", color: "#faa109" },
} satisfies ChartConfig;

const growthConfig = {
  members: { label: "Members", color: "#033565" },
} satisfies ChartConfig;

const attendanceConfig = {
  rate: { label: "Attendance %", color: "#faa109" },
} satisfies ChartConfig;

const deptConfig = {
  score: { label: "Score", color: "#033565" },
} satisfies ChartConfig;

const PIE_COLORS = ["#033565", "#faa109", "#044a8a", "#5a7290", "#0d9488"];

export function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Tasks by status</CardTitle>
          <CardDescription>Current task distribution across the club</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={statusConfig} className="h-[280px] w-full">
            <BarChart data={data.tasksByStatus} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="status" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip />
              <Bar dataKey="count" fill="#033565" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tasks by priority</CardTitle>
          <CardDescription>Workload breakdown by urgency</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={priorityConfig} className="mx-auto h-[280px] w-full">
            <PieChart>
              <Pie
                data={data.tasksByPriority}
                dataKey="count"
                nameKey="priority"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
              >
                {data.tasksByPriority.map((_, index) => (
                  <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip />
              <ChartLegend />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Member growth</CardTitle>
          <CardDescription>Club membership over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={growthConfig} className="h-[280px] w-full">
            <AreaChart data={data.memberGrowth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="memberGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#033565" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#033565" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip />
              <Area type="monotone" dataKey="members" stroke="#033565" fill="url(#memberGradient)" strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance trend</CardTitle>
          <CardDescription>Monthly attendance rate percentage</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={attendanceConfig} className="h-[280px] w-full">
            <BarChart data={data.attendanceTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} domain={[0, 100]} />
              <ChartTooltip />
              <Bar dataKey="rate" fill="#faa109" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Department health</CardTitle>
          <CardDescription>Activity scores across departments</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={deptConfig} className="h-[280px] w-full">
            <BarChart data={data.departmentActivity} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="department" tickLine={false} axisLine={false} width={100} />
              <ChartTooltip />
              <Bar dataKey="score" fill="#033565" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
