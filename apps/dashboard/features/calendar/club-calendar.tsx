"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@kitsic/ui";
import { CalendarDays, ChevronLeft, ChevronRight, Video } from "lucide-react";

export interface CalendarItem {
  id: string;
  title: string;
  type: "event" | "meeting";
  starts_at: string;
  ends_at?: string | null;
  location?: string | null;
  status?: string;
}

interface ClubCalendarProps {
  items: CalendarItem[];
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function ClubCalendar({ items }: ClubCalendarProps) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedKey, setSelectedKey] = useState(() => toDateKey(today));

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const key = toDateKey(new Date(item.starts_at));
      const existing = map.get(key) ?? [];
      existing.push(item);
      map.set(key, existing);
    }
    return map;
  }, [items]);

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Monday-first offset (Mon=0 … Sun=6)
    const startOffset = (firstDay.getDay() + 6) % 7;

    const cells: Array<{ date: Date; inMonth: boolean }> = [];

    // Previous month padding
    for (let i = startOffset - 1; i >= 0; i--) {
      cells.push({ date: new Date(year, month, -i), inMonth: false });
    }

    // Current month
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ date: new Date(year, month, day), inMonth: true });
    }

    // Next month padding to fill 6 rows
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1].date;
      cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
    }

    return cells;
  }, [viewDate]);

  const selectedItems = itemsByDate.get(selectedKey) ?? [];

  const upcomingItems = useMemo(() => {
    const now = new Date();
    return [...items]
      .filter((item) => new Date(item.starts_at) >= now)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
      .slice(0, 5);
  }, [items]);

  function goToPrevMonth() {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }

  function goToNextMonth() {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }

  function goToToday() {
    const now = new Date();
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedKey(toDateKey(now));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <Card className="border-border/80">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl text-primary">
            {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={goToToday}>Today</Button>
            <Button variant="ghost" size="icon" onClick={goToPrevMonth} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={goToNextMonth} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-2 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(({ date, inMonth }) => {
              const key = toDateKey(date);
              const dayItems = itemsByDate.get(key) ?? [];
              const isToday = isSameDay(date, today);
              const isSelected = key === selectedKey;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedKey(key)}
                  className={[
                    "relative flex min-h-[88px] flex-col rounded-[var(--radius-md)] border p-2 text-left transition-colors",
                    inMonth ? "border-border bg-surface hover:border-primary/30" : "border-transparent bg-background/50 text-muted-foreground/50",
                    isSelected ? "border-primary ring-2 ring-primary/20" : "",
                    isToday && !isSelected ? "border-accent/60 bg-accent/5" : "",
                  ].join(" ")}
                >
                  <span className={[
                    "mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium",
                    isToday ? "bg-accent text-accent-foreground" : "text-primary",
                  ].join(" ")}>
                    {date.getDate()}
                  </span>

                  <div className="mt-auto space-y-0.5">
                    {dayItems.slice(0, 2).map((item) => (
                      <span
                        key={`${item.type}-${item.id}`}
                        className={[
                          "block truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight",
                          item.type === "event" ? "bg-primary/10 text-primary" : "bg-accent/15 text-accent-foreground",
                        ].join(" ")}
                      >
                        {item.title}
                      </span>
                    ))}
                    {dayItems.length > 2 && (
                      <span className="block text-[10px] text-muted-foreground">+{dayItems.length - 2} more</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-primary">
              {parseDateKey(selectedKey).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events or meetings on this day.</p>
            ) : (
              selectedItems.map((item) => (
                <div key={`${item.type}-${item.id}`} className="rounded-[var(--radius-md)] border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {item.type === "event" ? (
                        <CalendarDays className="h-4 w-4 shrink-0 text-accent" />
                      ) : (
                        <Video className="h-4 w-4 shrink-0 text-accent" />
                      )}
                      <p className="text-sm font-medium text-primary">{item.title}</p>
                    </div>
                    <Badge variant="accent" className="shrink-0 capitalize text-[10px]">{item.type}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(item.starts_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    {item.ends_at && ` – ${new Date(item.ends_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}
                  </p>
                  {item.location && (
                    <p className="mt-1 text-xs text-muted-foreground">{item.location}</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-primary">Upcoming</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events scheduled.</p>
            ) : (
              upcomingItems.map((item) => (
                <button
                  key={`upcoming-${item.type}-${item.id}`}
                  type="button"
                  onClick={() => {
                    const date = new Date(item.starts_at);
                    setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
                    setSelectedKey(toDateKey(date));
                  }}
                  className="flex w-full items-center gap-3 rounded-[var(--radius-md)] border border-border p-3 text-left transition-colors hover:border-primary/30"
                >
                  {item.type === "event" ? (
                    <CalendarDays className="h-4 w-4 shrink-0 text-accent" />
                  ) : (
                    <Video className="h-4 w-4 shrink-0 text-accent" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-primary">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.starts_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    </p>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
