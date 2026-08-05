"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  Bar,
  BarChart,
  Line,
  LineChart,
  Area,
  AreaChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
} from "recharts";
import { cn } from "@kitsic/utils";

const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = Record<
  string,
  { label?: React.ReactNode; color?: string; icon?: React.ComponentType }
>;

interface ChartContextProps {
  config: ChartConfig;
}

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

export function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof ResponsiveContainer>["children"];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted/20 [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted/20 [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(([, item]) => item.color);

  if (!colorConfig.length) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig.map(([key, item]) => `  --color-${key}: ${item.color};`).join("\n")}
}
`,
          )
          .join("\n"),
      }}
    />
  );
}

export function ChartTooltip({
  active,
  payload,
  label,
  hideLabel = false,
  className,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string | number }>;
  label?: string;
  hideLabel?: boolean;
  className?: string;
}) {
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  return (
    <div
      className={cn(
        "grid min-w-[8rem] gap-1.5 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-xs shadow-[var(--shadow-elevated)]",
        className,
      )}
    >
      {!hideLabel && label && (
        <p className="font-medium text-foreground">{label}</p>
      )}
      {payload.map((item, index) => {
        const key = String(item.dataKey ?? item.name ?? index);
        const itemConfig = config[key];
        return (
          <div key={key} className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">
              {itemConfig?.label ?? item.name}
            </span>
            <span className="font-mono font-medium text-foreground">
              {item.value?.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ChartLegend({
  payload,
  className,
}: {
  payload?: Array<{ value?: string; color?: string }>;
  className?: string;
}) {
  const { config } = useChart();
  if (!payload?.length) return null;

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-4 pt-3", className)}>
      {payload.map((item) => {
        const itemConfig = config[item.value ?? ""];
        return (
          <div key={item.value} className="flex items-center gap-1.5 text-xs">
            <div
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground">
              {itemConfig?.label ?? item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export {
  Bar,
  BarChart,
  Line,
  LineChart,
  Area,
  AreaChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  RechartsTooltip as Tooltip,
  RechartsLegend as Legend,
  ResponsiveContainer,
};
