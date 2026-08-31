"use client";

import * as React from "react";
import {
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  CreditCard,
  Sparkles,
  Activity,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { RevenueChart, RevenueTimeseriesPoint } from "@/components/analytics/revenue-chart";
import { MethodDonutChart, MethodDonutItem } from "@/components/analytics/method-donut-chart";
import { VolumeBarChart, VolumeTimeseriesPoint } from "@/components/analytics/volume-bar-chart";

type TimeRangePreset = "7D" | "30D" | "90D" | "1Y";

interface OverviewData {
  grossRevenue: number;
  refundAmount: number;
  netRevenue: number;
  recoveredRevenue: number;
  revenueAtRisk: number;
  recoveryRate: number;
  recoveredCasesCount: number;
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
    recoveredRevenueGrowth?: number;
    volumeGrowth: number;
    successRateDelta: number;
  };
}

export default function AnalyticsPage() {
  const [preset, setPreset] = React.useState<TimeRangePreset>("30D");
  const [granularity, setGranularity] = React.useState<"day" | "week" | "month">("day");
  const [overview, setOverview] = React.useState<OverviewData | null>(null);
  const [timeseries, setTimeseries] = React.useState<RevenueTimeseriesPoint[]>([]);
  const [methods, setMethods] = React.useState<MethodDonutItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [recalculating, setRecalculating] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);

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
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#e9ecef] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191c1d]">
              Revenue & Financial Analytics
            </h2>
            <Badge variant="success">Real-Time</Badge>
          </div>
          <p className="text-sm text-[#444748] mt-1 font-normal">
            Server-side aggregations, revenue trends, method distribution, and daily metric rollups.
          </p>
        </div>

        {/* Controls: Preset Pills & Refresh */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Timeframe Presets */}
          <div className="flex items-center rounded-lg bg-[#f3f4f5] border border-[#e9ecef] p-1">
            {(["7D", "30D", "90D", "1Y"] as TimeRangePreset[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPreset(p)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                  preset === p
                    ? "bg-white text-[#191c1d] shadow-xs font-bold"
                    : "text-[#444748] hover:text-[#191c1d]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Granularity */}
          <div className="flex items-center rounded-lg bg-[#f3f4f5] border border-[#e9ecef] p-1">
            {(["day", "week", "month"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGranularity(g)}
                className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-all cursor-pointer ${
                  granularity === g
                    ? "bg-white text-[#191c1d] shadow-xs font-bold"
                    : "text-[#444748] hover:text-[#191c1d]"
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
            className="h-9 gap-1.5 text-xs text-[#191c1d] bg-white border-[#c4c7c7] hover:bg-[#f3f4f5] shadow-xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={handleTriggerRollup}
            disabled={recalculating}
            className="h-9 gap-1.5 text-xs bg-[#2a21d2] hover:bg-[#2a21d2]/90 text-white font-semibold shadow-xs cursor-pointer"
          >
            <Sparkles className={`h-3.5 w-3.5 ${recalculating ? "animate-spin" : ""}`} />
            <span>Recalculate Rollups</span>
          </Button>
        </div>
      </div>

      {/* KPI Overview Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Gross Revenue */}
        <div className="bg-white border border-[#e9ecef] rounded-lg p-4 hover:border-[#c4c7c7] transition-colors shadow-xs">
          <div className="text-xs font-semibold text-[#444748] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Gross Revenue</span>
            <TrendingUp className="h-4 w-4 text-[#2a21d2]" />
          </div>
          <div className="text-2xl font-bold text-[#191c1d] tracking-tight">
            {overview ? formatCurrency(overview.grossRevenue) : "₹0.00"}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            {(overview?.comparison?.grossRevenueGrowth || 0) >= 0 ? (
              <span className="text-[#087343] font-mono text-xs font-semibold bg-[#087343]/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <ArrowUpRight className="h-3 w-3" />
                {overview?.comparison?.grossRevenueGrowth || 0}%
              </span>
            ) : (
              <span className="text-[#c92a2a] font-mono text-xs font-semibold bg-[#c92a2a]/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <ArrowDownRight className="h-3 w-3" />
                {overview?.comparison?.grossRevenueGrowth || 0}%
              </span>
            )}
            <span className="text-[11px] text-[#444748]">vs prev period</span>
          </div>
        </div>

        {/* Net Revenue */}
        <div className="bg-white border border-[#e9ecef] rounded-lg p-4 hover:border-[#c4c7c7] transition-colors shadow-xs">
          <div className="text-xs font-semibold text-[#444748] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Net Revenue</span>
            <TrendingUp className="h-4 w-4 text-[#087343]" />
          </div>
          <div className="text-2xl font-bold text-[#191c1d] tracking-tight">
            {overview ? formatCurrency(overview.netRevenue) : "₹0.00"}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            {(overview?.comparison?.netRevenueGrowth || 0) >= 0 ? (
              <span className="text-[#087343] font-mono text-xs font-semibold bg-[#087343]/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <ArrowUpRight className="h-3 w-3" />
                {overview?.comparison?.netRevenueGrowth || 0}%
              </span>
            ) : (
              <span className="text-[#c92a2a] font-mono text-xs font-semibold bg-[#c92a2a]/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <ArrowDownRight className="h-3 w-3" />
                {overview?.comparison?.netRevenueGrowth || 0}%
              </span>
            )}
            <span className="text-[11px] text-[#444748]">gross - refunds</span>
          </div>
        </div>

        {/* Revenue Recovered */}
        <div className="bg-white border border-[#e9ecef] rounded-lg p-4 hover:border-[#c4c7c7] transition-colors shadow-xs">
          <div className="text-xs font-semibold text-[#444748] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Revenue Recovered</span>
            <ShieldCheck className="h-4 w-4 text-[#7c3aed]" />
          </div>
          <div className="text-2xl font-bold text-[#191c1d] tracking-tight">
            {overview ? formatCurrency(overview.recoveredRevenue) : "₹0.00"}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[#7c3aed] font-mono text-xs font-semibold bg-[#7c3aed]/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Sparkles className="h-3 w-3" />
              {overview?.recoveryRate || 0}%
            </span>
            <span className="text-[11px] text-[#444748]">{overview?.recoveredCasesCount || 0} cases recovered</span>
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white border border-[#e9ecef] rounded-lg p-4 hover:border-[#c4c7c7] transition-colors shadow-xs">
          <div className="text-xs font-semibold text-[#444748] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Success Rate</span>
            <Activity className="h-4 w-4 text-[#087343]" />
          </div>
          <div className="text-2xl font-bold text-[#191c1d] tracking-tight">
            {overview ? `${overview.successRate}%` : "0%"}
          </div>
          <div className="mt-3 w-full bg-[#edeeef] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#087343] h-full rounded-full"
              style={{ width: `${overview?.successRate || 0}%` }}
            />
          </div>
        </div>

        {/* Avg. Transaction Value */}
        <div className="bg-white border border-[#e9ecef] rounded-lg p-4 hover:border-[#c4c7c7] transition-colors shadow-xs">
          <div className="text-xs font-semibold text-[#444748] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Avg. Transaction</span>
            <CreditCard className="h-4 w-4 text-[#444748]" />
          </div>
          <div className="text-2xl font-bold text-[#191c1d] tracking-tight">
            {overview ? formatCurrency(overview.avgTransactionValue) : "₹0.00"}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[#444748] font-mono text-xs font-medium">-</span>
            <span className="text-[11px] text-[#444748]">per transaction</span>
          </div>
        </div>
      </div>

      {/* Main Timeseries Revenue Chart Card */}
      <div className="bg-white border border-[#e9ecef] rounded-lg p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e9ecef] pb-4">
          <div>
            <h3 className="text-base font-semibold text-[#191c1d]">
              Revenue & Recovery Timeline
            </h3>
            <p className="text-xs text-[#444748] mt-0.5 font-normal">
              Daily double-entry ledger totals across Gross Revenue, Net Revenue, and AI Recovered Revenue
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-[#2a21d2] font-semibold">
              <span className="h-2 w-2 rounded-full bg-[#2a21d2]" />
              Gross
            </span>
            <span className="flex items-center gap-1.5 text-[#087343] font-semibold">
              <span className="h-2 w-2 rounded-full bg-[#087343]" />
              Net
            </span>
            <span className="flex items-center gap-1.5 text-[#7c3aed] font-semibold">
              <span className="h-2 w-2 rounded-full bg-[#7c3aed]" />
              Recovered
            </span>
          </div>
        </div>

        <div className="pt-2">
          <RevenueChart data={timeseries} height={320} />
        </div>
      </div>

      {/* Two Column Grid: Volume Breakdown & Method Share */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stacked Daily Transaction Volume */}
        <div className="bg-white border border-[#e9ecef] rounded-lg p-6 shadow-xs space-y-4">
          <div className="border-b border-[#e9ecef] pb-3">
            <h3 className="text-base font-semibold text-[#191c1d]">
              Payment Volume & Breakdown
            </h3>
            <p className="text-xs text-[#444748] mt-0.5 font-normal">
              Successful vs failed transaction counts over the selected period
            </p>
          </div>
          <VolumeBarChart data={timeseries as unknown as VolumeTimeseriesPoint[]} height={280} />
        </div>

        {/* Payment Method Volume Share Donut */}
        <div className="bg-white border border-[#e9ecef] rounded-lg p-6 shadow-xs space-y-4">
          <div className="border-b border-[#e9ecef] pb-3">
            <h3 className="text-base font-semibold text-[#191c1d]">
              Payment Method Distribution
            </h3>
            <p className="text-xs text-[#444748] mt-0.5 font-normal">
              Volume split and share percentage by payment rail
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
            <div className="w-full sm:w-1/2">
              <MethodDonutChart data={methods} height={220} />
            </div>
            <div className="w-full sm:w-1/2 space-y-2.5">
              {methods.map((item, idx) => (
                <div key={item.method} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          ["#2a21d2", "#087343", "#000000", "#5e5e5e", "#f59e0b", "#0284c7"][
                            idx % 6
                          ],
                      }}
                    />
                    <span className="font-medium text-[#191c1d] uppercase">
                      {item.method}
                    </span>
                  </div>
                  <div className="font-mono font-semibold text-[#191c1d]">
                    {item.percentageShare}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method Performance Table Card */}
      <div className="bg-white border border-[#e9ecef] rounded-lg overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#e9ecef] flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-[#191c1d]">
              Payment Method Breakdown & Conversion
            </h3>
            <p className="text-xs text-[#444748] mt-0.5 font-normal">
              Individual channel throughput and authorization reliability
            </p>
          </div>
        </div>

        {methods.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#747878] font-mono">
            No payment method data recorded in this timeframe
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#f3f4f5] text-[#444748] border-b border-[#e9ecef] font-medium">
                <tr>
                  <th className="py-3.5 px-6">Payment Method</th>
                  <th className="py-3.5 px-6">Transactions</th>
                  <th className="py-3.5 px-6">Processed Volume</th>
                  <th className="py-3.5 px-6">Market Share</th>
                  <th className="py-3.5 px-6 text-right">Success Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9ecef]">
                {methods.map((item) => (
                  <tr key={item.method} className="hover:bg-[#f3f4f5]/60 transition-colors">
                    <td className="py-4 px-6 font-semibold text-[#191c1d] uppercase tracking-wider">
                      {item.method}
                    </td>
                    <td className="py-4 px-6 font-mono text-[#444748]">
                      {item.count.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-[#191c1d]">
                      {formatCurrency(item.volume)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 rounded-full bg-[#e1e3e4] overflow-hidden">
                          <div
                            className="h-full bg-[#2a21d2] rounded-full"
                            style={{ width: `${item.percentageShare}%` }}
                          />
                        </div>
                        <span className="font-mono text-[#444748] text-xs font-semibold">
                          {item.percentageShare}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
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
      </div>
    </div>
  );
}

