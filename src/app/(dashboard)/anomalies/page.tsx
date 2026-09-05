"use client";

import * as React from "react";
import Link from "next/link";
import {
  TrendingDown,
  TrendingUp,
  RotateCcw,
  Bot,
  Filter,
  Download,
  Clock,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  RefreshCw,
  Zap,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface AnomalyItem {
  id: string;
  type: string;
  title: string;
  severity: "HIGH" | "MEDIUM" | "LOW" | "CRITICAL";
  whatHappened: string;
  revenueAtRiskPaise: number;
  affectedPaymentsCount: number;
  potentiallyRecoverablePaise: number;
  recoveredRevenuePaise: number;
  policyGate: string;
  recoveryStatus:
    | "Detected"
    | "Investigating"
    | "Recovery Recommended"
    | "Recovery Running"
    | "Recovery Completed"
    | "Recovery Failed"
    | "Recovery Blocked"
    | "Resolved"
    | "Dismissed";
  aiAnalysis: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  secondaryActionLabel?: string;
  isResolved: boolean;
  resolvedAt: string | null;
  detectedAt: string;
}

function formatTimeAgo(dateStr: string) {
  const diffMs = Math.max(0, Date.now() - new Date(dateStr).getTime());
  const mins = Math.floor(diffMs / (1000 * 60));
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = React.useState<AnomalyItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isScanning, setIsScanning] = React.useState(false);
  const [severityFilter, setSeverityFilter] = React.useState<string>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [actionSuccessMsg, setActionSuccessMsg] = React.useState<string | null>(null);
  const [dismissingId, setDismissingId] = React.useState<string | null>(null);
  const [reloadCounter, setReloadCounter] = React.useState(0);

  // 1. Fetch live anomalies from DB
  React.useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/anomalies?summary=true");
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.success && Array.isArray(json.data)) {
            setAnomalies(json.data);
          }
        }
      } catch (err) {
        console.error("Failed to load anomalies:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [reloadCounter]);

  // 2. Trigger on-demand anomaly detection scan
  const handleRunScan = async () => {
    try {
      setIsScanning(true);
      const res = await fetch("/api/anomalies", { method: "POST" });
      if (res.ok) {
        setActionSuccessMsg("Deterministic anomaly scan completed.");
        setTimeout(() => setActionSuccessMsg(null), 3500);
        setReloadCounter((c) => c + 1);
      }
    } catch (err) {
      console.error("Scan error:", err);
    } finally {
      setIsScanning(false);
    }
  };

  // 3. Dismiss anomaly with database persistence and audit log
  const handleDismiss = async (id: string) => {
    try {
      setDismissingId(id);
      const res = await fetch(`/api/anomalies/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "Dismissed by operator from anomalies dashboard" }),
      });

      if (res.ok) {
        setAnomalies((prev) =>
          prev.map((a) => (a.id === id ? { ...a, isResolved: true, recoveryStatus: "Resolved" } : a))
        );
        setActionSuccessMsg("Anomaly dismissed and recorded in audit log.");
        setTimeout(() => setActionSuccessMsg(null), 3500);
      }
    } catch (err) {
      console.error("Dismiss error:", err);
    } finally {
      setDismissingId(null);
    }
  };

  // 4. Export genuine anomaly data as CSV
  const handleExportCSV = () => {
    if (anomalies.length === 0) return;

    const headers = [
      "ID",
      "Type",
      "Severity",
      "Title",
      "Revenue At Risk (INR)",
      "Potentially Recoverable (INR)",
      "Affected Count",
      "Policy Gate",
      "Status",
      "Detected At",
    ];

    const rows = anomalies.map((a) => [
      a.id,
      a.type,
      a.severity,
      `"${a.title.replace(/"/g, '""')}"`,
      (a.revenueAtRiskPaise / 100).toFixed(2),
      (a.potentiallyRecoverablePaise / 100).toFixed(2),
      a.affectedPaymentsCount,
      `"${a.policyGate.replace(/"/g, '""')}"`,
      a.recoveryStatus,
      new Date(a.detectedAt).toISOString(),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `lumina_anomalies_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered dataset
  const filteredAnomalies = anomalies.filter((a) => {
    if (severityFilter !== "ALL" && a.severity !== severityFilter) return false;
    if (statusFilter === "ACTIVE" && a.isResolved) return false;
    if (statusFilter === "RESOLVED" && !a.isResolved) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-[#e9ecef] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-[#e0e0ff] text-[#2a21d2]">
              <Zap className="h-3 w-3" /> Revenue-Risk Telemetry
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191c1d] mt-1">
            Detected Anomalies
          </h1>
          <p className="text-sm text-[#444748] mt-0.5 font-normal">
            Deterministic failure &amp; revenue-risk detection feeding the autonomous recovery workflow.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Severity Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-[#c4c7c7] rounded-lg px-2.5 py-1 text-xs">
            <Filter className="h-3.5 w-3.5 text-[#444748]" />
            <select
              value={severityFilter}
              aria-label="Filter by Severity"
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-medium text-[#191c1d] focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All Severities</option>
              <option value="HIGH">High Severity</option>
              <option value="MEDIUM">Medium Severity</option>
              <option value="LOW">Low Severity</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-[#c4c7c7] rounded-lg px-2.5 py-1 text-xs">
            <select
              value={statusFilter}
              aria-label="Filter by Status"
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-medium text-[#191c1d] focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Alerts</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          {/* Run Scan Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunScan}
            disabled={isScanning}
            className="h-9 gap-1.5 text-xs font-medium text-[#191c1d] bg-white border-[#c4c7c7] hover:bg-[#f3f4f5] shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? "animate-spin" : ""}`} />
            <span>Scan Telemetry</span>
          </Button>

          {/* Export CSV Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={anomalies.length === 0}
            className="h-9 gap-1.5 text-xs font-medium text-[#191c1d] bg-white border-[#c4c7c7] hover:bg-[#f3f4f5] shadow-2xs cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-[#444748]" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {actionSuccessMsg && (
        <div className="p-3.5 rounded-lg bg-[#e8f5e9] border border-[#c8e6c9] text-[#2e7d32] text-xs flex items-center gap-2 animate-in fade-in font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2e7d32]" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Anomaly Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-[#75777a] text-sm">
          Loading revenue-risk telemetry...
        </div>
      ) : filteredAnomalies.length === 0 ? (
        <div className="p-12 text-center bg-[#f8f9fa] rounded-xl border border-dashed border-[#c7c4d8]">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
          <h3 className="text-base font-bold text-[#191c1d]">No Matching Anomalies</h3>
          <p className="text-xs text-[#75777a] mt-1">
            All transaction and revenue metrics are currently operating within expected 7-day statistical baselines.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
          {filteredAnomalies.map((item) => {
            const isResolved = item.isResolved;

            return (
              <div
                key={item.id}
                className={`rounded-xl border p-6 flex flex-col justify-between gap-4 shadow-xs hover:shadow-md transition-all duration-200 h-full ${
                  isResolved ? "opacity-60 bg-[#f8f9fa] border-[#e1e2e5]" : "bg-white border-[#c7c4d8]"
                }`}
              >
                <div className="space-y-4 flex-1">
                  {/* Header: Icon + Title + Severity Badge + Timestamp */}
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3">
                      {/* Severity Icon Box */}
                      {item.severity === "HIGH" || item.severity === "CRITICAL" ? (
                        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                          <TrendingDown className="h-5 w-5" />
                        </div>
                      ) : item.severity === "MEDIUM" ? (
                        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                          <TrendingUp className="h-5 w-5" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                          <RotateCcw className="h-5 w-5" />
                        </div>
                      )}

                      <div>
                        <h3 className="text-base font-bold text-[#191c1d]">
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          {item.severity === "HIGH" || item.severity === "CRITICAL" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600" /> HIGH
                            </span>
                          ) : item.severity === "MEDIUM" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> MEDIUM
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> LOW
                            </span>
                          )}

                          <span className="text-xs text-[#444748] flex items-center gap-1 font-normal">
                            <Clock className="h-3.5 w-3.5 text-[#747878]" /> {formatTimeAgo(item.detectedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 1. What Happened */}
                  <div>
                    <p className="text-[11px] font-bold text-[#444748] uppercase tracking-wider mb-1">
                      What Happened
                    </p>
                    <p className="text-xs text-[#191c1d] leading-relaxed sm:min-h-[36px]">
                      {item.whatHappened}
                    </p>
                  </div>

                  {/* 2. Expanded Financial Impact (3 Columns) */}
                  <div className="grid grid-cols-3 gap-3 bg-[#fafafa] p-3 rounded-lg border border-[#e1e2e5]">
                    <div>
                      <p className="text-[10px] font-bold text-[#75777a] uppercase tracking-wider">
                        Revenue at Risk
                      </p>
                      <p className="text-sm font-bold text-red-700 font-mono mt-0.5">
                        {formatCurrency(item.revenueAtRiskPaise)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-[#75777a] uppercase tracking-wider">
                        Affected Payments
                      </p>
                      <p className="text-sm font-bold text-[#191c1d] font-mono mt-0.5">
                        {item.affectedPaymentsCount} failures
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-[#75777a] uppercase tracking-wider">
                        {item.recoveredRevenuePaise > 0 ? "Recovered Revenue" : "Potentially Recoverable"}
                      </p>
                      <p className="text-sm font-bold text-[#2e7d32] font-mono mt-0.5">
                        {item.recoveredRevenuePaise > 0
                          ? formatCurrency(item.recoveredRevenuePaise)
                          : item.potentiallyRecoverablePaise > 0
                          ? formatCurrency(item.potentiallyRecoverablePaise)
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {/* 3. Advisory AI Analysis Box (Never empty) */}
                  <div className="bg-[#e0e0ff]/30 border border-[#c7c4d8] rounded-lg p-3.5 sm:min-h-[64px]">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Bot className="h-4 w-4 text-[#2a21d2]" />
                      <span className="text-xs font-bold text-[#2a21d2] uppercase tracking-wider">
                        AI Analysis &amp; Recommendation
                      </span>
                    </div>
                    <p className="text-xs text-[#444748] leading-relaxed">
                      {item.aiAnalysis || "Analysis pending: Telemetry ingestion in progress. Recommended action: inspect active recovery cases."}
                    </p>
                  </div>

                  {/* 4. Policy Gate vs Recovery Status Strip */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-[#444748]">
                      <ShieldCheck className="h-4 w-4 text-[#2e7d32] shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold text-[#75777a] uppercase block">Policy Gate</span>
                        <span className="font-semibold text-[#191c1d]">{item.policyGate}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-[#444748]">
                      <ShieldAlert
                        className={`h-4 w-4 shrink-0 ${
                          item.recoveryStatus === "Recovery Completed"
                            ? "text-[#2e7d32]"
                            : item.recoveryStatus === "Recovery Running"
                            ? "text-[#2a21d2]"
                            : item.recoveryStatus === "Recovery Recommended"
                            ? "text-[#f57f17]"
                            : "text-[#75777a]"
                        }`}
                      />
                      <div>
                        <span className="text-[10px] font-bold text-[#75777a] uppercase block">Recovery Status</span>
                        <span
                          className={`font-semibold ${
                            item.recoveryStatus === "Recovery Completed"
                              ? "text-[#2e7d32]"
                              : item.recoveryStatus === "Recovery Running"
                              ? "text-[#2a21d2]"
                              : item.recoveryStatus === "Recovery Recommended"
                              ? "text-[#f57f17]"
                              : "text-[#191c1d]"
                          }`}
                        >
                          {item.recoveryStatus === "Recovery Completed"
                            ? "✓ Recovery Completed"
                            : `● ${item.recoveryStatus}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Action Buttons Row */}
                <div className="pt-3 border-t border-[#e1e2e5] flex items-center justify-between gap-3 mt-auto">
                  <Link href={item.primaryActionHref} className="flex-1">
                    <Button
                      size="sm"
                      className="w-full bg-[#2a21d2] hover:bg-[#1b1599] text-white text-xs font-medium shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer h-9"
                    >
                      <span>{item.primaryActionLabel}</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>

                  {isResolved ? (
                    <Link href="/agent">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-[#c4c7c7] text-[#444748] hover:bg-[#f3f4f5] text-xs font-medium h-9 px-3 cursor-pointer flex items-center gap-1.5"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>View Logs</span>
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={dismissingId === item.id}
                      onClick={() => handleDismiss(item.id)}
                      className="border-[#c4c7c7] text-[#444748] hover:bg-[#f3f4f5] text-xs font-medium h-9 px-3 cursor-pointer"
                    >
                      {dismissingId === item.id ? "Dismissing..." : "Dismiss"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
