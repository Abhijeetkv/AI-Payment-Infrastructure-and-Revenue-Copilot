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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e9ecef] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191c1d]">
              Settings &amp; Infrastructure
            </h2>
            <Badge variant="success">Merchant Console</Badge>
          </div>
          <p className="text-sm text-[#444748] mt-1 font-normal">
            Manage merchant credentials, view database telemetry stats, and seed 90-day demo datasets.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchStats}
          disabled={loadingStats}
          className="h-9 gap-1.5 text-xs text-[#191c1d] bg-white border-[#c4c7c7] hover:bg-[#f3f4f5] shadow-xs cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loadingStats ? "animate-spin text-[#2a21d2]" : ""}`} />
          <span>Refresh Telemetry</span>
        </Button>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-lg bg-[#087343]/10 border border-[#087343]/30 text-[#087343] text-xs flex items-center gap-2 animate-in fade-in font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#087343]" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Demo Telemetry & High-Volume Seed Card */}
      <div className="border border-[#e9ecef] bg-white rounded-lg shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#e9ecef] flex flex-row items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-[#2a21d2]" />
              <h3 className="text-base font-bold text-[#191c1d]">
                High-Volume Seed Generator &amp; Telemetry Database
              </h3>
            </div>
            <p className="text-xs text-[#444748]">
              Populate 90 days of continuous orders, payments, double-entry ledgers, and historical rollups.
            </p>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Telemetry Counter Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-lg bg-[#f8f9fa] border border-[#e9ecef] space-y-1">
              <div className="text-[11px] text-[#444748] font-medium">Orders</div>
              <div className="text-lg font-bold font-mono text-[#191c1d]">
                {stats ? stats.orders.toLocaleString() : "..."}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#f8f9fa] border border-[#e9ecef] space-y-1">
              <div className="text-[11px] text-[#444748] font-medium">Payments</div>
              <div className="text-lg font-bold font-mono text-[#087343]">
                {stats ? stats.payments.toLocaleString() : "..."}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#f8f9fa] border border-[#e9ecef] space-y-1">
              <div className="text-[11px] text-[#444748] font-medium">Ledger Entries</div>
              <div className="text-lg font-bold font-mono text-[#2a21d2]">
                {stats ? stats.transactions.toLocaleString() : "..."}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#f8f9fa] border border-[#e9ecef] space-y-1">
              <div className="text-[11px] text-[#444748] font-medium">Refunds</div>
              <div className="text-lg font-bold font-mono text-[#c92a2a]">
                {stats ? stats.refunds.toLocaleString() : "..."}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#f8f9fa] border border-[#e9ecef] space-y-1">
              <div className="text-[11px] text-[#444748] font-medium">Anomalies</div>
              <div className="text-lg font-bold font-mono text-[#b45309]">
                {stats ? stats.anomalies.toLocaleString() : "..."}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#f8f9fa] border border-[#e9ecef] space-y-1">
              <div className="text-[11px] text-[#444748] font-medium">Daily Rollups</div>
              <div className="text-lg font-bold font-mono text-[#191c1d]">
                {stats ? stats.dailyMetrics.toLocaleString() : "..."}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="text-xs text-[#444748] flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#2a21d2]" />
              <span>Generates realistic transactions across UPI (60%), Card (25%), and Netbanking (10%).</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearData}
                disabled={clearing || seeding}
                className="text-xs text-[#c92a2a] border-[#c92a2a]/30 hover:bg-[#c92a2a]/10 gap-1.5 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{clearing ? "Clearing..." : "Reset Telemetry"}</span>
              </Button>

              <Button
                size="sm"
                onClick={handleSeedData}
                disabled={seeding || clearing}
                className="text-xs bg-[#2a21d2] hover:bg-[#2a21d2]/90 text-white font-semibold gap-1.5 shadow-xs cursor-pointer"
              >
                <Sparkles className={`h-3.5 w-3.5 ${seeding ? "animate-spin" : ""}`} />
                <span>{seeding ? "Generating 90-Day Telemetry..." : "Seed 90-Day Telemetry"}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Credentials & AI Config */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Razorpay Gateway Card */}
        <div className="border border-[#e9ecef] bg-white rounded-lg shadow-xs overflow-hidden">
          <div className="p-5 border-b border-[#e9ecef]">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-[#2a21d2]" />
              <h3 className="text-base font-bold text-[#191c1d]">Razorpay Test Gateway</h3>
            </div>
            <p className="text-xs text-[#444748] mt-1">
              Test mode credentials used for orders, captures, refunds, and webhooks.
            </p>
          </div>
          <div className="p-5 space-y-4 text-xs">
            <div className="space-y-1.5">
              <label htmlFor="key-id" className="font-semibold text-[#444748]">Key ID</label>
              <input
                id="key-id"
                defaultValue="rzp_test_••••••••••••"
                readOnly
                className="w-full px-3 py-1.5 font-mono text-xs rounded-md bg-[#f8f9fa] border border-[#e9ecef] text-[#191c1d]"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="webhook-secret" className="font-semibold text-[#444748]">Webhook Secret</label>
              <input
                id="webhook-secret"
                defaultValue="••••••••••••••••••••••••"
                readOnly
                type="password"
                className="w-full px-3 py-1.5 font-mono text-xs rounded-md bg-[#f8f9fa] border border-[#e9ecef] text-[#191c1d]"
              />
            </div>
            <div className="pt-2 flex items-center justify-between text-xs font-mono">
              <span className="text-[#444748]">Enforcement Mode:</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#087343]/10 text-[#087343] border border-[#087343]/20">
                Test Mode Enforced
              </span>
            </div>
          </div>
        </div>

        {/* AI Copilot & Provider Card */}
        <div className="border border-[#e9ecef] bg-white rounded-lg shadow-xs overflow-hidden">
          <div className="p-5 border-b border-[#e9ecef]">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-[#2a21d2]" />
              <h3 className="text-base font-bold text-[#191c1d]">AI Intelligence Engine</h3>
            </div>
            <p className="text-xs text-[#444748] mt-1">
              Natural-language payment intelligence and grounded tool-calling.
            </p>
          </div>
          <div className="p-5 space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#f8f9fa] border border-[#e9ecef]">
              <div className="space-y-0.5">
                <div className="font-semibold text-[#191c1d]">AI Provider</div>
                <div className="text-[11px] text-[#444748]">Google Gemini 2.5 Flash / Tool Calling Engine</div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f0f0ff] text-[#2a21d2] border border-[#2a21d2]/20 font-mono">
                Multi-Model
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-[#f8f9fa] border border-[#e9ecef]">
              <div className="space-y-0.5">
                <div className="font-semibold text-[#191c1d]">Grounded DB Tool-Calling</div>
                <div className="text-[11px] text-[#444748]">Zero financial hallucination guarantee</div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#087343]/10 text-[#087343] border border-[#087343]/20">
                Active
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-[#f8f9fa] border border-[#e9ecef]">
              <div className="space-y-0.5">
                <div className="font-semibold text-[#191c1d]">Conversation Memory</div>
                <div className="text-[11px] text-[#444748]">PostgreSQL thread persistence</div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#087343]/10 text-[#087343] border border-[#087343]/20">
                Enabled
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Security & Reliability Invariants Card */}
      <div className="border border-[#e9ecef] bg-white rounded-lg shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#e9ecef]">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#087343]" />
            <h3 className="text-base font-bold text-[#191c1d]">Production Security &amp; Safety Guardrails</h3>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-lg bg-[#f8f9fa] border border-[#e9ecef] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#191c1d]">Live Key Guard</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#087343]/10 text-[#087343]">Enforced</span>
              </div>
              <p className="text-[11px] text-[#444748]">
                Throws fatal error on startup if rzp_live_* keys are detected.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-[#f8f9fa] border border-[#e9ecef] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#191c1d]">HMAC Webhooks</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#087343]/10 text-[#087343]">Strict</span>
              </div>
              <p className="text-[11px] text-[#444748]">
                Cryptographic HMAC-SHA256 signature check rejects spoofed webhooks.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-[#f8f9fa] border border-[#e9ecef] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#191c1d]">Double-Entry Ledger</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#087343]/10 text-[#087343]">Immutable</span>
              </div>
              <p className="text-[11px] text-[#444748]">
                CREDIT on capture, DEBIT on refund; zero unverified balance shifts.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-[#f8f9fa] border border-[#e9ecef] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#191c1d]">Idempotency</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#087343]/10 text-[#087343]">Multi-Tier</span>
              </div>
              <p className="text-[11px] text-[#444748]">
                Redis distributed locks &amp; DB records prevent double-debits.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

