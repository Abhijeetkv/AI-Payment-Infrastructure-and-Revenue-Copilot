"use client";

import * as React from "react";
import Link from "next/link";
import {
  Zap,
  Sparkles,
  Play,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  RefreshCw,
  Check,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface HighValueCase {
  id: string;
  riskAmount: number;
  failureType: string;
  failureReason: string | null;
  paymentMethod: string | null;
  recommendedAction: string | null;
  status: string;
  createdAt: string;
  payment?: {
    id: string;
    amount: number;
    status: string;
    paymentMethod: string | null;
    failureReason: string | null;
  } | null;
  order?: {
    id: string;
    receipt: string | null;
    notes: unknown;
  } | null;
}

export default function CampaignsPage() {
  // Independent running state per campaign
  const [runningCampaign, setRunningCampaign] = React.useState<
    "24_HOUR_RECOVERY" | "7_DAY_SWEEP" | "HIGH_VALUE_REVIEW" | null
  >(null);

  // Unified batch result card (displayed as previous)
  const [result, setResult] = React.useState<{
    batchId: string;
    campaignType: string;
    created: number;
    skipped: number;
    timeframeHours?: number;
  } | null>(null);

  const [highValueData, setHighValueData] = React.useState<{
    threshold: number;
    thresholdRupees: number;
    count: number;
    cases: HighValueCase[];
  } | null>(null);

  const [approvingCaseId, setApprovingCaseId] = React.useState<string | null>(null);
  const [approvedCases, setApprovedCases] = React.useState<Record<string, boolean>>({});

  // 1. Run 24-Hour Recovery Campaign ONLY
  const handleRun24hCampaign = async () => {
    try {
      setRunningCampaign("24_HOUR_RECOVERY");
      setResult(null);
      setHighValueData(null);

      const res = await fetch("/api/recovery/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignType: "24_HOUR_RECOVERY", hours: 24 }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setResult({
          batchId: json.data.batchId,
          campaignType: "24-Hour Recovery",
          created: json.data.created ?? 0,
          skipped: json.data.skipped ?? 0,
          timeframeHours: 24,
        });
      }
    } catch (err) {
      console.error("24-Hour campaign execution failed:", err);
    } finally {
      setRunningCampaign(null);
    }
  };

  // 2. Run 7-Day Sweep Campaign ONLY
  const handleRun7dSweep = async () => {
    try {
      setRunningCampaign("7_DAY_SWEEP");
      setResult(null);
      setHighValueData(null);

      const res = await fetch("/api/recovery/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignType: "7_DAY_SWEEP", hours: 168 }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setResult({
          batchId: json.data.batchId,
          campaignType: "7-Day Sweep",
          created: json.data.created ?? 0,
          skipped: json.data.skipped ?? 0,
          timeframeHours: 168,
        });
      }
    } catch (err) {
      console.error("7-Day sweep execution failed:", err);
    } finally {
      setRunningCampaign(null);
    }
  };

  // 3. Run High-Value Review ONLY (Read-Only Scan)
  const handleReviewHighValue = async () => {
    try {
      setRunningCampaign("HIGH_VALUE_REVIEW");
      setResult(null);

      const res = await fetch("/api/recovery/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignType: "HIGH_VALUE_REVIEW" }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setHighValueData({
          threshold: json.data.threshold || 5000000,
          thresholdRupees: json.data.thresholdRupees || 50000,
          count: json.data.count || 0,
          cases: json.data.cases || [],
        });
      }
    } catch (err) {
      console.error("High-value review scan failed:", err);
    } finally {
      setRunningCampaign(null);
    }
  };

  const handleApproveCase = async (caseItem: HighValueCase) => {
    try {
      setApprovingCaseId(caseItem.id);
      const actionType = caseItem.recommendedAction || "PAYMENT_RETRY";

      const res = await fetch(`/api/recovery/${caseItem.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType,
          isMerchantApproved: true,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setApprovedCases((prev) => ({ ...prev, [caseItem.id]: true }));
      } else {
        alert(json.error || "Approval failed. Please inspect case details.");
      }
    } catch (err) {
      console.error("Approval error:", err);
    } finally {
      setApprovingCaseId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-[#e0e0ff] text-[#2a21d2]">
            <Sparkles className="h-3 w-3" /> Autonomous Batch Processing
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#191c1d] mt-1">
          Recovery Campaigns
        </h1>
        <p className="text-xs text-[#75777a] mt-0.5">
          Execute automated batch scanning and durable Inngest recovery across failed payment cohorts.
        </p>
      </div>

      {/* Campaign Launcher Cards: 3 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {/* Campaign Option 1: Last 24 Hours */}
        <Card className="border border-[#e1e2e5] bg-white shadow-2xs hover:border-[#2a21d2] transition-colors flex flex-col h-full">
          <CardContent className="p-6 flex flex-col flex-1 justify-between gap-4">
            <div className="space-y-4 flex-1">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-lg bg-[#e0e0ff] text-[#2a21d2] flex items-center justify-center">
                  <Zap className="h-5 w-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-[#e8f5e9] text-[#2e7d32]">
                  Recommended
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-[#191c1d] sm:min-h-[48px] flex items-center">
                  Recover Failed Payments — Last 24 Hours
                </h3>
                <p className="text-xs text-[#75777a] sm:min-h-[36px]">
                  Scans all failed transactions from the last 24 hours, constructs AI recovery cases, and queues durable execution.
                </p>
              </div>
            </div>

            <div className="pt-2 mt-auto">
              <Button
                onClick={handleRun24hCampaign}
                disabled={runningCampaign === "24_HOUR_RECOVERY"}
                className="w-full bg-[#2a21d2] hover:bg-[#1b1599] text-white text-xs font-medium shadow-xs flex items-center justify-center gap-2 cursor-pointer h-10"
              >
                <Play className="h-3.5 w-3.5" />
                {runningCampaign === "24_HOUR_RECOVERY" ? "Running Campaign..." : "Run 24-Hour Recovery Campaign"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Campaign Option 2: Last 7 Days (Deep Sweep) */}
        <Card className="border border-[#e1e2e5] bg-white shadow-2xs hover:border-[#2a21d2] transition-colors flex flex-col h-full">
          <CardContent className="p-6 flex flex-col flex-1 justify-between gap-4">
            <div className="space-y-4 flex-1">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-lg bg-[#fff8e1] text-[#f57f17] flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-[#f3f4f5] text-[#75777a]">
                  Deep Sweep
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-[#191c1d] sm:min-h-[48px] flex items-center">
                  Weekly Revenue Sweep — Last 7 Days
                </h3>
                <p className="text-xs text-[#75777a] sm:min-h-[36px]">
                  Comprehensive sweep across the past 7 days of unresolved checkout failures and method degradations.
                </p>
              </div>
            </div>

            <div className="pt-2 mt-auto">
              <Button
                variant="outline"
                onClick={handleRun7dSweep}
                disabled={runningCampaign === "7_DAY_SWEEP"}
                className="w-full border-[#2a21d2] text-[#2a21d2] hover:bg-[#e0e0ff] text-xs font-medium flex items-center justify-center gap-2 cursor-pointer h-10"
              >
                <Play className="h-3.5 w-3.5" />
                {runningCampaign === "7_DAY_SWEEP" ? "Running Sweep..." : "Run 7-Day Sweep Campaign"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Campaign Option 3: High-Value Recovery Review */}
        <Card className="border border-[#e1e2e5] bg-white shadow-2xs hover:border-[#2a21d2] transition-colors flex flex-col h-full">
          <CardContent className="p-6 flex flex-col flex-1 justify-between gap-4">
            <div className="space-y-4 flex-1">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-lg bg-[#fce4ec] text-[#c2185b] flex items-center justify-center">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-[#fce4ec] text-[#c2185b]">
                  Approval Required
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-[#191c1d] sm:min-h-[48px] flex items-center">
                  High-Value Recovery Review
                </h3>
                <p className="text-xs text-[#75777a] sm:min-h-[36px]">
                  Review high-value failed payments that require additional validation and merchant approval before recovery.
                </p>
              </div>
            </div>

            <div className="pt-2 mt-auto">
              <Button
                variant="outline"
                onClick={handleReviewHighValue}
                disabled={runningCampaign === "HIGH_VALUE_REVIEW"}
                className="w-full border-[#c2185b] text-[#c2185b] hover:bg-[#fce4ec] text-xs font-medium flex items-center justify-center gap-2 cursor-pointer h-10"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                {runningCampaign === "HIGH_VALUE_REVIEW" ? "Scanning High-Value..." : "Review High-Value Cases"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Classic Batch Result Card (shown as previous) */}
      {result && (
        <Card className="border border-[#a5d6a7] bg-[#f1f8e9] shadow-2xs animate-in fade-in duration-200">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2 text-[#2e7d32]">
              <CheckCircle2 className="h-5 w-5" />
              <h3 className="text-base font-bold">
                Batch Recovery Successfully Queued
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="bg-white p-3 rounded-lg border border-[#c8e6c9]">
                <span className="text-[11px] text-[#75777a] uppercase">Cases Created</span>
                <div className="text-xl font-bold text-[#2e7d32]">{result.created}</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-[#c8e6c9]">
                <span className="text-[11px] text-[#75777a] uppercase">Already Tracked</span>
                <div className="text-xl font-bold text-[#191c1d]">{result.skipped}</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-[#c8e6c9]">
                <span className="text-[11px] text-[#75777a] uppercase">Batch ID</span>
                <div className="text-xs font-mono font-bold text-[#191c1d] truncate mt-1">{result.batchId}</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-[#c8e6c9]">
                <span className="text-[11px] text-[#75777a] uppercase">Action</span>
                <Link href="/recovery">
                  <span className="text-xs font-semibold text-[#2a21d2] hover:underline block mt-1 cursor-pointer">
                    View in Pipeline →
                  </span>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* High-Value Review Queue Section */}
      {highValueData && (
        <Card className="border border-[#c7c4d8] bg-white shadow-xs animate-in fade-in duration-200">
          <div className="p-5 border-b border-[#e1e2e5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#fafafa]">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-[#c2185b]" />
                <h3 className="text-base font-bold text-[#191c1d]">
                  High-Value Review Queue (≥ ₹{highValueData.thresholdRupees.toLocaleString("en-IN")})
                </h3>
              </div>
              <p className="text-xs text-[#75777a] mt-0.5">
                AI and deterministic Policy Gatekeeper identified {highValueData.count} high-value cases requiring explicit merchant approval.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleReviewHighValue}
              disabled={runningCampaign === "HIGH_VALUE_REVIEW"}
              className="text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${runningCampaign === "HIGH_VALUE_REVIEW" ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <CardContent className="p-5 space-y-4">
            {highValueData.cases.length === 0 ? (
              <div className="p-8 text-center bg-[#f8f9fa] rounded-lg border border-dashed border-[#c7c4d8]">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-[#191c1d]">Zero Pending High-Value Cases</h4>
                <p className="text-xs text-[#75777a] mt-1 max-w-md mx-auto">
                  All failed payments exceeding the ₹{highValueData.thresholdRupees.toLocaleString("en-IN")} safety threshold have been reviewed or resolved.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#e1e2e5] border border-[#e1e2e5] rounded-xl overflow-hidden">
                {highValueData.cases.map((c) => {
                  const isApproved = approvedCases[c.id];
                  const isApproving = approvingCaseId === c.id;

                  return (
                    <div
                      key={c.id}
                      className="p-4 bg-white hover:bg-[#fcfdfe] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Left: Case Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base font-bold text-[#191c1d]">
                            {formatCurrency(c.riskAmount)}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#fce4ec] text-[#c2185b]">
                            {c.status === "ESCALATED" ? "Escalated for Approval" : "Approval Required"}
                          </span>
                          <span className="text-xs text-[#75777a] font-mono">
                            Order #{c.order?.receipt || c.order?.id?.slice(-8) || "N/A"}
                          </span>
                        </div>

                        <div className="text-xs text-[#444748] flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>
                            <strong>Method:</strong> {c.paymentMethod?.toUpperCase() || "CARD"}
                          </span>
                          <span>
                            <strong>Failure:</strong> {c.failureReason || "Gateway Timeout"}
                          </span>
                        </div>

                        <div className="text-[11px] text-[#2a21d2] bg-[#e0e0ff]/40 px-2.5 py-1 rounded inline-block">
                          AI Recommended Strategy:{" "}
                          <strong>{c.recommendedAction?.replace(/_/g, " ") || "Payment Retry"}</strong>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="h-3.5 w-3.5" /> Approved & Executing
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleApproveCase(c)}
                            disabled={isApproving}
                            className="bg-[#2a21d2] hover:bg-[#1b1599] text-white text-xs font-medium shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            {isApproving ? "Authorizing..." : "Approve Recovery"}
                          </Button>
                        )}

                        <Link href={`/recovery/${c.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs flex items-center gap-1 cursor-pointer"
                          >
                            Inspect
                            <ArrowUpRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
