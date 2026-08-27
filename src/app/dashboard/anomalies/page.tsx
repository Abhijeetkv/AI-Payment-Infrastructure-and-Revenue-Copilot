"use client";

import * as React from "react";
import {
  TrendingDown,
  TrendingUp,
  RotateCcw,
  Bot,
  Filter,
  Download,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnomalyCardData {
  id: string;
  type: "failure_spike" | "card_testing" | "refund_surge";
  title: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  timeAgo: string;
  whatHappened: string;
  impactText: string;
  impactColor?: string;
  copilotAnalysis: string;
  primaryActionLabel: string;
  secondaryActionLabel?: string;
  primaryActionStyle: "blue" | "gray";
}

const mockAnomalies: AnomalyCardData[] = [
  {
    id: "anom_1",
    type: "failure_spike",
    title: "Unusual payment failure spike",
    severity: "HIGH",
    timeAgo: "12m ago",
    whatHappened: "Failure rate across EU gateways spiked to 14.2% (baseline 1.8%).",
    impactText: "₹18,400 at risk",
    impactColor: "text-red-700 font-semibold font-mono",
    copilotAnalysis:
      "Pattern matches known timeouts from Acquirer Bank 'Stripe-EU-1'. Suggest immediate fallback routing.",
    primaryActionLabel: "Route to Fallback",
    secondaryActionLabel: "View Logs",
    primaryActionStyle: "blue",
  },
  {
    id: "anom_2",
    type: "card_testing",
    title: "Abnormal transaction pattern",
    severity: "MEDIUM",
    timeAgo: "1h ago",
    whatHappened: "Multiple micro-transactions (₹1.00) originating from similar IP subnets.",
    impactText: "High authorization volume",
    impactColor: "text-[#191c1d] font-semibold font-mono",
    copilotAnalysis:
      "Potential card testing attack. 85% confidence. Recommend enforcing stricter rate limits on suspicious IP blocks.",
    primaryActionLabel: "Apply Rate Limits",
    secondaryActionLabel: "Dismiss",
    primaryActionStyle: "gray",
  },
  {
    id: "anom_3",
    type: "refund_surge",
    title: "Unexpected refund increase",
    severity: "LOW",
    timeAgo: "4h ago",
    whatHappened: "Refund volume for 'Product Tier B' increased by 25% DoD.",
    impactText: "Minor revenue variance",
    impactColor: "text-[#191c1d] font-semibold font-mono",
    copilotAnalysis:
      "Likely correlates with a recent marketing campaign offering a trial period. No immediate technical intervention required.",
    primaryActionLabel: "Acknowledge",
    primaryActionStyle: "gray",
  },
];

export default function AnomaliesPage() {
  const [anomalies] = React.useState<AnomalyCardData[]>(mockAnomalies);
  const [resolvedIds, setResolvedIds] = React.useState<string[]>([]);
  const [actionSuccessMsg, setActionSuccessMsg] = React.useState<string | null>(null);

  const handleAction = (id: string, actionName: string) => {
    setResolvedIds((prev) => [...prev, id]);
    setActionSuccessMsg(`Action '${actionName}' executed successfully.`);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-[#e9ecef] pb-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191c1d]">
            Detected Anomalies
          </h2>
          <p className="text-sm text-[#444748] mt-1 font-normal">
            AI has identified 3 active irregularities requiring attention.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 text-xs font-medium text-[#191c1d] bg-white border-[#c4c7c7] hover:bg-[#f3f4f5] shadow-xs cursor-pointer"
          >
            <Filter className="h-4 w-4 text-[#444748]" />
            <span>Filter</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 text-xs font-medium text-[#191c1d] bg-white border-[#c4c7c7] hover:bg-[#f3f4f5] shadow-xs cursor-pointer"
          >
            <Download className="h-4 w-4 text-[#444748]" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-3.5 rounded-lg bg-[#087343]/10 border border-[#087343]/20 text-[#087343] text-xs flex items-center gap-2 animate-in fade-in font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#087343]" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* 2-Column Grid of Anomaly Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {anomalies.map((item) => {
          const isResolved = resolvedIds.includes(item.id);

          const severityClass =
            item.severity === "HIGH"
              ? "severity-high"
              : item.severity === "MEDIUM"
                ? "severity-medium"
                : "severity-low";

          return (
            <div
              key={item.id}
              className={`rounded-xl border p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all duration-300 ${severityClass} ${
                isResolved ? "opacity-60 bg-[#f8f9fa]" : "bg-white"
              }`}
            >
              {/* Header: Icon + Title + Severity Badge + Time */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  {/* Severity Icon Box */}
                  {item.severity === "HIGH" && (
                    <div className="w-10 h-10 rounded bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                      <TrendingDown className="h-5 w-5" />
                    </div>
                  )}
                  {item.severity === "MEDIUM" && (
                    <div className="w-10 h-10 rounded bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                  )}
                  {item.severity === "LOW" && (
                    <div className="w-10 h-10 rounded bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                      <RotateCcw className="h-5 w-5" />
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-semibold text-[#191c1d]">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {item.severity === "HIGH" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600" /> HIGH
                        </span>
                      )}
                      {item.severity === "MEDIUM" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> MEDIUM
                        </span>
                      )}
                      {item.severity === "LOW" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> LOW
                        </span>
                      )}

                      <span className="text-xs text-[#444748] flex items-center gap-1 font-normal">
                        <Clock className="h-3.5 w-3.5 text-[#747878]" /> {item.timeAgo}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* What Happened & Impact */}
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <p className="text-[11px] font-bold text-[#444748] uppercase tracking-wider mb-1">
                    What Happened
                  </p>
                  <p className="text-sm text-[#191c1d] leading-relaxed">
                    {item.whatHappened}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#444748] uppercase tracking-wider mb-1">
                    Impact
                  </p>
                  <p className={`text-sm ${item.impactColor || "text-[#191c1d] font-semibold"}`}>
                    {item.impactText}
                  </p>
                </div>
              </div>

              {/* AI Copilot Analysis Box */}
              <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-4 mt-2 ai-glow">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                    AI Copilot Analysis
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {item.copilotAnalysis}
                </p>
              </div>

              {/* Action Buttons Row */}
              <div className="mt-auto pt-4 flex items-center gap-3">
                {item.primaryActionStyle === "blue" ? (
                  <button
                    type="button"
                    disabled={isResolved}
                    onClick={() => handleAction(item.id, item.primaryActionLabel)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold py-2.5 px-4 rounded transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    {item.primaryActionLabel}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isResolved}
                    onClick={() => handleAction(item.id, item.primaryActionLabel)}
                    className="flex-1 bg-[#e1e3e4] border border-[#c4c7c7] hover:bg-gray-300 disabled:opacity-50 text-[#191c1d] text-xs font-semibold py-2.5 px-4 rounded transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {item.primaryActionLabel}
                  </button>
                )}

                {item.secondaryActionLabel && (
                  <button
                    type="button"
                    disabled={isResolved}
                    onClick={() => handleAction(item.id, item.secondaryActionLabel!)}
                    className="px-4 py-2.5 border border-[#c4c7c7] text-[#191c1d] text-xs font-medium rounded hover:bg-[#edeeef] disabled:opacity-50 transition-colors bg-white cursor-pointer"
                  >
                    {item.secondaryActionLabel}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
