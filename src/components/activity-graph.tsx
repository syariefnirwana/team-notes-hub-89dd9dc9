import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";

const RANGES = [
  { days: 1, label: "1 hari" },
  { days: 7, label: "7 hari" },
  { days: 30, label: "30 hari" },
] as const;

export function ActivityGraph({ rows }: { rows: { created_at: string }[] }) {
  const [days, setDays] = useState<number>(7);

  const data = useMemo(() => {
    const now = new Date();
    if (days === 1) {
      const buckets = Array.from({ length: 12 }, (_, index) => {
        const end = new Date(now.getTime() - (11 - index) * 2 * 60 * 60 * 1000);
        return { label: `${String(end.getHours()).padStart(2, "0")}:00`, total: 0, end };
      });
      rows.forEach((row) => {
        const time = new Date(row.created_at).getTime();
        if (now.getTime() - time > 24 * 60 * 60 * 1000) return;
        const index = buckets.findIndex((bucket) => time <= bucket.end.getTime());
        if (index >= 0) buckets[index]!.total += 1;
      });
      return buckets.map(({ label, total }) => ({ label, total }));
    }

    const buckets = Array.from({ length: days }, (_, index) => {
      const day = new Date(now.getTime() - (days - 1 - index) * 24 * 60 * 60 * 1000);
      return {
        key: day.toDateString(),
        label: day.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
        total: 0,
      };
    });
    rows.forEach((row) => {
      const key = new Date(row.created_at).toDateString();
      const bucket = buckets.find((item) => item.key === key);
      if (bucket) bucket.total += 1;
    });
    return buckets.map(({ label, total }) => ({ label, total }));
  }, [rows, days]);

  const total = data.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="surface-paper p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base">Aktivitas kelompok</h2>
          <p className="text-xs text-muted-foreground">{total} perubahan pada periode ini</p>
        </div>
        <div className="flex gap-1">
          {RANGES.map((range) => (
            <Button
              key={range.days}
              size="sm"
              variant={days === range.days ? "default" : "ghost"}
              onClick={() => setDays(range.days)}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-4 h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 6, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.55} />
                <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              interval="preserveStartEnd"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-popover)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                fontSize: 12,
                color: "var(--color-popover-foreground)",
              }}
              formatter={(value) => [`${value} perubahan`, ""]}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="var(--color-chart-1)"
              strokeWidth={2}
              fill="url(#activityFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
