"use client";

import * as React from "react";
import Link from "next/link";
import {
  Zap,
  Sparkles,
  Play,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CampaignsPage() {
  const [isRunning, setIsRunning] = React.useState(false);
  const [result, setResult] = React.useState<{
    batchId: string;
    created: number;
    skipped: number;
    errors: number;
    timeframeHours: number;
  } | null>(null);

  const handleRunCampaign = async (hours: number) => {
    try {
      setIsRunning(true);
      setResult(null);
      const res = await fetch("/api/recovery/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setResult(json.data);
      }
    } catch (err) {
      console.error("Campaign run failed:", err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
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

      {/* Campaign Launcher Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Campaign Option 1: Last 24 Hours */}
        <Card className="border border-[#e1e2e5] bg-white shadow-2xs hover:border-[#2a21d2] transition-colors">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg bg-[#e0e0ff] text-[#2a21d2] flex items-center justify-center">
                <Zap className="h-5 w-5" />
              </div>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-[#e8f5e9] text-[#2e7d32]">
                Recommended
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-[#191c1d]">
                Recover Failed Payments — Last 24 Hours
              </h3>
              <p className="text-xs text-[#75777a] mt-1">
                Scans all failed transactions from the last 24 hours, constructs AI recovery cases, and queues durable execution.
              </p>
            </div>

            <div className="pt-2">
              <Button
                onClick={() => handleRunCampaign(24)}
                disabled={isRunning}
                className="w-full bg-[#2a21d2] hover:bg-[#1b1599] text-white text-xs font-medium shadow-xs flex items-center justify-center gap-2"
              >
                <Play className="h-3.5 w-3.5" />
                {isRunning ? "Running Campaign..." : "Run 24-Hour Recovery Campaign"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Campaign Option 2: Last 7 Days (Deep Sweep) */}
        <Card className="border border-[#e1e2e5] bg-white shadow-2xs hover:border-[#2a21d2] transition-colors">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg bg-[#fff8e1] text-[#f57f17] flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-[#f3f4f5] text-[#75777a]">
                Deep Sweep
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-[#191c1d]">
                Weekly Revenue Sweep — Last 7 Days
              </h3>
              <p className="text-xs text-[#75777a] mt-1">
                Comprehensive sweep across the past 7 days of unresolved checkout failures and method degradations.
              </p>
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                onClick={() => handleRunCampaign(168)}
                disabled={isRunning}
                className="w-full border-[#2a21d2] text-[#2a21d2] hover:bg-[#e0e0ff] text-xs font-medium flex items-center justify-center gap-2"
              >
                <Play className="h-3.5 w-3.5" />
                {isRunning ? "Running Sweep..." : "Run 7-Day Sweep Campaign"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Result Card */}
      {result && (
        <Card className="border border-[#a5d6a7] bg-[#f1f8e9] shadow-2xs">
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
                <Link href="/dashboard/recovery">
                  <span className="text-xs font-semibold text-[#2a21d2] hover:underline block mt-1">
                    View in Pipeline →
                  </span>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
