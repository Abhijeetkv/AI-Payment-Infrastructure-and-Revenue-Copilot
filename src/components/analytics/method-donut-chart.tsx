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
  "#2a21d2", // AI Accent Cobalt
  "#087343", // Success Green
  "#000000", // Dark Primary
  "#5e5e5e", // Secondary Slate
  "#f59e0b", // Amber
  "#0284c7", // Sky
  "#c4c7c7", // Outline Variant
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
    <div className="rounded-lg bg-white border border-[#e9ecef] p-3 shadow-md space-y-1.5 text-xs font-mono">
      <div className="font-bold text-[#191c1d] uppercase tracking-wider font-sans">
        {item.method}
      </div>
      <div className="flex justify-between gap-4 text-[#444748]">
        <span>Volume:</span>
        <span className="font-semibold text-[#087343]">
          {formatCurrency(item.volume, currency)}
        </span>
      </div>
      <div className="flex justify-between gap-4 text-[#444748]">
        <span>Transactions:</span>
        <span className="text-[#191c1d] font-semibold">{item.count}</span>
      </div>
      <div className="flex justify-between gap-4 text-[#444748]">
        <span>Share:</span>
        <span className="text-[#191c1d] font-semibold">{item.percentageShare}%</span>
      </div>
      <div className="flex justify-between gap-4 text-[#444748]">
        <span>Success Rate:</span>
        <span className="text-[#2a21d2] font-semibold">{item.successRate}%</span>
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
        className="flex items-center justify-center text-xs text-[#747878] font-mono"
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
            stroke="#ffffff"
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

