"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  Bar,
  BarChart,
  Pie,
  PieChart,
  Cell,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  type ChartConfig,
} from "@kitsic/ui";

interface AttendanceChartsProps {
  stats: {
    total: number;
    present: number;
    rate: number;
    onlinePresent: number;
    offlinePresent: number;
  };
  presentVsAbsent: { name: string; value: number }[];
  modeSplit: { name: string; value: number }[];
  monthlyTrend: { month: string; rate: number; attended: number; total: number }[];
}

const PIE_COLORS = ["#033565", "#faa109", "#044a8a", "#5a7290"];

const presenceConfig = {
  value: { label: "Sessions" },
} satisfies ChartConfig;

const modeConfig = {
  value: { label: "Meetings", color: "#033565" },
} satisfies ChartConfig;

const trendConfig = {
  rate: { label: "Attendance %", color: "#033565" },
} satisfies ChartConfig;

function RingProgress({ rate }: { rate: number }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (rate / 100) * circumference;

  return (
    <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
      <svg className="-rotate-90" width="160" height="160" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="#e8eef4" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="#033565"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-bold text-primary">{rate}%</span>
        <span className="font-body text-xs text-muted">Overall rate</span>
      </div>
    </div>
  );
}

export function AttendanceCharts({ stats, presentVsAbsent, modeSplit, monthlyTrend }: AttendanceChartsProps) {
  const absent = stats.total - stats.present;
  const onlineRate = stats.present > 0 ? Math.round((stats.onlinePresent / stats.present) * 100) : 0;
  const offlineRate = stats.present > 0 ? Math.round((stats.offlinePresent / stats.present) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="dashboard-card p-5 xl:col-span-1">
          <RingProgress rate={stats.rate} />
        </article>
        <StatCard label="Sessions attended" value={String(stats.present)} sub={`of ${stats.total} total`} />
        <StatCard label="Online meetings" value={String(stats.onlinePresent)} sub={`${onlineRate}% of attended`} />
        <StatCard label="Offline meetings" value={String(stats.offlinePresent)} sub={`${offlineRate}% of attended`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="dashboard-card p-5 lg:col-span-1">
          <h3 className="font-display text-sm font-bold text-primary">Present vs absent</h3>
          <p className="mb-3 font-body text-xs text-muted">{stats.present} present · {absent} absent</p>
          <ChartContainer config={presenceConfig} className="mx-auto h-[220px] w-full">
            <PieChart>
              <Pie
                data={presentVsAbsent.filter((d) => d.value > 0)}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
              >
                {presentVsAbsent.map((_, index) => (
                  <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip />
              <ChartLegend />
            </PieChart>
          </ChartContainer>
        </article>

        <article className="dashboard-card p-5 lg:col-span-1">
          <h3 className="font-display text-sm font-bold text-primary">Meeting mode split</h3>
          <p className="mb-3 font-body text-xs text-muted">Online vs offline attendance</p>
          <ChartContainer config={modeConfig} className="h-[220px] w-full">
            <BarChart data={modeSplit} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip />
              <Bar dataKey="value" fill="#033565" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </article>

        <article className="dashboard-card p-5 lg:col-span-1">
          <h3 className="font-display text-sm font-bold text-primary">Attendance trend</h3>
          <p className="mb-3 font-body text-xs text-muted">Monthly attendance rate</p>
          {monthlyTrend.length === 0 ? (
            <p className="flex h-[220px] items-center justify-center font-body text-sm text-muted">Not enough data yet</p>
          ) : (
            <ChartContainer config={trendConfig} className="h-[220px] w-full">
              <AreaChart data={monthlyTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
                <ChartTooltip />
                <Area type="monotone" dataKey="rate" stroke="#033565" fill="#033565" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          )}
        </article>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <article className="dashboard-card flex flex-col justify-center p-5">
      <p className="font-ui text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="dashboard-stat-value mt-2 text-3xl font-bold text-primary">{value}</p>
      {sub && <p className="mt-1 font-body text-xs text-muted">{sub}</p>}
    </article>
  );
}
