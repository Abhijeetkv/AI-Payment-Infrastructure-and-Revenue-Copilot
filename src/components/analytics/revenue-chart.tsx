"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

export interface RevenueTimeseriesPoint {
  date: string;
  grossRevenue: number; // in paise
  netRevenue: number;   // in paise
  refundAmount: number; // in paise
}

interface RevenueChartProps {
  data: RevenueTimeseriesPoint[];
  currency?: string;
  height?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    color: string;
  }>;
  label?: string;
  currency?: string;
}

function CustomTooltip({ active, payload, label, currency = "INR" }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-xl bg-zinc-950/95 border border-zinc-800 p-3 shadow-2xl backdrop-blur-md space-y-2 text-xs font-mono">
      <div className="font-semibold text-zinc-300 border-b border-zinc-800 pb-1">
        {label}
      </div>
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.name}:</span>
            </span>
            <span className="font-bold text-white">
              {formatCurrency(entry.value, currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RevenueChart({
  data,
  currency = "INR",
  height = 320,
}: RevenueChartProps) {
  // Format short date for X-Axis (e.g., "26 Aug")
  const formattedData = React.useMemo(() => {
    return data.map((item) => {
      const parts = item.date.split("-");
      let displayDate = item.date;
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        displayDate = d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
      }
      return {
        ...item,
        displayDate,
      };
    });
  }, [data]);

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={formattedData}
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="refundGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#27272a"
            vertical={false}
          />

          <XAxis
            dataKey="displayDate"
            stroke="#71717a"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "#27272a" }}
          />

          <YAxis
            stroke="#71717a"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "#27272a" }}
            tickFormatter={(val) => `₹${Math.round(val / 100).toLocaleString()}`}
          />

          <Tooltip content={<CustomTooltip currency={currency} />} />

          <Area
            type="monotone"
            dataKey="grossRevenue"
            name="Gross Revenue"
            stroke="#6366f1"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#grossGradient)"
          />

          <Area
            type="monotone"
            dataKey="netRevenue"
            name="Net Revenue"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#netGradient)"
          />

          <Area
            type="monotone"
            dataKey="refundAmount"
            name="Refunds"
            stroke="#f43f5e"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fillOpacity={1}
            fill="url(#refundGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
