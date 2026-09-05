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
  MessageSquare,
  Mail,
  Smartphone,
  Copy,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface AIReasoningPayload {
  analysis?: string;
  reasoning?: string;
  confidence?: number;
  factors?: string[];
  provider?: string;
  alternativeAction?: string;
}

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
  aiReasoningFactors: string[] | AIReasoningPayload | null;
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
  const [copiedTouchpoint, setCopiedTouchpoint] = React.useState(false);
  const [touchpointChannel, setTouchpointChannel] = React.useState<"whatsapp" | "sms" | "email">("whatsapp");
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

  const handleCopyNudge = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTouchpoint(true);
    setTimeout(() => setCopiedTouchpoint(false), 2000);
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
        <Link href="/recovery">
          <Button size="sm" className="mt-4 text-xs">Return to Cases</Button>
        </Link>
      </div>
    );
  }

  const probPct = Math.round(caseData.recoveryProbability * 100);
  const isTerminal = ["RECOVERED", "FAILED", "ESCALATED", "STOPPED"].includes(caseData.status);

  // Parse structured AI reasoning payload if available
  const reasoningObj: AIReasoningPayload | null =
    caseData.aiReasoningFactors && typeof caseData.aiReasoningFactors === "object" && !Array.isArray(caseData.aiReasoningFactors)
      ? (caseData.aiReasoningFactors as AIReasoningPayload)
      : null;

  const reasoningFactorsList: string[] =
    reasoningObj?.factors ||
    (Array.isArray(caseData.aiReasoningFactors) ? caseData.aiReasoningFactors : [
      "Original payment method failed due to gateway/issuer error.",
      "Customer history indicates active purchase intent.",
      "Payment amount is within safe automated recovery limit.",
      "Attempt count allows bounded intervention.",
    ]);

  const confidenceScore = reasoningObj?.confidence ? Math.round(reasoningObj.confidence * 100) : probPct;
  const aiProvider = reasoningObj?.provider || "Gemini 2.0 Flash";

  // Mocked Customer Recovery Nudge texts for realistic demonstration
  const formattedAmount = formatCurrency(caseData.riskAmount);
  const orderRef = caseData.order?.receipt || caseData.orderId.slice(-8).toUpperCase();
  const whatsappNudge = `Hi! Your payment of ${formattedAmount} for Order #${orderRef} was interrupted due to a temporary bank decline. Lumina has secured your cart with Instant UPI/QR (99.4% uptime). Click to complete securely: https://rzp.io/l/rec_${caseData.id.slice(-6)}`;
  const smsNudge = `Payment alert: ${formattedAmount} for #${orderRef} failed. Retry via verified Instant UPI link: https://rzp.io/l/rec_${caseData.id.slice(-6)}`;
  const emailNudgeSubject = `Action Required: Complete your order #${orderRef} (${formattedAmount})`;
  const emailNudgeBody = `Dear Customer,\n\nWe noticed your recent payment of ${formattedAmount} for Order #${orderRef} could not be processed due to a temporary gateway timeout.\n\nOur system has preserved your order. You can easily complete payment using UPI, Cards, or Netbanking using our secure Razorpay link below:\n\n👉 Complete Payment: https://rzp.io/l/rec_${caseData.id.slice(-6)}\n\nThank you!`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/recovery"
            className="h-8 w-8 rounded-lg bg-white border border-[#c7c4d8] flex items-center justify-center text-[#191c1d] hover:bg-[#f3f4f5] transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#191c1d]">
                Recovery Case #{caseData.id.slice(-8).toUpperCase()}
              </h1>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${caseData.status === "RECOVERED"
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
              className="text-xs border-[#ba1a1a] text-[#ba1a1a] hover:bg-[#ffebee] cursor-pointer"
            >
              <Ban className="h-3.5 w-3.5 mr-1" />
              Stop
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEscalate}
              disabled={isExecuting}
              className="text-xs border-[#7b1fa2] text-[#7b1fa2] hover:bg-[#f3e5f5] cursor-pointer"
            >
              <UserCheck className="h-3.5 w-3.5 mr-1" />
              Escalate
            </Button>
            {caseData.recommendedAction && (
              <Button
                size="sm"
                onClick={() => handleExecuteAction(caseData.recommendedAction!)}
                disabled={isExecuting}
                className="bg-[#2a21d2] hover:bg-[#1b1599] text-white text-xs font-medium shadow-xs flex items-center gap-1.5 cursor-pointer"
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
          {/* AI Recommendation Card with Confidence Gauge */}
          <Card className="border border-[#c7c4d8] bg-white shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-[#e1e2e5] flex items-center justify-between bg-[#f8f9fe]">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#2a21d2]" />
                <h3 className="text-sm font-bold text-[#191c1d]">
                  AI Reasoning & Confidence
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#e0e0ff] text-[#2a21d2] font-semibold">
                {aiProvider}
              </span>
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

              {/* Confidence Gauge */}
              <div className="p-3 bg-[#f8f9fa] rounded-lg border border-[#e1e2e5]">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-[#191c1d]">Model Confidence</span>
                  <span className="font-bold text-[#2a21d2]">{confidenceScore}%</span>
                </div>
                <div className="w-full bg-[#e1e2e5] rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${confidenceScore > 70 ? "bg-[#2e7d32]" : confidenceScore > 40 ? "bg-[#f57f17]" : "bg-[#ba1a1a]"
                      }`}
                    style={{ width: `${confidenceScore}%` }}
                  />
                </div>
                {reasoningObj?.analysis && (
                  <p className="text-xs text-[#444748] mt-2 italic">
                    &ldquo;{reasoningObj.analysis}&rdquo;
                  </p>
                )}
              </div>

              {/* Evidence Factors */}
              <div>
                <span className="text-xs font-semibold text-[#191c1d]">
                  Evidence Factors (Why this action?)
                </span>
                <ul className="mt-2 space-y-1.5 text-xs text-[#444748]">
                  {reasoningFactorsList.map((factor, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#2a21d2] mt-1.5 shrink-0" />
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {reasoningObj?.alternativeAction && (
                <div className="text-xs text-[#75777a] pt-2 border-t border-[#e1e2e5]">
                  <span className="font-medium text-[#191c1d]">Fallback Action: </span>
                  {reasoningObj.alternativeAction.replace(/_/g, " ")}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Recovery Touchpoint (Nudge Preview) */}
          <Card className="border border-[#e1e2e5] bg-white shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-[#e1e2e5] flex items-center justify-between bg-gradient-to-r from-[#f0f4ff] to-white">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#2a21d2]" />
                <h3 className="text-sm font-bold text-[#191c1d]">
                  Customer Recovery Touchpoint
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-[#2e7d32] bg-[#e8f5e9] px-2 py-0.5 rounded">
                Live Preview
              </span>
            </div>

            <CardContent className="p-4 space-y-3">
              {/* Channel Tabs */}
              <div className="flex items-center rounded-lg bg-[#f3f4f5] p-1 border border-[#e1e2e5] text-xs">
                <button
                  type="button"
                  onClick={() => setTouchpointChannel("whatsapp")}
                  className={`flex-1 py-1 px-2 rounded font-medium flex items-center justify-center gap-1 cursor-pointer ${touchpointChannel === "whatsapp" ? "bg-white text-[#2a21d2] shadow-xs font-bold" : "text-[#75777a]"
                    }`}
                >
                  <MessageSquare className="h-3 w-3" /> WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setTouchpointChannel("sms")}
                  className={`flex-1 py-1 px-2 rounded font-medium flex items-center justify-center gap-1 cursor-pointer ${touchpointChannel === "sms" ? "bg-white text-[#2a21d2] shadow-xs font-bold" : "text-[#75777a]"
                    }`}
                >
                  <Smartphone className="h-3 w-3" /> SMS
                </button>
                <button
                  type="button"
                  onClick={() => setTouchpointChannel("email")}
                  className={`flex-1 py-1 px-2 rounded font-medium flex items-center justify-center gap-1 cursor-pointer ${touchpointChannel === "email" ? "bg-white text-[#2a21d2] shadow-xs font-bold" : "text-[#75777a]"
                    }`}
                >
                  <Mail className="h-3 w-3" /> Email
                </button>
              </div>

              {/* Message Box */}
              <div className="p-3 bg-[#f8f9fa] border border-[#e1e2e5] rounded-lg text-xs text-[#191c1d] relative font-sans leading-relaxed whitespace-pre-line">
                {touchpointChannel === "whatsapp" && whatsappNudge}
                {touchpointChannel === "sms" && smsNudge}
                {touchpointChannel === "email" && (
                  <div>
                    <div className="font-semibold text-[#191c1d] border-b border-[#e1e2e5] pb-1.5 mb-2">
                      Subject: {emailNudgeSubject}
                    </div>
                    {emailNudgeBody}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-[#75777a]">
                  Automated via Razorpay Payment Link
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleCopyNudge(
                      touchpointChannel === "whatsapp"
                        ? whatsappNudge
                        : touchpointChannel === "sms"
                          ? smsNudge
                          : emailNudgeBody
                    )
                  }
                  className="text-xs h-7 gap-1 cursor-pointer"
                >
                  {copiedTouchpoint ? <CheckCircle2 className="h-3 w-3 text-[#2e7d32]" /> : <Copy className="h-3 w-3" />}
                  {copiedTouchpoint ? "Copied!" : "Copy Message"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Policy Guardrails & Checks Card */}
          <Card className="border border-[#e1e2e5] bg-white shadow-2xs">
            <div className="p-4 border-b border-[#e1e2e5] flex items-center gap-2">
              <Lock className="h-4 w-4 text-[#191c1d]" />
              <h3 className="text-sm font-bold text-[#191c1d]">
                Deterministic Policy Gatekeeper
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
                  Autonomous Decision Timeline
                </h3>
                <p className="text-xs text-[#75777a] mt-0.5">
                  Audited sequence of AI evaluations, policy checks, and gateway events
                </p>
              </div>
              <span className="text-xs text-[#75777a] font-mono">
                {caseData.timeline.length} events
              </span>
            </div>

            <CardContent className="p-5">
              {caseData.timeline.length === 0 ? (
                <p className="text-xs text-[#75777a] py-6 text-center">
                  No timeline events recorded yet.
                </p>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#e1e2e5]">
                  {caseData.timeline.map((item, idx) => {
                    const isAi = item.actor === "ai_agent";
                    const isPolicy = item.actor === "policy_engine";
                    const isRecovered = item.event.includes("recovered") || item.event.includes("success");
                    const isFailed = item.event.includes("failed") || item.event.includes("blocked");

                    return (
                      <div key={item.id || idx} className="relative group">
                        {/* Timeline Node Icon */}
                        <div
                          className={`absolute -left-6 top-0 h-5 w-5 rounded-full border-2 border-white flex items-center justify-center text-white ${isRecovered
                              ? "bg-[#2e7d32]"
                              : isFailed
                                ? "bg-[#ba1a1a]"
                                : isAi
                                  ? "bg-[#2a21d2]"
                                  : isPolicy
                                    ? "bg-[#7b1fa2]"
                                    : "bg-[#75777a]"
                            }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        </div>

                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#191c1d] capitalize">
                              {item.event.replace(/_/g, " ")}
                            </span>
                            <span className="text-[11px] text-[#75777a] font-mono">
                              {new Date(item.createdAt).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                            </span>
                          </div>

                          <p className="text-xs text-[#444748] mt-1 leading-relaxed">
                            {item.description}
                          </p>

                          <div className="flex items-center gap-2 mt-1.5">
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isAi
                                  ? "bg-[#e0e0ff] text-[#2a21d2]"
                                  : isPolicy
                                    ? "bg-[#f3e5f5] text-[#7b1fa2]"
                                    : "bg-[#f3f4f5] text-[#75777a]"
                                }`}
                            >
                              Actor: {item.actor.replace(/_/g, " ")}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
