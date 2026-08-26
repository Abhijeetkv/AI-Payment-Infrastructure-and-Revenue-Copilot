"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

export interface MethodDonutItem {
  method: string;
  count: number;
  volume: number; // in paise
  percentageShare: number;
  successRate: number;
}

interface MethodDonutChartProps {
  data: MethodDonutItem[];
  currency?: string;
  height?: number;
}

const COLORS = [
  "#6366f1", // Indigo
  "#10b981", // Emerald
  "#8b5cf6", // Violet
  "#f59e0b", // Amber
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#71717a", // Zinc
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: MethodDonutItem;
  }>;
  currency?: string;
}

function CustomTooltip({ active, payload, currency = "INR" }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;

  return (
    <div className="rounded-xl bg-zinc-950/95 border border-zinc-800 p-3 shadow-2xl backdrop-blur-md space-y-1.5 text-xs font-mono">
      <div className="font-bold text-white uppercase tracking-wider">
        {item.method}
      </div>
      <div className="flex justify-between gap-4 text-zinc-300">
        <span className="text-zinc-400">Volume:</span>
        <span className="font-semibold text-emerald-400">
          {formatCurrency(item.volume, currency)}
        </span>
      </div>
      <div className="flex justify-between gap-4 text-zinc-300">
        <span className="text-zinc-400">Transactions:</span>
        <span>{item.count}</span>
      </div>
      <div className="flex justify-between gap-4 text-zinc-300">
        <span className="text-zinc-400">Share:</span>
        <span>{item.percentageShare}%</span>
      </div>
      <div className="flex justify-between gap-4 text-zinc-300">
        <span className="text-zinc-400">Success Rate:</span>
        <span className="text-indigo-300">{item.successRate}%</span>
      </div>
    </div>
  );
}

export function MethodDonutChart({
  data,
  currency = "INR",
  height = 240,
}: MethodDonutChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-zinc-500 font-mono"
        style={{ height }}
      >
        No payment method data available
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<CustomTooltip currency={currency} />} />
          <Pie
            data={data}
            dataKey="volume"
            nameKey="method"
            cx="50%"
            cy="50%"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={3}
            stroke="#18181b"
            strokeWidth={2}
          >
            {data.map((_entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
