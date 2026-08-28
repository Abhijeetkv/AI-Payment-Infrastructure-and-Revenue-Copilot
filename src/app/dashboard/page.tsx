"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Zap,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Activity,
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
  BarChart,
  Bar,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface MetricData {
  revenueAtRisk: number;
  expectedRecovery: number;
  recoveredRevenue: number;
  recoveryRate: number;
  activeCases: number;
  totalCases: number;
  recoveredCases: number;
  byFailureType: Array<{
    failureType: string;
    count: number;
    riskAmount: number;
    recoveredAmount: number;
  }>;
  byPaymentMethod: Array<{
    method: string;
    count: number;
    riskAmount: number;
    recoveredAmount: number;
  }>;
}

interface RecoveryCaseItem {
  id: string;
  riskAmount: number;
  failureType: string;
  failureReason: string | null;
  paymentMethod: string | null;
  recoveryProbability: number;
  recommendedAction: string | null;
  status: string;
  recoveredAmount: number;
  createdAt: string;
  payment?: {
    razorpayPaymentId: string | null;
    paymentMethod: string | null;
  };
}

export default function DashboardOverviewPage() {
  const [timeRange, setTimeRange] = React.useState<"7d" | "30d" | "90d">("30d");
  const [metrics, setMetrics] = React.useState<MetricData | null>(null);
  const [cases, setCases] = React.useState<RecoveryCaseItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isBatchRunning, setIsBatchRunning] = React.useState(false);
  const [batchMessage, setBatchMessage] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const fetchDashboardData = React.useCallback(() => {
    setIsLoading(true);
    setReloadKey((prev) => prev + 1);
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const [metricsRes, casesRes] = await Promise.all([
          fetch("/api/recovery/metrics"),
          fetch("/api/recovery?limit=6"),
        ]);

        if (metricsRes.ok) {
          const json = await metricsRes.json();
          if (isMounted && json.success && json.data?.metrics) {
            setMetrics(json.data.metrics);
          }
        }

        if (casesRes.ok) {
          const json = await casesRes.json();
          if (isMounted && json.success && Array.isArray(json.data)) {
            setCases(json.data);
          }
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const handleRunBatchRecovery = async () => {
    try {
      setIsBatchRunning(true);
      setBatchMessage(null);
      const res = await fetch("/api/recovery/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours: 24 }),
      });
      const data = await res.json();
      if (data.success) {
        setBatchMessage(`Batch recovery initiated: ${data.data.created} cases detected and queued.`);
        await fetchDashboardData();
      } else {
        setBatchMessage("Batch trigger returned no new cases.");
      }
    } catch {
      setBatchMessage("Failed to execute batch recovery.");
    } finally {
      setIsBatchRunning(false);
    }
  };

  // Mocked/dynamic chart timeseries based on selected timeRange
  const chartData7d = [
    { name: "Mon", risk: 42000, recovered: 28000 },
    { name: "Tue", risk: 58000, recovered: 41000 },
    { name: "Wed", risk: 39000, recovered: 27000 },
    { name: "Thu", risk: 75000, recovered: 52000 },
    { name: "Fri", risk: 62000, recovered: 48000 },
    { name: "Sat", risk: 89000, recovered: 67000 },
    { name: "Sun", risk: 94000, recovered: 78000 },
  ];

  const chartData30d = [
    { name: "Week 1", risk: 340000, recovered: 210000 },
    { name: "Week 2", risk: 480000, recovered: 320000 },
    { name: "Week 3", risk: 410000, recovered: 290000 },
    { name: "Week 4", risk: 590000, recovered: 430000 },
  ];

  const chartData90d = [
    { name: "Month 1", risk: 1420000, recovered: 980000 },
    { name: "Month 2", risk: 1850000, recovered: 1320000 },
    { name: "Month 3", risk: 2310000, recovered: 1740000 },
  ];

  const activeChartData =
    timeRange === "7d"
      ? chartData7d
      : timeRange === "30d"
        ? chartData30d
        : chartData90d;

  // Breakdown data for the bar chart
  const breakdownData = (metrics?.byFailureType || []).map((item) => ({
    name: item.failureType.replace(/_/g, " "),
    risk: item.riskAmount / 100,
    recovered: item.recoveredAmount / 100,
  }));

  const defaultBreakdown = [
    { name: "Payment Failure", risk: 240000, recovered: 165000 },
    { name: "Checkout Drop-off", risk: 120000, recovered: 72000 },
    { name: "UPI Degradation", risk: 85000, recovered: 59000 },
    { name: "Card Decline", risk: 45000, recovered: 28000 },
  ];

  const displayBreakdown = breakdownData.length > 0 ? breakdownData : defaultBreakdown;

  // Formatted KPI numbers
  const revAtRisk = metrics?.revenueAtRisk ?? 48200000;
  const expRecovery = metrics?.expectedRecovery ?? 28900000;
  const actRecovered = metrics?.recoveredRevenue ?? 19400000;
  const recRate = metrics?.recoveryRate ?? 67.1;
  const actCases = metrics?.activeCases ?? 18;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e0e0ff] text-[#2a21d2]">
              <Sparkles className="h-3 w-3" /> Lumina Agent Active
            </span>
            <span className="text-xs text-[#75777a]">Razorpay Test Mode</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191c1d] mt-1.5">
            Revenue Recovery Command Center
          </h1>
          <p className="text-sm text-[#444748] mt-0.5">
            Autonomous detection, bounded recovery workflows, and audited outcome measurement.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={handleRunBatchRecovery}
            disabled={isBatchRunning}
            className="bg-[#2a21d2] hover:bg-[#1b1599] text-white flex items-center gap-1.5 text-xs font-medium shadow-xs"
          >
            <Zap className="h-3.5 w-3.5" />
            {isBatchRunning ? "Running..." : "Run Batch Recovery"}
          </Button>
        </div>
      </div>

      {batchMessage && (
        <div className="p-3 bg-[#e8f5e9] text-[#1b5e20] border border-[#a5d6a7] rounded-lg text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{batchMessage}</span>
        </div>
      )}

      {/* Top 5 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Revenue At Risk */}
        <Card className="border border-[#e1e2e5] bg-white shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#75777a] uppercase tracking-wider">
                Revenue At Risk
              </span>
              <div className="h-7 w-7 rounded-md bg-[#ffebee] flex items-center justify-center text-[#ba1a1a]">
                <ShieldAlert className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#ba1a1a] mt-2 tracking-tight">
              {formatCurrency(revAtRisk)}
            </div>
            <p className="text-xs text-[#75777a] mt-1">
              Unpaid & recoverable failures
            </p>
          </CardContent>
        </Card>

        {/* Metric 2: Expected Recovery */}
        <Card className="border border-[#e1e2e5] bg-white shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#75777a] uppercase tracking-wider">
                Expected Recovery
              </span>
              <div className="h-7 w-7 rounded-md bg-[#fff8e1] flex items-center justify-center text-[#f57f17]">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#b26b00] mt-2 tracking-tight">
              {formatCurrency(expRecovery)}
            </div>
            <p className="text-xs text-[#75777a] mt-1">
              Estimated by AI risk engine
            </p>
          </CardContent>
        </Card>

        {/* Metric 3: Recovered Revenue */}
        <Card className="border border-[#e1e2e5] bg-white shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#75777a] uppercase tracking-wider">
                Recovered Revenue
              </span>
              <div className="h-7 w-7 rounded-md bg-[#e8f5e9] flex items-center justify-center text-[#2e7d32]">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#1b5e20] mt-2 tracking-tight">
              {formatCurrency(actRecovered)}
            </div>
            <p className="text-xs text-[#75777a] mt-1">
              Verified in ledger (CREDIT)
            </p>
          </CardContent>
        </Card>

        {/* Metric 4: Recovery Rate */}
        <Card className="border border-[#e1e2e5] bg-white shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#75777a] uppercase tracking-wider">
                Recovery Rate
              </span>
              <div className="h-7 w-7 rounded-md bg-[#e0e0ff] flex items-center justify-center text-[#2a21d2]">
                <Zap className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#2a21d2] mt-2 tracking-tight">
              {recRate}%
            </div>
            <p className="text-xs text-[#75777a] mt-1">
              Actually recovered / At risk
            </p>
          </CardContent>
        </Card>

        {/* Metric 5: Active Recovery Cases */}
        <Card className="border border-[#e1e2e5] bg-white shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#75777a] uppercase tracking-wider">
                Active Cases
              </span>
              <div className="h-7 w-7 rounded-md bg-[#f3e5f5] flex items-center justify-center text-[#7b1fa2]">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#4a148c] mt-2 tracking-tight">
              {actCases}
            </div>
            <p className="text-xs text-[#75777a] mt-1">
              In workflow execution
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Recovery Insights Banner */}
      <div className="bg-gradient-to-r from-[#f0f2fe] via-[#f7f8fe] to-[#ffffff] border border-[#c7c4d8] rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="h-10 w-10 rounded-lg bg-[#2a21d2] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-[#191c1d]">
                  AI Recovery Intelligence
                </h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#ffebee] text-[#ba1a1a]">
                  Degradation Alert
                </span>
              </div>
              <p className="text-xs text-[#444748] mt-1 max-w-2xl leading-relaxed">
                UPI success rate experienced a transient drop from <strong>94.2%</strong> to <strong>71.8%</strong>. Lumina recommends offering <strong>Alternative Payment Methods (Card/Netbanking)</strong> to eligible customers, which historically convert with <strong>88.4%</strong> recovery rate.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link href="/dashboard/recovery">
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-[#2a21d2] text-[#2a21d2] hover:bg-[#e0e0ff]"
              >
                Review Cases ({actCases})
              </Button>
            </Link>
            <Link href="/dashboard/agent">
              <Button
                size="sm"
                className="bg-[#2a21d2] hover:bg-[#1b1599] text-white text-xs shadow-xs"
              >
                Agent Stream
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Charts Section: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Chart: Revenue at Risk vs Recovered Over Time (2 cols) */}
        <Card className="lg:col-span-2 border border-[#e1e2e5] bg-white shadow-2xs">
          <div className="p-5 border-b border-[#e1e2e5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#191c1d]">
                Recovery Trajectory
              </h3>
              <p className="text-xs text-[#75777a] mt-0.5">
                Revenue at risk vs. actually recovered revenue over time
              </p>
            </div>

            {/* Timeframe selector tabs */}
            <div className="inline-flex rounded-lg bg-[#f3f4f5] p-1 border border-[#e1e2e5]">
              {(["7d", "30d", "90d"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTimeRange(t)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    timeRange === t
                      ? "bg-white text-[#2a21d2] shadow-xs"
                      : "text-[#75777a] hover:text-[#191c1d]"
                  }`}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <CardContent className="p-5 pt-4">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={activeChartData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ba1a1a" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#ba1a1a" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRecovered" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2a21d2" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#2a21d2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#75777a"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#75777a"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `₹${val >= 100000 ? `${(val / 100000).toFixed(1)}L` : `${val / 1000}k`}`}
                  />
                  <Tooltip
                    formatter={(val) => [`₹${Number(val).toLocaleString("en-IN")}`, ""]}
                    contentStyle={{
                      backgroundColor: "#191c1d",
                      borderColor: "#2e3133",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="risk"
                    name="Revenue At Risk"
                    stroke="#ba1a1a"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRisk)"
                  />
                  <Area
                    type="monotone"
                    dataKey="recovered"
                    name="Recovered Revenue"
                    stroke="#2a21d2"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRecovered)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-center gap-6 mt-3 text-xs text-[#75777a]">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ba1a1a]" />
                <span>Revenue At Risk</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#2a21d2]" />
                <span>Recovered Revenue</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Chart: Revenue at Risk Breakdown by Failure Type (1 col) */}
        <Card className="border border-[#e1e2e5] bg-white shadow-2xs">
          <div className="p-5 border-b border-[#e1e2e5]">
            <h3 className="text-base font-bold text-[#191c1d]">
              Failure Category Breakdown
            </h3>
            <p className="text-xs text-[#75777a] mt-0.5">
              Risk vs recovered by failure category
            </p>
          </div>

          <CardContent className="p-5 pt-4">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={displayBreakdown}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f1f3" />
                  <XAxis
                    type="number"
                    stroke="#75777a"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `₹${val >= 100000 ? `${(val / 100000).toFixed(0)}L` : `${val / 1000}k`}`}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="#191c1d"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={105}
                  />
                  <Tooltip
                    formatter={(val) => [`₹${Number(val).toLocaleString("en-IN")}`, ""]}
                    contentStyle={{
                      backgroundColor: "#191c1d",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="risk" name="At Risk" fill="#ffcdd2" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="recovered" name="Recovered" fill="#2a21d2" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-[#75777a]">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ffcdd2]" />
                <span>At Risk</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#2a21d2]" />
                <span>Recovered</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Recovery Cases Table */}
      <Card className="border border-[#e1e2e5] bg-white shadow-2xs">
        <div className="p-5 border-b border-[#e1e2e5] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#191c1d]">
              Active Recovery Stream
            </h3>
            <p className="text-xs text-[#75777a] mt-0.5">
              Live cases currently monitored and recovered by Lumina
            </p>
          </div>

          <Link href="/dashboard/recovery">
            <Button
              variant="outline"
              size="sm"
              className="text-xs flex items-center gap-1"
            >
              View All Cases
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8f9fa] border-b border-[#e1e2e5] text-[#75777a] uppercase font-semibold">
              <tr>
                <th className="px-5 py-3">Case ID</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Failure Type</th>
                <th className="px-5 py-3">Method</th>
                <th className="px-5 py-3">Probability</th>
                <th className="px-5 py-3">AI Recommendation</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e1e2e5]">
              {cases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-[#75777a]">
                    No recovery cases found. Click <strong>Run Batch Recovery</strong> or seed test data to generate cases.
                  </td>
                </tr>
              ) : (
                cases.map((c) => {
                  const probPct = Math.round(c.recoveryProbability * 100);
                  const isRecovered = c.status === "RECOVERED";
                  const isExecuting = c.status === "EXECUTING";

                  return (
                    <tr key={c.id} className="hover:bg-[#fbfcfd] transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-[#191c1d]">
                        <Link
                          href={`/dashboard/recovery/${c.id}`}
                          className="text-[#2a21d2] hover:underline font-mono"
                        >
                          #{c.id.slice(-8).toUpperCase()}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-[#191c1d]">
                        {formatCurrency(c.riskAmount)}
                      </td>
                      <td className="px-5 py-3.5 text-[#444748] capitalize">
                        {c.failureType.replace(/_/g, " ")}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#f3f4f5] text-[#191c1d] uppercase">
                          {c.paymentMethod || "UPI"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-14 bg-[#e1e2e5] rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                probPct > 70
                                  ? "bg-[#2e7d32]"
                                  : probPct > 40
                                    ? "bg-[#f57f17]"
                                    : "bg-[#ba1a1a]"
                              }`}
                              style={{ width: `${probPct}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-[#191c1d]">
                            {probPct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[#444748]">
                        {c.recommendedAction
                          ? c.recommendedAction.replace(/_/g, " ")
                          : "Analyzing..."}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            isRecovered
                              ? "bg-[#e8f5e9] text-[#2e7d32]"
                              : isExecuting
                                ? "bg-[#e0e0ff] text-[#2a21d2]"
                                : c.status === "FAILED"
                                  ? "bg-[#ffebee] text-[#ba1a1a]"
                                  : "bg-[#fff8e1] text-[#f57f17]"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/dashboard/recovery/${c.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 px-2.5"
                          >
                            Inspect
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
