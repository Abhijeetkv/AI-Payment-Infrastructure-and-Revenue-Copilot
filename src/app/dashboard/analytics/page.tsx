"use client";

import * as React from "react";
import {
  TrendingUp,
  RotateCcw,
  RefreshCw,
  Layers,
  CreditCard,
  DollarSign,
  Activity,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/dashboard/metric-card";
import { formatCurrency } from "@/lib/utils";
import { RevenueChart, RevenueTimeseriesPoint } from "@/components/analytics/revenue-chart";
import { MethodDonutChart, MethodDonutItem } from "@/components/analytics/method-donut-chart";
import { VolumeBarChart, VolumeTimeseriesPoint } from "@/components/analytics/volume-bar-chart";

type TimeRangePreset = "7D" | "30D" | "90D" | "1Y";

interface OverviewData {
  grossRevenue: number;
  refundAmount: number;
  netRevenue: number;
  totalTransactions: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
  partiallyRefundedPayments: number;
  refundedPayments: number;
  successRate: number;
  failureRate: number;
  refundRate: number;
  avgTransactionValue: number;
  comparison?: {
    grossRevenueGrowth: number;
    netRevenueGrowth: number;
    volumeGrowth: number;
    successRateDelta: number;
  };
}

export default function AnalyticsPage() {
  const [preset, setPreset] = React.useState<TimeRangePreset>("30D");
  const [granularity, setGranularity] = React.useState<"day" | "week" | "month">("day");
  const [overview, setOverview] = React.useState<OverviewData | null>(null);
  const [timeseries, setTimeseries] = React.useState<RevenueTimeseriesPoint[]>([]);
  const [volumeSeries, setVolumeSeries] = React.useState<VolumeTimeseriesPoint[]>([]);
  const [methods, setMethods] = React.useState<MethodDonutItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [recalculating, setRecalculating] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Compute start/end dates from preset
  const { startDate, endDate } = React.useMemo(() => {
    const end = new Date();
    const start = new Date();
    if (preset === "7D") start.setDate(end.getDate() - 7);
    else if (preset === "30D") start.setDate(end.getDate() - 30);
    else if (preset === "90D") start.setDate(end.getDate() - 90);
    else if (preset === "1Y") start.setFullYear(end.getFullYear() - 1);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }, [preset]);

  React.useEffect(() => {
    let isMounted = true;

    async function loadAnalytics() {
      try {
        const [overviewRes, timeseriesRes, methodsRes] = await Promise.all([
          fetch(`/api/analytics/overview?startDate=${startDate}&endDate=${endDate}`),
          fetch(`/api/analytics/timeseries?startDate=${startDate}&endDate=${endDate}&granularity=${granularity}`),
          fetch(`/api/analytics/breakdown?startDate=${startDate}&endDate=${endDate}`),
        ]);

        const [overviewJson, timeseriesJson, methodsJson] = await Promise.all([
          overviewRes.json(),
          timeseriesRes.json(),
          methodsRes.json(),
        ]);

        if (isMounted) {
          if (overviewJson.success) setOverview(overviewJson.data);
          if (timeseriesJson.success) {
            setTimeseries(timeseriesJson.data);
            setVolumeSeries(timeseriesJson.data);
          }
          if (methodsJson.success) setMethods(methodsJson.data);
        }
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, [startDate, endDate, granularity, refreshKey]);

  const handleRefresh = () => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  };

  const handleTriggerRollup = async () => {
    try {
      setRecalculating(true);
      await fetch("/api/analytics/rollup", { method: "POST" });
      handleRefresh();
    } catch (err) {
      console.error("Rollup trigger failed:", err);
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Revenue & Payment Analytics
            </h1>
            <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
              Phase 6 Engine
            </Badge>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Server-side PostgreSQL aggregations, revenue trends, method distribution, and daily metric rollups.
          </p>
        </div>

        {/* Controls: Preset Pills & Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Presets */}
          <div className="flex items-center rounded-xl bg-zinc-900 border border-zinc-800 p-1">
            {(["7D", "30D", "90D", "1Y"] as TimeRangePreset[]).map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  preset === p
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Granularity */}
          <div className="flex items-center rounded-xl bg-zinc-900 border border-zinc-800 p-1">
            {(["day", "week", "month"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  granularity === g
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="h-8 gap-1.5 text-xs text-zinc-300 border-zinc-800 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={handleTriggerRollup}
            disabled={recalculating}
            className="h-8 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
          >
            <Sparkles className={`h-3.5 w-3.5 ${recalculating ? "animate-spin" : ""}`} />
            <span>Recalculate Rollups</span>
          </Button>
        </div>
      </div>

      {/* KPI Overview Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Gross Revenue"
          value={overview ? formatCurrency(overview.grossRevenue) : "₹0.00"}
          change={{
            value: overview?.comparison?.grossRevenueGrowth || 0,
            trend: (overview?.comparison?.grossRevenueGrowth || 0) >= 0 ? "up" : "down",
            label: "vs prev period",
          }}
          icon={DollarSign}
          variant="indigo"
          description="Total credited volume"
        />

        <MetricCard
          title="Net Revenue"
          value={overview ? formatCurrency(overview.netRevenue) : "₹0.00"}
          change={{
            value: overview?.comparison?.netRevenueGrowth || 0,
            trend: (overview?.comparison?.netRevenueGrowth || 0) >= 0 ? "up" : "down",
            label: "vs prev period",
          }}
          icon={TrendingUp}
          variant="success"
          description="Gross minus refunds"
        />

        <MetricCard
          title="Refunded Volume"
          value={overview ? formatCurrency(overview.refundAmount) : "₹0.00"}
          change={{
            value: overview?.refundRate || 0,
            trend: "neutral",
            label: "refund rate",
          }}
          icon={RotateCcw}
          variant="danger"
          description="Debited from ledger"
        />

        <MetricCard
          title="Payment Success Rate"
          value={overview ? `${overview.successRate}%` : "0%"}
          change={{
            value: overview?.comparison?.successRateDelta || 0,
            trend: (overview?.comparison?.successRateDelta || 0) >= 0 ? "up" : "down",
            label: "pts vs prev",
          }}
          icon={Activity}
          variant="warning"
          description="Successful / Total payments"
        />

        <MetricCard
          title="Avg. Transaction Value"
          value={overview ? formatCurrency(overview.avgTransactionValue) : "₹0.00"}
          icon={CreditCard}
          variant="default"
          description="Average per payment"
        />
      </div>

      {/* Main Timeseries Revenue Chart */}
      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardHeader className="p-4 border-b border-zinc-800 flex flex-row items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-semibold text-zinc-100">
              Revenue & Refund Timeline
            </CardTitle>
            <p className="text-xs text-zinc-400">
              Daily double-entry ledger totals across Gross Revenue, Net Revenue, and Refunds
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-indigo-400">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              Gross
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Net
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              Refunds
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <RevenueChart data={timeseries} height={300} />
        </CardContent>
      </Card>

      {/* Two Column Grid: Volume Breakdown & Method Share */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stacked Daily Transaction Volume */}
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardHeader className="p-4 border-b border-zinc-800">
            <CardTitle className="text-base font-semibold text-zinc-100">
              Daily Payment Volume & Success/Failures
            </CardTitle>
            <p className="text-xs text-zinc-400">
              Stacked distribution of successful vs failed transactions
            </p>
          </CardHeader>
          <CardContent className="p-4">
            <VolumeBarChart data={volumeSeries} height={260} />
          </CardContent>
        </Card>

        {/* Payment Method Distribution Donut */}
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardHeader className="p-4 border-b border-zinc-800">
            <CardTitle className="text-base font-semibold text-zinc-100">
              Payment Method Market Share
            </CardTitle>
            <p className="text-xs text-zinc-400">
              Volume split between UPI, Cards, Netbanking, and Wallets
            </p>
          </CardHeader>
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <MethodDonutChart data={methods} height={260} />
          </CardContent>
        </Card>
      </div>

      {/* Payment Method Performance Table */}
      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardHeader className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-400" />
            <CardTitle className="text-base font-semibold text-zinc-100">
              Payment Method Breakdown & Conversion
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {methods.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              No payment method data recorded in this timeframe
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800 font-medium">
                  <tr>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Transactions</th>
                    <th className="py-3 px-4">Processed Volume</th>
                    <th className="py-3 px-4">Market Share</th>
                    <th className="py-3 px-4 text-right">Success Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {methods.map((item) => (
                    <tr key={item.method} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-zinc-200 uppercase tracking-wider">
                        {item.method}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-zinc-300">
                        {item.count.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {formatCurrency(item.volume)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${item.percentageShare}%` }}
                            />
                          </div>
                          <span className="font-mono text-zinc-400 text-[11px]">
                            {item.percentageShare}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Badge
                          variant={item.successRate >= 80 ? "success" : item.successRate >= 50 ? "warning" : "destructive"}
                          className="font-mono text-[11px]"
                        >
                          {item.successRate}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
