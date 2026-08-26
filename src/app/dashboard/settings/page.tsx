"use client";

import * as React from "react";
import {
  Shield,
  Key,
  Database,
  Sparkles,
  Bot,
  Trash2,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TelemetryStats {
  orders: number;
  payments: number;
  transactions: number;
  refunds: number;
  anomalies: number;
  dailyMetrics: number;
}

export default function SettingsPage() {
  const [stats, setStats] = React.useState<TelemetryStats | null>(null);
  const [loadingStats, setLoadingStats] = React.useState(true);
  const [seeding, setSeeding] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    let isMounted = true;

    async function loadTelemetryStats() {
      try {
        const res = await fetch("/api/seed");
        const json = await res.json();
        if (isMounted && json.success && json.data) {
          setStats(json.data);
        }
      } catch (err) {
        console.error("Failed to load telemetry stats:", err);
      } finally {
        if (isMounted) {
          setLoadingStats(false);
        }
      }
    }

    loadTelemetryStats();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const fetchStats = () => {
    setLoadingStats(true);
    setRefreshKey((k) => k + 1);
  };

  const handleSeedData = async () => {
    setSeeding(true);
    setSuccessMessage(null);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const json = await res.json();
      if (json.success && json.data) {
        setSuccessMessage(`Successfully seeded 90 days of telemetry (${json.data.totalPayments} payments, ${json.data.totalLedgerTx} ledger entries, and historical rollups)!`);
        fetchStats();
      }
    } catch (err) {
      console.error("Seeding failed:", err);
    } finally {
      setSeeding(false);
    }
  };

  const handleClearData = async () => {
    if (!confirm("Are you sure you want to reset all merchant demo telemetry?")) return;
    setClearing(true);
    setSuccessMessage(null);
    try {
      await fetch("/api/seed", { method: "DELETE" });
      setSuccessMessage("All demo telemetry has been cleared.");
      fetchStats();
    } catch (err) {
      console.error("Clear failed:", err);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Settings &amp; Infrastructure Operations
            </h1>
            <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
              Phase 10 Active
            </Badge>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Manage merchant credentials, view live database telemetry stats, and seed 90-day demo datasets.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchStats}
          disabled={loadingStats}
          className="h-8 gap-1.5 text-xs text-zinc-300 border-zinc-800 hover:text-white"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loadingStats ? "animate-spin" : ""}`} />
          <span>Refresh Telemetry</span>
        </Button>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Demo Telemetry & High-Volume Seed Card */}
      <Card className="border-zinc-800 bg-zinc-900/40 shadow-xl">
        <CardHeader className="p-5 border-b border-zinc-800 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-indigo-400" />
              <CardTitle className="text-base font-bold text-zinc-100">
                High-Volume Seed Generator &amp; Telemetry Database
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-zinc-400">
              Populate 90 days of continuous orders, payments, double-entry ledgers, and historical rollups.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-5">
          {/* Telemetry Counter Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
              <div className="text-[11px] text-zinc-400">Orders</div>
              <div className="text-lg font-bold font-mono text-white">
                {stats ? stats.orders.toLocaleString() : "..."}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
              <div className="text-[11px] text-zinc-400">Payments</div>
              <div className="text-lg font-bold font-mono text-emerald-400">
                {stats ? stats.payments.toLocaleString() : "..."}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
              <div className="text-[11px] text-zinc-400">Ledger Entries</div>
              <div className="text-lg font-bold font-mono text-indigo-400">
                {stats ? stats.transactions.toLocaleString() : "..."}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
              <div className="text-[11px] text-zinc-400">Refunds</div>
              <div className="text-lg font-bold font-mono text-rose-400">
                {stats ? stats.refunds.toLocaleString() : "..."}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
              <div className="text-[11px] text-zinc-400">Anomalies</div>
              <div className="text-lg font-bold font-mono text-amber-400">
                {stats ? stats.anomalies.toLocaleString() : "..."}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
              <div className="text-[11px] text-zinc-400">Daily Rollups</div>
              <div className="text-lg font-bold font-mono text-zinc-300">
                {stats ? stats.dailyMetrics.toLocaleString() : "..."}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="text-xs text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Generates ~180 realistic transactions across UPI (60%), Card (25%), and Netbanking (10%).</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearData}
                disabled={clearing || seeding}
                className="text-xs text-rose-400 border-rose-900/50 hover:bg-rose-950/30 gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{clearing ? "Clearing..." : "Reset Telemetry"}</span>
              </Button>

              <Button
                size="sm"
                onClick={handleSeedData}
                disabled={seeding || clearing}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium gap-1.5 shadow-md shadow-indigo-950/30"
              >
                <Sparkles className={`h-3.5 w-3.5 ${seeding ? "animate-spin" : ""}`} />
                <span>{seeding ? "Generating 90-Day Telemetry..." : "Seed 90-Day High-Volume Telemetry"}</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid: Credentials & AI Config */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Razorpay Gateway Card */}
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardHeader className="p-5 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-indigo-400" />
              <CardTitle className="text-base font-bold text-zinc-100">Razorpay Test Gateway</CardTitle>
            </div>
            <CardDescription className="text-xs text-zinc-400">
              Test mode credentials used for orders, captures, refunds, and webhooks.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="key-id" className="text-zinc-300">Key ID</Label>
              <Input
                id="key-id"
                defaultValue="rzp_test_••••••••••••"
                readOnly
                className="font-mono text-xs bg-zinc-900 border-zinc-800 text-zinc-300"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="webhook-secret" className="text-zinc-300">Webhook Secret</Label>
              <Input
                id="webhook-secret"
                defaultValue="••••••••••••••••••••••••"
                readOnly
                type="password"
                className="font-mono text-xs bg-zinc-900 border-zinc-800 text-zinc-300"
              />
            </div>
            <div className="pt-2 flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400">Enforcement Mode:</span>
              <Badge variant="success" className="text-[10px]">Test Mode Enforced</Badge>
            </div>
          </CardContent>
        </Card>

        {/* AI Copilot & Provider Card */}
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardHeader className="p-5 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-purple-400" />
              <CardTitle className="text-base font-bold text-zinc-100">AI Intelligence Engine</CardTitle>
            </div>
            <CardDescription className="text-xs text-zinc-400">
              Multi-provider natural-language financial intelligence.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
              <div className="space-y-0.5">
                <div className="font-semibold text-zinc-200">AI Provider</div>
                <div className="text-[11px] text-zinc-400">Google Gemini / OpenAI / Deterministic Engine</div>
              </div>
              <Badge variant="outline" className="text-purple-400 border-purple-500/30 text-[10px] font-mono">
                Multi-Model
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
              <div className="space-y-0.5">
                <div className="font-semibold text-zinc-200">Grounded DB Tool-Calling</div>
                <div className="text-[11px] text-zinc-400">Zero financial hallucination guarantee</div>
              </div>
              <Badge variant="success" className="text-[10px]">Active</Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
              <div className="space-y-0.5">
                <div className="font-semibold text-zinc-200">Conversation Memory</div>
                <div className="text-[11px] text-zinc-400">PostgreSQL thread persistence</div>
              </div>
              <Badge variant="success" className="text-[10px]">Enabled</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security & Reliability Invariants Card */}
      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardHeader className="p-5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-400" />
            <CardTitle className="text-base font-bold text-zinc-100">Production Security &amp; Safety Guardrails</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200">Live Key Guard</span>
                <Badge variant="success" className="text-[10px]">Enforced</Badge>
              </div>
              <p className="text-[11px] text-zinc-400">
                Throws fatal error on startup if rzp_live_* keys are detected.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200">HMAC Webhooks</span>
                <Badge variant="success" className="text-[10px]">Strict</Badge>
              </div>
              <p className="text-[11px] text-zinc-400">
                Cryptographic HMAC-SHA256 signature check rejects spoofed webhooks.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200">Double-Entry Ledger</span>
                <Badge variant="success" className="text-[10px]">Immutable</Badge>
              </div>
              <p className="text-[11px] text-zinc-400">
                CREDIT on capture, DEBIT on refund; zero unverified balance shifts.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200">Idempotency</span>
                <Badge variant="success" className="text-[10px]">Multi-Tier</Badge>
              </div>
              <p className="text-[11px] text-zinc-400">
                Redis distributed locks &amp; DB records prevent double-debits.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
