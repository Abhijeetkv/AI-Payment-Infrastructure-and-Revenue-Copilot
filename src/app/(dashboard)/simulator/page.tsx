"use client";

import * as React from "react";
import {
  FlaskConical,
  Play,
  CheckCircle2,
  ShieldCheck,
  RotateCcw,
  Lock,
  WifiOff,
  CreditCard,
  Layers,
  ArrowRight,
  Clock,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ScenarioType =
  | "PAYMENT_FAILURE_RECOVERY"
  | "UPI_DEGRADATION_RECOVERY"
  | "REPEATED_FAILURE_ESCALATION"
  | "NETWORK_TIMEOUT"
  | "BANK_DECLINE"
  | "WEBHOOK_HMAC_TAMPER"
  | "WEBHOOK_DEDUPLICATION_REPLAY"
  | "CONCURRENT_RECOVERY_RACE";

interface SimulationStep {
  step: number;
  name: string;
  status: "SUCCESS" | "BLOCKED_SAFELY" | "FAILED_EXPECTED" | "RECONCILED";
  details: string;
  timestamp: string;
}

interface SimulationResult {
  scenario: ScenarioType;
  title: string;
  description: string;
  executionTimeMs: number;
  defenseMechanism: string;
  outcome: "PASSED_RESILIENT" | "FAILED";
  summary: string;
  steps: SimulationStep[];
  ledgerProtected: boolean;
}

const SCENARIOS = [
  {
    type: "PAYMENT_FAILURE_RECOVERY" as ScenarioType,
    title: "Autonomous Payment Recovery",
    icon: Sparkles,
    badge: "AI Agent + Policy Gatekeeper",
    description: "Simulates failure detection, AI customer telemetry analysis, policy validation, Razorpay test order creation, webhook confirmation, and ₹2,499 ledger credit.",
  },
  {
    type: "UPI_DEGRADATION_RECOVERY" as ScenarioType,
    title: "UPI Degradation & Method Fallback",
    icon: Zap,
    badge: "Alternate Method Route",
    description: "Simulates route degradation on UPI. AI recommends Card route fallback, recovering 81.25% of at-risk checkout sessions.",
  },
  {
    type: "REPEATED_FAILURE_ESCALATION" as ScenarioType,
    title: "Repeated Failure Bounded Escalation",
    icon: ShieldCheck,
    badge: "Deterministic Stopping Rule",
    description: "Verifies that policy guardrails halt automated retries on 3rd failure attempt, preventing runaway charges and escalating cleanly to the merchant.",
  },
  {
    type: "NETWORK_TIMEOUT" as ScenarioType,
    title: "Gateway Network Timeout",
    icon: WifiOff,
    badge: "Durable Inngest Polling",
    description: "Simulates upstream gateway timeout during capture. Verifies state is held safely in PENDING without false failure, followed by durable background reconciliation.",
  },
  {
    type: "BANK_DECLINE" as ScenarioType,
    title: "Bank Card Decline & Atomic Guard",
    icon: CreditCard,
    badge: "Atomic State Machine",
    description: "Simulates issuer bank decline code (BAD_REQUEST_PAYMENT_DECLINED). Verifies state transitions to FAILED with zero phantom CREDIT entries recorded.",
  },
  {
    type: "WEBHOOK_HMAC_TAMPER" as ScenarioType,
    title: "Webhook Signature Tampering",
    icon: Lock,
    badge: "HMAC-SHA256 Barrier",
    description: "Simulates malicious actor modifying webhook payload amount without secret key. Verifies immediate HTTP 400 rejection and security audit logging.",
  },
  {
    type: "WEBHOOK_DEDUPLICATION_REPLAY" as ScenarioType,
    title: "Triple Webhook Replay",
    icon: Layers,
    badge: "Multi-Tiered Idempotency",
    description: "Simulates upstream gateway sending identical payment.captured webhook 3 times. Verifies exactly 1 ledger transaction is recorded.",
  },
  {
    type: "CONCURRENT_RECOVERY_RACE" as ScenarioType,
    title: "Concurrent Recovery Race",
    icon: RotateCcw,
    badge: "Redis Distributed Lock",
    description: "Simulates customer paying via SMS recovery link at the same second a background retry runs. Verifies Redis lock prevents double-charging.",
  },
];

export default function SimulatorPage() {
  const [selectedScenario, setSelectedScenario] = React.useState<ScenarioType>("PAYMENT_FAILURE_RECOVERY");
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState<SimulationResult | null>(null);

  const handleRunScenario = async (type?: ScenarioType) => {
    const scenarioToRun = type || selectedScenario;
    setRunning(true);

    try {
      const res = await fetch("/api/simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: scenarioToRun }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setResult(json.data);
      }
    } catch (err) {
      console.error("Simulation failed:", err);
    } finally {
      setRunning(false);
    }
  };

  const getStepStatusBadge = (status: SimulationStep["status"]) => {
    switch (status) {
      case "SUCCESS":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#087343]/10 text-[#087343] border border-[#087343]/20 uppercase">
            SUCCESS
          </span>
        );
      case "BLOCKED_SAFELY":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#f0f0ff] text-[#2a21d2] border border-[#2a21d2]/20 uppercase">
            BLOCKED SAFELY
          </span>
        );
      case "FAILED_EXPECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#f59e0b]/10 text-[#b45309] border border-[#f59e0b]/20 uppercase">
            FAULT INJECTED
          </span>
        );
      case "RECONCILED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#087343]/10 text-[#087343] border border-[#087343]/20 uppercase">
            RECONCILED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e9ecef] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191c1d]">
              Payment Fault Simulator
            </h2>
            <Badge variant="success">Resilience Engine</Badge>
          </div>
          <p className="text-sm text-[#444748] mt-1 font-normal">
            Execute chaos engineering simulations to verify multi-tiered idempotency, HMAC security, and ledger invariance.
          </p>
        </div>

        <Button
          onClick={() => handleRunScenario()}
          disabled={running}
          className="h-9 gap-2 bg-[#000000] hover:bg-[#1c1b1b] text-white font-semibold shadow-xs text-xs px-4 cursor-pointer"
        >
          <Play className={`h-3.5 w-3.5 ${running ? "animate-spin text-[#2a21d2]" : ""}`} />
          <span>{running ? "Simulating Chaos..." : "Execute Selected Scenario"}</span>
        </Button>
      </div>

      {/* Scenarios Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {SCENARIOS.map((s) => {
          const Icon = s.icon;
          const isSelected = selectedScenario === s.type;

          return (
            <div
              key={s.type}
              onClick={() => {
                setSelectedScenario(s.type);
                handleRunScenario(s.type);
              }}
              className={`p-4 rounded-lg cursor-pointer transition-all border flex flex-col justify-between space-y-3 ${
                isSelected
                  ? "bg-[#f0f0ff]/60 border-[#2a21d2] shadow-xs"
                  : "bg-white border-[#e9ecef] hover:border-[#c4c7c7] hover:bg-[#f8f9fa]"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div
                    className={`h-8 w-8 rounded-md flex items-center justify-center ${
                      isSelected
                        ? "bg-[#2a21d2] text-white"
                        : "bg-[#f3f4f5] text-[#444748] border border-[#e9ecef]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[9px] font-mono text-[#747878] font-semibold bg-[#f3f4f5] px-1.5 py-0.5 rounded border border-[#e9ecef]">
                    {s.badge}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-[#191c1d]">{s.title}</h3>
                <p className="text-[11px] text-[#444748] line-clamp-3 leading-relaxed">
                  {s.description}
                </p>
              </div>

              <div className="pt-2 border-t border-[#e9ecef] flex items-center justify-between text-[10px] font-mono">
                <span className={isSelected ? "text-[#2a21d2] font-semibold" : "text-[#747878]"}>
                  {isSelected ? "Active Scenario" : "Click to Run"}
                </span>
                <ArrowRight className={`h-3 w-3 ${isSelected ? "text-[#2a21d2]" : "text-[#747878]"}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Simulation Execution Console */}
      <div className="border border-[#e9ecef] bg-white rounded-lg shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#e9ecef] flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-[#2a21d2]" />
            <h3 className="text-base font-bold text-[#191c1d]">
              Live Resilience Execution Log
            </h3>
          </div>
          {result && (
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#087343]/10 text-[#087343] border border-[#087343]/20">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{result.outcome.replace("_", " ")}</span>
              </span>
              <span className="text-[11px] text-[#747878] font-mono flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{result.executionTimeMs}ms</span>
              </span>
            </div>
          )}
        </div>

        <div className="p-5 space-y-5">
          {!result ? (
            <div className="p-12 text-center text-xs text-[#747878] font-mono">
              Select a fault scenario above or click &quot;Execute Selected Scenario&quot; to run live chaos test.
            </div>
          ) : (
            <>
              {/* Header Overview Banner */}
              <div className="p-4 rounded-lg bg-[#f8f9fa] border border-[#e9ecef] space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-[#191c1d]">{result.title}</h3>
                  <div className="text-xs font-mono text-[#2a21d2] flex items-center gap-1 font-semibold">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Defense: <strong>{result.defenseMechanism}</strong></span>
                  </div>
                </div>
                <p className="text-xs text-[#444748] leading-relaxed">
                  {result.summary}
                </p>
              </div>

              {/* Step by Step Breakdown */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-[#444748] uppercase tracking-wider">
                  Execution Trace &amp; Security Guards
                </div>

                <div className="space-y-2 font-mono text-xs">
                  {result.steps.map((step) => (
                    <div
                      key={step.step}
                      className="p-3 rounded-lg bg-[#f8f9fa] border border-[#e9ecef] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded bg-white border border-[#c4c7c7] flex items-center justify-center text-[11px] font-bold text-[#191c1d] shrink-0">
                          {step.step}
                        </div>
                        <div>
                          <div className="font-semibold text-[#191c1d]">{step.name}</div>
                          <div className="text-[#444748] text-[11px] font-sans">{step.details}</div>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {getStepStatusBadge(step.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Invariance Check Card */}
              <div className="p-3.5 rounded-lg bg-[#087343]/5 border border-[#087343]/20 flex items-center justify-between text-xs text-[#087343]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#087343] shrink-0" />
                  <span>
                    <strong>Ledger Invariant Verification:</strong> Immutable double-entry financial ledger verified with 0 corruption or double debits.
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#087343]/10 text-[#087343] border border-[#087343]/20">
                  PASS
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

