"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export interface VolumeTimeseriesPoint {
  date: string;
  transactionCount: number;
  successfulCount: number;
  failedCount: number;
  successRate: number;
}

interface VolumeBarChartProps {
  data: VolumeTimeseriesPoint[];
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
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg bg-white border border-[#e9ecef] p-3 shadow-md space-y-1.5 text-xs font-mono">
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
            <span className="font-bold text-[#191c1d]">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VolumeBarChart({
  data,
  height = 320,
}: VolumeBarChartProps) {
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
        <BarChart
          data={formattedData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" vertical={false} />
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
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ fontSize: 11, paddingBottom: 8, color: "#444748" }}
          />
          <Bar
            dataKey="successfulCount"
            name="Successful"
            stackId="a"
            fill="#087343"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="failedCount"
            name="Failed"
            stackId="a"
            fill="#c92a2a"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

