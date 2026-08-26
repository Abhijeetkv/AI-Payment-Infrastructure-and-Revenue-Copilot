"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Zap,
  Activity,
  ArrowUpRight,
  Sparkles,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ResolveDialog } from "@/components/anomalies/resolve-dialog";

interface AnomalyItem {
  id: string;
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  metric: string;
  currentValue: number;
  baselineValue: number;
  deviation: number;
  description: string;
  isResolved: boolean;
  resolvedAt: string | null;
  detectedAt: string;
}

interface AnomalySummary {
  healthScore: number;
  activeCount: number;
  criticalCount: number;
  highCount: number;
  resolvedCount: number;
  totalCount: number;
  status: "HEALTHY" | "DEGRADED" | "CRITICAL_ATTENTION";
}

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = React.useState<AnomalyItem[]>([]);
  const [summary, setSummary] = React.useState<AnomalySummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [scanning, setScanning] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "ACTIVE" | "CRITICAL" | "RESOLVED">("ACTIVE");
  const [search, setSearch] = React.useState("");
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Resolution Dialog state
  const [resolvingAnomaly, setResolvingAnomaly] = React.useState<AnomalyItem | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams();
    params.set("summary", "true");
    params.set("limit", "50");

    if (statusFilter === "ACTIVE") params.set("isResolved", "false");
    else if (statusFilter === "RESOLVED") params.set("isResolved", "true");
    else if (statusFilter === "CRITICAL") {
      params.set("severity", "CRITICAL");
      params.set("isResolved", "false");
    }

    fetch(`/api/anomalies?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (json.success) {
          setAnomalies(json.data || []);
          if (json.summary) setSummary(json.summary);
        }
      })
      .catch((err) => {
        console.error("Failed to load anomalies:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [statusFilter, refreshKey]);

  const handleRefresh = () => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  };

  const handleTriggerScan = async () => {
    try {
      setScanning(true);
      await fetch("/api/anomalies", { method: "POST" });
      handleRefresh();
    } catch (err) {
      console.error("Failed to run anomaly scan:", err);
    } finally {
      setScanning(false);
    }
  };

  const filteredAnomalies = React.useMemo(() => {
    if (!search.trim()) return anomalies;
    const q = search.toLowerCase();
    return anomalies.filter(
      (a) =>
        a.type.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.metric.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q)
    );
  }, [anomalies, search]);

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "CRITICAL":
        return (
          <Badge
            variant="destructive"
            className="gap-1 font-mono text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/40 animate-pulse"
          >
            <AlertCircle className="h-3 w-3" />
            <span>CRITICAL</span>
          </Badge>
        );
      case "HIGH":
        return (
          <Badge
            variant="warning"
            className="gap-1 font-mono text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/40"
          >
            <AlertTriangle className="h-3 w-3" />
            <span>HIGH</span>
          </Badge>
        );
      case "MEDIUM":
        return (
          <Badge
            variant="default"
            className="gap-1 font-mono text-[11px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/40"
          >
            <Activity className="h-3 w-3" />
            <span>MEDIUM</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[11px] text-zinc-400">
            LOW
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Statistical Anomaly Detection
            </h1>
            <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
              Phase 7 Active
            </Badge>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            7-day rolling moving average baselines, z-score deviation scoring, and automated failure spike alerts.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
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
            onClick={handleTriggerScan}
            disabled={scanning}
            className="h-8 gap-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-md shadow-rose-950/30"
          >
            <Zap className={`h-3.5 w-3.5 ${scanning ? "animate-spin" : ""}`} />
            <span>Run Telemetry Scan</span>
          </Button>
        </div>
      </div>

      {/* Health Score & Summary Banner */}
      {summary && (
        <div
          className={`p-5 rounded-2xl border transition-all ${
            summary.status === "HEALTHY"
              ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-100"
              : summary.status === "DEGRADED"
              ? "bg-amber-950/20 border-amber-500/30 text-amber-100"
              : "bg-rose-950/30 border-rose-500/40 text-rose-100"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`h-11 w-11 rounded-2xl flex items-center justify-center ${
                  summary.status === "HEALTHY"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : summary.status === "DEGRADED"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-rose-500/20 text-rose-400"
                }`}
              >
                {summary.status === "HEALTHY" ? (
                  <ShieldCheck className="h-6 w-6" />
                ) : (
                  <AlertTriangle className="h-6 w-6" />
                )}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    System Health: {summary.status.replace("_", " ")}
                  </h3>
                  <Badge
                    variant={summary.status === "HEALTHY" ? "success" : "destructive"}
                    className="text-[10px]"
                  >
                    Score {summary.healthScore}/100
                  </Badge>
                </div>
                <p className="text-xs text-zinc-400">
                  {summary.activeCount === 0
                    ? "All gateway telemetry within normal 7-day statistical bounds (z < 1.4)."
                    : `${summary.activeCount} open telemetry deviation(s) detected (${summary.criticalCount} Critical, ${summary.highCount} High).`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/dashboard/copilot?q=Analyze%20recent%20payment%20anomalies%20and%20failure%20spikes">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 bg-zinc-900/80 border-zinc-700 text-indigo-300 hover:text-white"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Ask Copilot to Diagnose</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Anomalies"
          value={summary ? String(summary.activeCount) : "0"}
          icon={AlertTriangle}
          variant={summary && summary.activeCount > 0 ? "danger" : "success"}
          description="Awaiting resolution"
        />

        <MetricCard
          title="Critical Severity"
          value={summary ? String(summary.criticalCount) : "0"}
          icon={AlertCircle}
          variant="danger"
          description="z-score ≥ 3.5 or fail ≥ 50%"
        />

        <MetricCard
          title="High Severity Alerts"
          value={summary ? String(summary.highCount) : "0"}
          icon={Activity}
          variant="warning"
          description="z-score ≥ 2.5 standard deviations"
        />

        <MetricCard
          title="Resolved Incidents"
          value={summary ? String(summary.resolvedCount) : "0"}
          icon={CheckCircle2}
          variant="indigo"
          description="Mitigated or closed"
        />
      </div>

      {/* Main Anomalies Card */}
      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardHeader className="p-4 border-b border-zinc-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Search by anomaly type, metric, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs bg-zinc-900 border-zinc-800 text-zinc-100"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
              {(["ALL", "ACTIVE", "CRITICAL", "RESOLVED"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    statusFilter === tab
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading && anomalies.length === 0 ? (
            <div className="p-16 text-center text-xs text-zinc-400">Loading anomalies telemetry...</div>
          ) : filteredAnomalies.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-200">No anomalies detected</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  All telemetry is operating within expected 7-day statistical bounds.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTriggerScan}
                disabled={scanning}
                className="text-xs gap-1.5 text-zinc-300"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Run Test Scan</span>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/80">
              {filteredAnomalies.map((item) => (
                <div
                  key={item.id}
                  className="p-5 hover:bg-zinc-800/30 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-2.5 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {getSeverityBadge(item.severity)}

                      <span className="font-bold text-sm text-zinc-100 uppercase tracking-wide">
                        {item.type.replace("_", " ")}
                      </span>

                      {item.deviation !== 0 && (
                        <span
                          className={`font-mono text-xs px-2 py-0.5 rounded-full font-bold ${
                            item.deviation > 0
                              ? "bg-rose-950/60 text-rose-400 border border-rose-800/60"
                              : "bg-amber-950/60 text-amber-400 border border-amber-800/60"
                          }`}
                        >
                          {item.deviation > 0 ? `+${item.deviation}%` : `${item.deviation}%`} vs baseline
                        </span>
                      )}

                      {item.isResolved && (
                        <Badge variant="success" className="text-[10px]">
                          RESOLVED
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {item.description}
                    </p>

                    {/* Metric Comparison Tags */}
                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono pt-1">
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <span>Observed Value:</span>
                        <span className="font-bold text-rose-400">{item.currentValue}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <span>7D Baseline:</span>
                        <span className="font-semibold text-zinc-300">{item.baselineValue}</span>
                      </div>
                      <div className="text-zinc-500 text-[11px]">
                        Detected {new Date(item.detectedAt).toLocaleString("en-IN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!item.isResolved ? (
                      <Button
                        size="sm"
                        onClick={() => setResolvingAnomaly(item)}
                        className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Resolve</span>
                      </Button>
                    ) : (
                      <span className="text-xs text-zinc-500 font-mono">
                        Resolved {item.resolvedAt ? new Date(item.resolvedAt).toLocaleDateString() : ""}
                      </span>
                    )}

                    <Link
                      href={`/dashboard/copilot?q=Explain%20anomaly%20${item.type}%20detected%20on%20${item.metric}%20with%20deviation%20${item.deviation}%25`}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1 text-indigo-400 border-indigo-500/30 hover:bg-indigo-950/30"
                      >
                        <span>Investigate</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolve Incident Dialog */}
      {resolvingAnomaly && (
        <ResolveDialog
          isOpen={!!resolvingAnomaly}
          onClose={() => setResolvingAnomaly(null)}
          anomalyId={resolvingAnomaly.id}
          anomalyType={resolvingAnomaly.type}
          severity={resolvingAnomaly.severity}
          onResolveSuccess={() => {
            handleRefresh();
          }}
        />
      )}
    </div>
  );
}
