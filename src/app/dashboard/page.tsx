"use client";

import * as React from "react";
import Link from "next/link";
import {
  Download,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Receipt,
  RotateCcw,
  Bot,
  MoreVertical,
  QrCode,
  CreditCard,
  Building2,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const chartData7d = [
  { name: "Mon", revenue: 142000 },
  { name: "Tue", revenue: 198000 },
  { name: "Wed", revenue: 165000 },
  { name: "Thu", revenue: 245000 },
  { name: "Fri", revenue: 210000 },
  { name: "Sat", revenue: 295000 },
  { name: "Sun", revenue: 320000 },
];

const chartData30d = [
  { name: "Week 1", revenue: 1240000 },
  { name: "Week 2", revenue: 1680000 },
  { name: "Week 3", revenue: 1450000 },
  { name: "Week 4", revenue: 2100000 },
];

const chartData90d = [
  { name: "Month 1", revenue: 4200000 },
  { name: "Month 2", revenue: 5800000 },
  { name: "Month 3", revenue: 7650000 },
];

const recentTransactions = [
  {
    id: "#TX-9921",
    customer: "Acme Corp",
    amount: "₹12,500.00",
    status: "SUCCESS",
  },
  {
    id: "#TX-9920",
    customer: "Stark Industries",
    amount: "₹4,200.00",
    status: "FAILED",
  },
  {
    id: "#TX-9919",
    customer: "Wayne Ent.",
    amount: "₹85,000.00",
    status: "ANOMALY",
  },
  {
    id: "#TX-9918",
    customer: "Globex",
    amount: "₹1,150.00",
    status: "SUCCESS",
  },
];

export default function DashboardOverviewPage() {
  const [timeRange, setTimeRange] = React.useState<"7d" | "30d" | "90d">("30d");

  const activeChartData =
    timeRange === "7d"
      ? chartData7d
      : timeRange === "30d"
        ? chartData30d
        : chartData90d;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191c1d]">
            Overview
          </h2>
          <p className="text-sm text-[#444748] mt-1 font-normal">
            Real-time payment performance and anomalies.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 text-xs font-semibold text-[#191c1d] bg-white border-[#e9ecef] hover:bg-[#f3f4f5] shadow-xs cursor-pointer"
        >
          <Download className="h-4 w-4 text-[#444748]" />
          <span>Export Report</span>
        </Button>
      </div>

      {/* KPI 5-Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Revenue */}
        <div className="bg-white border border-[#e9ecef] rounded-lg p-4 hover:border-[#c4c7c7] transition-colors shadow-xs">
          <div className="text-xs font-semibold text-[#444748] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Total Revenue</span>
            <TrendingUp className="h-4 w-4 text-[#087343]" />
          </div>
          <div className="text-2xl font-bold text-[#191c1d] tracking-tight">
            ₹12,45,320.00
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[#087343] font-mono text-xs font-semibold bg-[#087343]/10 px-1.5 py-0.5 rounded">
              +8.4%
            </span>
            <span className="text-[11px] text-[#444748]">vs last 30d</span>
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white border border-[#e9ecef] rounded-lg p-4 hover:border-[#c4c7c7] transition-colors shadow-xs">
          <div className="text-xs font-semibold text-[#444748] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Success Rate</span>
            <CheckCircle className="h-4 w-4 text-[#444748]" />
          </div>
          <div className="text-2xl font-bold text-[#191c1d] tracking-tight">
            96.8%
          </div>
          <div className="mt-3 w-full bg-[#edeeef] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#087343] h-full rounded-full" style={{ width: "96.8%" }} />
          </div>
        </div>

        {/* Failed Payments */}
        <div className="bg-white border border-[#e9ecef] rounded-lg p-4 hover:border-[#c4c7c7] transition-colors shadow-xs">
          <div className="text-xs font-semibold text-[#444748] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Failed Payments</span>
            <AlertCircle className="h-4 w-4 text-[#c92a2a]" />
          </div>
          <div className="text-2xl font-bold text-[#191c1d] tracking-tight">
            ₹18,400
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[#c92a2a] font-mono text-xs font-semibold bg-[#c92a2a]/10 px-1.5 py-0.5 rounded">
              +1.2%
            </span>
            <span className="text-[11px] text-[#444748]">Requires attention</span>
          </div>
        </div>

        {/* Avg Transaction */}
        <div className="bg-white border border-[#e9ecef] rounded-lg p-4 hover:border-[#c4c7c7] transition-colors shadow-xs">
          <div className="text-xs font-semibold text-[#444748] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Avg Transaction</span>
            <Receipt className="h-4 w-4 text-[#444748]" />
          </div>
          <div className="text-2xl font-bold text-[#191c1d] tracking-tight">
            ₹4,250
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[#444748] font-mono text-xs font-medium">-</span>
            <span className="text-[11px] text-[#444748]">Stable</span>
          </div>
        </div>

        {/* Refunds */}
        <div className="bg-white border border-[#e9ecef] rounded-lg p-4 hover:border-[#c4c7c7] transition-colors shadow-xs">
          <div className="text-xs font-semibold text-[#444748] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Refunds</span>
            <RotateCcw className="h-4 w-4 text-[#444748]" />
          </div>
          <div className="text-2xl font-bold text-[#191c1d] tracking-tight">
            ₹2,100
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[#087343] font-mono text-xs font-semibold bg-[#087343]/10 px-1.5 py-0.5 rounded">
              -0.5%
            </span>
            <span className="text-[11px] text-[#444748]">vs last 30d</span>
          </div>
        </div>
      </div>

      {/* Main Grid: 8 Cols Left (Charts + Transactions) & 4 Cols Right (AI Insights + Methods) */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Section (8 Spans) */}
        <div className="col-span-12 xl:col-span-8 space-y-6">
          {/* Revenue Overview Card */}
          <div className="bg-white border border-[#e9ecef] rounded-lg p-6 flex flex-col shadow-xs">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-semibold text-[#191c1d]">
                Revenue Overview
              </h3>
              {/* Time Toggle Pills */}
              <div className="flex bg-[#f3f4f5] rounded-md p-1 border border-[#e9ecef]">
                <button
                  type="button"
                  onClick={() => setTimeRange("7d")}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                    timeRange === "7d"
                      ? "bg-white text-[#191c1d] shadow-xs font-bold"
                      : "text-[#444748] hover:text-[#191c1d]"
                  }`}
                >
                  7d
                </button>
                <button
                  type="button"
                  onClick={() => setTimeRange("30d")}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                    timeRange === "30d"
                      ? "bg-white text-[#191c1d] shadow-xs font-bold"
                      : "text-[#444748] hover:text-[#191c1d]"
                  }`}
                >
                  30d
                </button>
                <button
                  type="button"
                  onClick={() => setTimeRange("90d")}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                    timeRange === "90d"
                      ? "bg-white text-[#191c1d] shadow-xs font-bold"
                      : "text-[#444748] hover:text-[#191c1d]"
                  }`}
                >
                  90d
                </button>
              </div>
            </div>

            <div className="h-[280px] w-full bg-[#f1f3f5] rounded border border-[#e9ecef] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activeChartData}>
                  <defs>
                    <linearGradient id="stitchRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2a21d2" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2a21d2" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#747878"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#747878"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `₹${val >= 100000 ? `${(val / 100000).toFixed(1)}L` : `${val / 1000}k`}`}
                  />
                  <Tooltip
                    formatter={(val) => [`₹${Number(val).toLocaleString("en-IN")}`, "Revenue"]}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e9ecef",
                      borderRadius: "0.375rem",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                      fontSize: "12px",
                      fontFamily: "Inter, sans-serif",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2a21d2"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#stitchRevGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Transactions Card */}
          <div className="bg-white border border-[#e9ecef] rounded-lg overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#e9ecef] flex justify-between items-center">
              <h3 className="text-base font-semibold text-[#191c1d]">
                Recent Transactions
              </h3>
              <Link
                href="/dashboard/transactions"
                className="text-xs text-[#444748] hover:text-[#191c1d] font-medium flex items-center gap-1"
              >
                <span>View all</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f3f4f5] border-b border-[#e9ecef] text-xs text-[#444748] font-medium">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-[13px] divide-y divide-[#e9ecef]">
                  {recentTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className={
                        tx.status === "ANOMALY"
                          ? "bg-[#f0f0ff]/50 hover:bg-[#f0f0ff] transition-colors"
                          : "bg-white hover:bg-[#f3f4f5] transition-colors"
                      }
                    >
                      <td className={`px-4 py-3 ${tx.status === "ANOMALY" ? "text-[#2a21d2]" : "text-[#444748]"}`}>
                        {tx.id}
                      </td>
                      <td className="px-4 py-3 text-[#191c1d] font-sans font-medium text-[13px]">
                        {tx.customer}
                      </td>
                      <td className="px-4 py-3 text-[#191c1d] text-right font-semibold">
                        {tx.amount}
                      </td>
                      <td className="px-4 py-3 text-center font-sans">
                        {tx.status === "SUCCESS" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#087343]/10 text-[#087343] text-[11px] uppercase font-bold tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#087343]" /> Success
                          </span>
                        )}
                        {tx.status === "FAILED" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#c92a2a]/10 text-[#c92a2a] text-[11px] uppercase font-bold tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#c92a2a]" /> Failed
                          </span>
                        )}
                        {tx.status === "ANOMALY" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#2a21d2]/10 text-[#2a21d2] text-[11px] uppercase font-bold tracking-wider border border-[#2a21d2]/20">
                            <Bot className="h-3 w-3" /> Anomaly
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          title="Actions"
                          className="text-[#444748] hover:text-[#191c1d] p-1 rounded hover:bg-[#e7e8e9] transition-colors cursor-pointer"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Section (4 Spans) */}
        <div className="col-span-12 xl:col-span-4 space-y-6">
          {/* AI Revenue Insights Card */}
          <div className="bg-white border border-[#e9ecef] rounded-lg p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-6">
              <Bot className="h-5 w-5 text-[#2a21d2]" />
              <h3 className="text-base font-semibold text-[#191c1d]">
                AI Revenue Insights
              </h3>
            </div>

            <div className="space-y-4">
              {/* Insight 1: Anomaly */}
              <div className="bg-[#f3f4f5] border border-[#e9ecef] rounded-md p-4 hover:border-[#2a21d2]/50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#c92a2a]" />
                    <span className="text-xs font-bold text-[#444748] uppercase tracking-wider">
                      Anomaly Detected
                    </span>
                  </div>
                  <span className="text-[11px] text-[#444748]">2h ago</span>
                </div>
                <p className="text-sm text-[#191c1d] mb-3 leading-relaxed">
                  Payment failures increased by <span className="text-[#c92a2a] font-semibold">8.4%</span> on specific HDFC gateways.
                </p>
                <Link
                  href="/dashboard/anomalies"
                  className="text-[#2a21d2] font-semibold text-xs hover:underline inline-flex items-center gap-1"
                >
                  <span>View details</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Insight 2: Opportunity */}
              <div className="bg-[#f3f4f5] border border-[#e9ecef] rounded-md p-4 hover:border-[#2a21d2]/50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#087343]" />
                    <span className="text-xs font-bold text-[#444748] uppercase tracking-wider">
                      Opportunity
                    </span>
                  </div>
                  <span className="text-[11px] text-[#444748]">5h ago</span>
                </div>
                <p className="text-sm text-[#191c1d] mb-3 leading-relaxed">
                  Recoverable revenue detected: <span className="text-[#087343] font-semibold">₹42,500</span> via automated smart retries.
                </p>
                <Link
                  href="/dashboard/copilot"
                  className="text-[#2a21d2] font-semibold text-xs hover:underline inline-flex items-center gap-1"
                >
                  <span>Review strategy</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Revenue by Method Card */}
          <div className="bg-white border border-[#e9ecef] rounded-lg p-6 shadow-xs">
            <h3 className="text-base font-semibold text-[#191c1d] mb-4">
              Revenue by Method
            </h3>
            <ul className="space-y-3.5">
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-[#f3f4f5] rounded flex items-center justify-center text-[#444748]">
                    <QrCode className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-[#191c1d]">UPI</span>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-semibold text-[#191c1d]">64%</div>
                  <div className="w-24 h-1.5 bg-[#f3f4f5] rounded-full mt-1 overflow-hidden">
                    <div className="bg-[#000000] w-[64%] h-full rounded-full" />
                  </div>
                </div>
              </li>

              <li className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-[#f3f4f5] rounded flex items-center justify-center text-[#444748]">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-[#191c1d]">Cards</span>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-semibold text-[#191c1d]">22%</div>
                  <div className="w-24 h-1.5 bg-[#f3f4f5] rounded-full mt-1 overflow-hidden">
                    <div className="bg-[#5e5e5e] w-[22%] h-full rounded-full" />
                  </div>
                </div>
              </li>

              <li className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-[#f3f4f5] rounded flex items-center justify-center text-[#444748]">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-[#191c1d]">Net Banking</span>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-semibold text-[#191c1d]">14%</div>
                  <div className="w-24 h-1.5 bg-[#f3f4f5] rounded-full mt-1 overflow-hidden">
                    <div className="bg-[#c4c7c7] w-[14%] h-full rounded-full" />
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

