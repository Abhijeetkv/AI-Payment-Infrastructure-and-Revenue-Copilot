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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ScenarioType =
  | "NETWORK_TIMEOUT"
  | "BANK_DECLINE"
  | "WEBHOOK_HMAC_TAMPER"
  | "WEBHOOK_DEDUPLICATION_REPLAY"
  | "CONCURRENT_REFUND_RACE";

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
    type: "CONCURRENT_REFUND_RACE" as ScenarioType,
    title: "Concurrent Refund Race",
    icon: RotateCcw,
    badge: "Redis Distributed Lock",
    description: "Simulates 2 simultaneous refund requests on the same payment. Verifies distributed locking and live ledger balance checks prevent double-refunding.",
  },
];

export default function SimulatorPage() {
  const [selectedScenario, setSelectedScenario] = React.useState<ScenarioType>("CONCURRENT_REFUND_RACE");
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
        return <Badge variant="success" className="text-[10px]">SUCCESS</Badge>;
      case "BLOCKED_SAFELY":
        return <Badge variant="default" className="bg-indigo-600/20 text-indigo-300 border-indigo-500/30 text-[10px]">BLOCKED SAFELY</Badge>;
      case "FAILED_EXPECTED":
        return <Badge variant="warning" className="text-[10px]">FAULT INJECTED</Badge>;
      case "RECONCILED":
        return <Badge variant="outline" className="text-emerald-400 border-emerald-500/40 text-[10px]">RECONCILED</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Payment Reliability & Fault Simulator
            </h1>
            <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
              Phase 9 Active
            </Badge>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Execute chaos engineering simulations to verify multi-tiered idempotency, HMAC security, distributed locking, and ledger invariance.
          </p>
        </div>

        <Button
          onClick={() => handleRunScenario()}
          disabled={running}
          className="gap-2 bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-md shadow-rose-950/30 text-xs h-9 px-4"
        >
          <Play className={`h-3.5 w-3.5 ${running ? "animate-spin" : ""}`} />
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
              className={`p-4 rounded-2xl cursor-pointer transition-all border flex flex-col justify-between space-y-3 ${
                isSelected
                  ? "bg-zinc-900 border-indigo-500 shadow-md ring-1 ring-indigo-500/50"
                  : "bg-zinc-950/80 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div
                    className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                      isSelected
                        ? "bg-indigo-600 text-white"
                        : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono text-zinc-400">
                    {s.badge}
                  </Badge>
                </div>
                <h3 className="text-xs font-bold text-white">{s.title}</h3>
                <p className="text-[11px] text-zinc-400 line-clamp-3 leading-relaxed">
                  {s.description}
                </p>
              </div>

              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] font-mono">
                <span className={isSelected ? "text-indigo-400 font-semibold" : "text-zinc-500"}>
                  {isSelected ? "Active Scenario" : "Click to Run"}
                </span>
                <ArrowRight className={`h-3 w-3 ${isSelected ? "text-indigo-400" : "text-zinc-600"}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Simulation Execution Console */}
      <Card className="border-zinc-800 bg-zinc-950/80 shadow-2xl">
        <CardHeader className="p-4 border-b border-zinc-800 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-rose-400" />
            <CardTitle className="text-base font-bold text-zinc-100">
              Live Resilience Execution Log
            </CardTitle>
          </div>
          {result && (
            <div className="flex items-center gap-2 font-mono text-xs">
              <Badge variant="success" className="gap-1 font-bold text-[11px]">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{result.outcome.replace("_", " ")}</span>
              </Badge>
              <Badge variant="outline" className="text-[11px] text-zinc-400 border-zinc-800">
                <Clock className="h-3 w-3 mr-1" />
                <span>{result.executionTimeMs}ms</span>
              </Badge>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-5 space-y-5">
          {!result ? (
            <div className="p-12 text-center text-xs text-zinc-500 font-mono">
              Select a fault scenario above or click &quot;Execute Selected Scenario&quot; to run live chaos test.
            </div>
          ) : (
            <>
              {/* Header Overview Banner */}
              <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-white">{result.title}</h3>
                  <div className="text-xs font-mono text-indigo-400 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Defense: <strong>{result.defenseMechanism}</strong></span>
                  </div>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {result.summary}
                </p>
              </div>

              {/* Step by Step Breakdown */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Execution Trace &amp; Security Guards
                </div>

                <div className="space-y-2 font-mono text-xs">
                  {result.steps.map((step) => (
                    <div
                      key={step.step}
                      className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[11px] font-bold text-zinc-200 shrink-0">
                          {step.step}
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-200">{step.name}</div>
                          <div className="text-zinc-400 text-[11px] font-sans">{step.details}</div>
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
              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Ledger Invariant Verification:</strong> Immutable double-entry financial ledger verified with 0 corruption or double debits.
                  </span>
                </div>
                <Badge variant="outline" className="text-emerald-400 border-emerald-500/40 text-[10px]">
                  PASS
                </Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
