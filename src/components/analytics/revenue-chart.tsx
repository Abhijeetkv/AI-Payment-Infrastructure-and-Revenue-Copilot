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
  grossRevenue: number;     // in paise
  netRevenue: number;       // in paise
  recoveredRevenue?: number;// in paise
  refundAmount?: number;    // in paise
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
    <div className="rounded-lg bg-white border border-[#e9ecef] p-3 shadow-md space-y-2 text-xs font-mono">
      <div className="font-semibold text-[#191c1d] border-b border-[#e9ecef] pb-1 font-sans">
        {label}
      </div>
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[#444748]">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.name}:</span>
            </span>
            <span className="font-bold text-[#191c1d]">
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
              <stop offset="5%" stopColor="#2a21d2" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#2a21d2" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#087343" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#087343" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="recoveredGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e9ecef"
            vertical={false}
          />

          <XAxis
            dataKey="displayDate"
            stroke="#747878"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "#e9ecef" }}
          />

          <YAxis
            stroke="#747878"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "#e9ecef" }}
            tickFormatter={(val) => `₹${Math.round(val / 100).toLocaleString()}`}
          />

          <Tooltip content={<CustomTooltip currency={currency} />} />

          <Area
            type="monotone"
            dataKey="grossRevenue"
            name="Gross Revenue"
            stroke="#2a21d2"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#grossGradient)"
          />

          <Area
            type="monotone"
            dataKey="netRevenue"
            name="Net Revenue"
            stroke="#087343"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#netGradient)"
          />

          <Area
            type="monotone"
            dataKey="recoveredRevenue"
            name="Recovered Revenue"
            stroke="#7c3aed"
            strokeWidth={2}
            strokeDasharray="4 4"
            fillOpacity={1}
            fill="url(#recoveredGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
