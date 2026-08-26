"use client";

import Link from "next/link";
import {
  IndianRupee,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertTriangle,
  Bot,
  ArrowRight,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ChartContainer } from "@/components/dashboard/chart-container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const demoTrendData = [
  { date: "May 01", revenue: 42000, failed: 3 },
  { date: "May 05", revenue: 58000, failed: 2 },
  { date: "May 10", revenue: 51000, failed: 5 },
  { date: "May 15", revenue: 89000, failed: 1 },
  { date: "May 20", revenue: 76000, failed: 4 },
  { date: "May 25", revenue: 112000, failed: 2 },
  { date: "May 30", revenue: 135000, failed: 1 },
];

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-zinc-950 p-6 md:p-8 border border-indigo-900/40 text-white shadow-xl shadow-indigo-950/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                <Sparkles className="h-3 w-3 mr-1" />
                Phase 1 Live
              </Badge>
              <span className="text-xs text-zinc-400 font-mono">Infrastructure Ready</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              AI Payment Infrastructure & Revenue Copilot
            </h1>
            <p className="text-zinc-300 text-sm max-w-2xl leading-relaxed">
              Safe, idempotent payment orchestration powered by Razorpay Test Mode,
              real-time failure resolution, background Inngest event pipelines, and natural-language AI intelligence.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/dashboard/copilot">
              <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white gap-2 shadow-lg shadow-indigo-500/25">
                <Bot className="h-4 w-4" />
                <span>Ask AI Copilot</span>
              </Button>
            </Link>
            <Link href="/dashboard/orders">
              <Button variant="outline" className="border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-white">
                Manage Orders
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          title="Gross Revenue"
          value="₹1,35,000"
          icon={IndianRupee}
          variant="indigo"
          change={{ value: 14.2, trend: "up", label: "vs last week" }}
        />
        <MetricCard
          title="Net Revenue"
          value="₹1,28,400"
          icon={TrendingUp}
          variant="success"
          change={{ value: 12.8, trend: "up", label: "after refunds" }}
        />
        <MetricCard
          title="Success Rate"
          value="96.4%"
          icon={CheckCircle2}
          variant="success"
          change={{ value: 1.1, trend: "up", label: "healthy" }}
        />
        <MetricCard
          title="Failed Rate"
          value="3.6%"
          icon={XCircle}
          variant="warning"
          change={{ value: -0.4, trend: "down", label: "decreasing" }}
        />
        <MetricCard
          title="Total Refunds"
          value="₹6,600"
          icon={RotateCcw}
          variant="danger"
          description="3 refunds processed"
        />
        <MetricCard
          title="Active Anomalies"
          value="0"
          icon={AlertTriangle}
          variant="default"
          description="System nominal"
        />
      </div>

      {/* Charts & Visual Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartContainer
          title="Revenue Velocity"
          description="Real-time transaction inflow across Razorpay test methods"
          className="lg:col-span-2"
          action={
            <Link href="/dashboard/analytics">
              <Button variant="ghost" size="sm" className="text-xs gap-1 text-indigo-600 dark:text-indigo-400">
                Detailed Analytics <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          }
        >
          <div className="h-[280px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={demoTrendData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} opacity={0.3} />
                <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val / 1000}k`}
                />
                <Tooltip
                  formatter={(val) => [`₹${Number(val).toLocaleString("en-IN")}`, "Revenue"]}
                  contentStyle={{
                    backgroundColor: "#09090b",
                    borderColor: "#27272a",
                    borderRadius: "0.5rem",
                    color: "#fafafa",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartContainer>

        {/* Quick Diagnostic / Feature Status */}
        <Card className="flex flex-col justify-between">
          <CardContent className="p-6 space-y-5">
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Operational Modules
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Architecture and reliability components
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Prisma & 14 Data Models</span>
                <Badge variant="success">Initialized</Badge>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Better Auth & Sessions</span>
                <Badge variant="success">Configured</Badge>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Inngest Event Bus & API</span>
                <Badge variant="success">Ready</Badge>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Redis Lock & Idempotency</span>
                <Badge variant="success">Singleton Active</Badge>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Razorpay Test Mode SDK</span>
                <Badge variant="success">Protected</Badge>
              </div>
            </div>

            <div className="pt-2">
              <Link href="/dashboard/simulator">
                <Button variant="secondary" size="sm" className="w-full text-xs font-medium">
                  Run Failure Simulator
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
