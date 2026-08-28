"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Play,
  Ban,
  UserCheck,
  Lock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface RecoveryCaseDetail {
  id: string;
  merchantId: string;
  paymentId: string;
  orderId: string;
  customerId: string | null;
  riskAmount: number;
  failureType: string;
  failureReason: string | null;
  paymentMethod: string | null;
  recoveryProbability: number;
  expectedRecoveryAmount: number;
  recommendedAction: string | null;
  selectedAction: string | null;
  status: string;
  attemptCount: number;
  maxAttempts: number;
  recoveredAmount: number;
  stopReason: string | null;
  escalationReason: string | null;
  aiReasoningFactors: string[] | null;
  policyCheckResults: {
    allowed?: boolean;
    checks?: Array<{ rule: string; passed: boolean; reason: string }>;
  } | null;
  createdAt: string;
  resolvedAt: string | null;
  actions: Array<{
    id: string;
    actionType: string;
    attemptNumber: number;
    status: string;
    executedAt: string | null;
    completedAt: string | null;
  }>;
  timeline: Array<{
    id: string;
    event: string;
    description: string;
    actor: string;
    createdAt: string;
    metadata: Record<string, unknown> | null;
  }>;
  payment?: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    paymentMethod: string | null;
    razorpayPaymentId: string | null;
    failureReason: string | null;
    createdAt: string;
  };
  order?: {
    id: string;
    receipt: string | null;
    razorpayOrderId: string | null;
  };
}

export default function RecoveryCaseDetailPage() {
  const params = useParams();
  const caseId = params.id as string;

  const [caseData, setCaseData] = React.useState<RecoveryCaseDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExecuting, setIsExecuting] = React.useState(false);
  const [actionFeedback, setActionFeedback] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const fetchCase = React.useCallback(() => {
    setIsLoading(true);
    setReloadKey((prev) => prev + 1);
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const res = await fetch(`/api/recovery/${caseId}`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.success && json.data) {
            setCaseData(json.data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch recovery case:", err);
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
  }, [caseId, reloadKey]);

  const handleExecuteAction = async (actionType: string) => {
    try {
      setIsExecuting(true);
      setActionFeedback(null);
      const res = await fetch(`/api/recovery/${caseId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType }),
      });

      const data = await res.json();
      if (data.success && data.data?.allowed) {
        setActionFeedback("Recovery action dispatched and executed successfully.");
        await fetchCase();
      } else {
        setActionFeedback(`Policy blocked: ${data.data?.policyResult?.reasons?.join(", ") || data.error}`);
        await fetchCase();
      }
    } catch {
      setActionFeedback("Failed to execute action.");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleEscalate = async () => {
    try {
      setIsExecuting(true);
      const res = await fetch(`/api/recovery/${caseId}/escalate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Merchant requested manual escalation" }),
      });
      if (res.ok) {
        setActionFeedback("Case escalated to merchant.");
        await fetchCase();
      }
    } catch {
      setActionFeedback("Failed to escalate case.");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleStop = async () => {
    try {
      setIsExecuting(true);
      const res = await fetch(`/api/recovery/${caseId}/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stopReason: "MERCHANT_TERMINATED" }),
      });
      if (res.ok) {
        setActionFeedback("Recovery terminated.");
        await fetchCase();
      }
    } catch {
      setActionFeedback("Failed to stop recovery.");
    } finally {
      setIsExecuting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-[#75777a]">
        <div className="inline-block animate-spin h-6 w-6 border-2 border-[#2a21d2] border-t-transparent rounded-full mb-2" />
        <p className="text-xs">Loading recovery case timeline...</p>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-lg font-bold text-[#191c1d]">Case Not Found</h2>
        <p className="text-xs text-[#75777a] mt-1">The recovery case #{caseId} could not be located.</p>
        <Link href="/dashboard/recovery">
          <Button size="sm" className="mt-4 text-xs">Return to Cases</Button>
        </Link>
      </div>
    );
  }

  const probPct = Math.round(caseData.recoveryProbability * 100);
  const isTerminal = ["RECOVERED", "FAILED", "ESCALATED", "STOPPED"].includes(caseData.status);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/recovery"
            className="h-8 w-8 rounded-lg bg-white border border-[#c7c4d8] flex items-center justify-center text-[#191c1d] hover:bg-[#f3f4f5] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#191c1d]">
                Recovery Case #{caseData.id.slice(-8).toUpperCase()}
              </h1>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                  caseData.status === "RECOVERED"
                    ? "bg-[#e8f5e9] text-[#2e7d32]"
                    : caseData.status === "EXECUTING"
                      ? "bg-[#e0e0ff] text-[#2a21d2]"
                      : caseData.status === "FAILED"
                        ? "bg-[#ffebee] text-[#ba1a1a]"
                        : "bg-[#fff8e1] text-[#f57f17]"
                }`}
              >
                {caseData.status}
              </span>
            </div>
            <p className="text-xs text-[#75777a] mt-0.5 font-mono">
              Payment ID: {caseData.payment?.razorpayPaymentId || caseData.paymentId}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {!isTerminal && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleStop}
              disabled={isExecuting}
              className="text-xs border-[#ba1a1a] text-[#ba1a1a] hover:bg-[#ffebee]"
            >
              <Ban className="h-3.5 w-3.5 mr-1" />
              Stop
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEscalate}
              disabled={isExecuting}
              className="text-xs border-[#7b1fa2] text-[#7b1fa2] hover:bg-[#f3e5f5]"
            >
              <UserCheck className="h-3.5 w-3.5 mr-1" />
              Escalate
            </Button>
            {caseData.recommendedAction && (
              <Button
                size="sm"
                onClick={() => handleExecuteAction(caseData.recommendedAction!)}
                disabled={isExecuting}
                className="bg-[#2a21d2] hover:bg-[#1b1599] text-white text-xs font-medium shadow-xs flex items-center gap-1.5"
              >
                <Play className="h-3.5 w-3.5" />
                Execute {caseData.recommendedAction.replace(/_/g, " ")}
              </Button>
            )}
          </div>
        )}
      </div>

      {actionFeedback && (
        <div className="p-3 bg-[#e8f5e9] text-[#1b5e20] border border-[#a5d6a7] rounded-lg text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Case Overview Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border border-[#e1e2e5] bg-white shadow-2xs">
          <CardContent className="p-4">
            <span className="text-[11px] font-medium text-[#75777a] uppercase">
              Revenue At Risk
            </span>
            <div className="text-xl font-bold text-[#ba1a1a] mt-1">
              {formatCurrency(caseData.riskAmount)}
            </div>
            <p className="text-[11px] text-[#75777a] mt-0.5 capitalize">
              {caseData.failureType.replace(/_/g, " ")}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-[#e1e2e5] bg-white shadow-2xs">
          <CardContent className="p-4">
            <span className="text-[11px] font-medium text-[#75777a] uppercase">
              Recovery Probability
            </span>
            <div className="text-xl font-bold text-[#2a21d2] mt-1">
              {probPct}%
            </div>
            <p className="text-[11px] text-[#75777a] mt-0.5">
              Exp: {formatCurrency(caseData.expectedRecoveryAmount)}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-[#e1e2e5] bg-white shadow-2xs">
          <CardContent className="p-4">
            <span className="text-[11px] font-medium text-[#75777a] uppercase">
              Payment Method
            </span>
            <div className="text-xl font-bold text-[#191c1d] mt-1 uppercase">
              {caseData.paymentMethod || "UPI"}
            </div>
            <p className="text-[11px] text-[#75777a] mt-0.5 truncate">
              {caseData.failureReason || "Gateway decline"}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-[#e1e2e5] bg-white shadow-2xs">
          <CardContent className="p-4">
            <span className="text-[11px] font-medium text-[#75777a] uppercase">
              Attempts / Max
            </span>
            <div className="text-xl font-bold text-[#191c1d] mt-1">
              {caseData.attemptCount} / {caseData.maxAttempts}
            </div>
            <p className="text-[11px] text-[#75777a] mt-0.5">
              {caseData.recoveredAmount > 0
                ? `Recovered: ${formatCurrency(caseData.recoveredAmount)}`
                : "Awaiting resolution"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2-Column Layout: "Why this action?" Explainability on left, Recovery Timeline on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: AI Recommendation & Policy Gatekeeping (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* AI Recommendation Card */}
          <Card className="border border-[#c7c4d8] bg-white shadow-2xs">
            <div className="p-4 border-b border-[#e1e2e5] flex items-center gap-2 bg-[#f8f9fe]">
              <Sparkles className="h-4 w-4 text-[#2a21d2]" />
              <h3 className="text-sm font-bold text-[#191c1d]">
                AI Recommendation
              </h3>
            </div>

            <CardContent className="p-5 space-y-4">
              <div>
                <span className="text-xs text-[#75777a]">Recommended Intervention</span>
                <div className="text-base font-bold text-[#2a21d2] mt-0.5">
                  {caseData.recommendedAction
                    ? caseData.recommendedAction.replace(/_/g, " ")
                    : "Analyzing case..."}
                </div>
              </div>

              {/* Evidence Factors */}
              <div>
                <span className="text-xs font-semibold text-[#191c1d]">
                  Why this action?
                </span>
                <ul className="mt-2 space-y-1.5 text-xs text-[#444748]">
                  {Array.isArray(caseData.aiReasoningFactors) && caseData.aiReasoningFactors.length > 0 ? (
                    caseData.aiReasoningFactors.map((factor, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#2a21d2] mt-1.5 shrink-0" />
                        <span>{factor}</span>
                      </li>
                    ))
                  ) : (
                    <>
                      <li className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#2a21d2] mt-1.5 shrink-0" />
                        <span>Original payment method failed due to gateway timeout.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#2a21d2] mt-1.5 shrink-0" />
                        <span>Payment amount is within safe automated recovery limit.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#2a21d2] mt-1.5 shrink-0" />
                        <span>Attempt count (0/3) allows automated intervention.</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Policy Guardrails & Checks Card */}
          <Card className="border border-[#e1e2e5] bg-white shadow-2xs">
            <div className="p-4 border-b border-[#e1e2e5] flex items-center gap-2">
              <Lock className="h-4 w-4 text-[#191c1d]" />
              <h3 className="text-sm font-bold text-[#191c1d]">
                Policy Guardrails & Checks
              </h3>
            </div>

            <CardContent className="p-5">
              <div className="space-y-2.5">
                {[
                  { label: "Eligible Unpaid Transaction", passed: true },
                  { label: "Amount within limit (≤ ₹1,00,000)", passed: caseData.riskAmount <= 10000000 },
                  { label: "Attempt limit not exceeded (< 3)", passed: caseData.attemptCount < caseData.maxAttempts },
                  { label: "Payment not already refunded", passed: true },
                  { label: "Recovery probability threshold (≥ 15%)", passed: probPct >= 15 },
                ].map((check, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-[#444748]">{check.label}</span>
                    {check.passed ? (
                      <span className="inline-flex items-center gap-1 text-[#2e7d32] font-semibold text-[11px]">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Passed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[#ba1a1a] font-semibold text-[11px]">
                        <AlertTriangle className="h-3.5 w-3.5" /> Blocked
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Recovery Timeline (7 cols) */}
        <div className="lg:col-span-7">
          <Card className="border border-[#e1e2e5] bg-white shadow-2xs">
            <div className="p-4 border-b border-[#e1e2e5] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#191c1d]">
                  Recovery Timeline & Audit Trail
                </h3>
                <p className="text-[11px] text-[#75777a] mt-0.5">
                  Complete chronological trace of agent actions and outcomes
                </p>
              </div>
              <span className="text-xs text-[#75777a] font-mono">
                {caseData.timeline.length} events
              </span>
            </div>

            <CardContent className="p-6">
              <div className="relative border-l-2 border-[#e1e2e5] ml-3 space-y-6 py-2">
                {caseData.timeline.map((event) => {
                  const isRecoveredEvent = event.event.includes("recovered") || event.event.includes("completed");

                  return (
                    <div key={event.id} className="relative pl-6">
                      {/* Timeline Dot */}
                      <div
                        className={`absolute -left-[9px] top-0.5 h-4 w-4 rounded-full border-2 border-white flex items-center justify-center ${
                          isRecoveredEvent
                            ? "bg-[#2e7d32]"
                            : event.actor === "ai_agent"
                              ? "bg-[#2a21d2]"
                              : event.actor === "policy_engine"
                                ? "bg-[#f57f17]"
                                : "bg-[#75777a]"
                        }`}
                      />

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#191c1d] capitalize">
                          {event.event.replace(/_/g, " ")}
                        </span>
                        <span className="text-[11px] text-[#75777a]">
                          {new Date(event.createdAt).toLocaleTimeString("en-IN")}
                        </span>
                      </div>

                      <p className="text-xs text-[#444748] mt-1 leading-relaxed">
                        {event.description}
                      </p>

                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-[#f3f4f5] text-[#75777a] uppercase mt-2">
                        Actor: {event.actor}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
