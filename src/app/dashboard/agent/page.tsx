"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  RefreshCw,
  Send,
  Bot,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

interface ActivityItem {
  id: string;
  recoveryCaseId: string;
  event: string;
  description: string;
  actor: string;
  riskAmount: number;
  recoveredAmount: number;
  status: string;
  createdAt: string;
}

export default function AgentActivityPage() {
  const [activities, setActivities] = React.useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [prompt, setPrompt] = React.useState("");
  const [isAsking, setIsAsking] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [chatLog, setChatLog] = React.useState<Array<{ role: "user" | "agent"; text: string }>>([
    {
      role: "agent",
      text: "Lumina Recovery Agent is active. I am continuously scanning failed transactions, evaluating recovery probabilities, and executing bounded workflows verified by the policy engine. Ask me to analyze any case, payment method degradation, or revenue risk metric!",
    },
  ]);

  const fetchActivities = React.useCallback(() => {
    setIsLoading(true);
    setReloadKey((prev) => prev + 1);
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const res = await fetch("/api/recovery/agent?limit=40");
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.success && Array.isArray(json.data)) {
            setActivities(json.data);
          }
        }
      } catch (err) {
        console.error("Failed to load agent activities:", err);
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
  }, [reloadKey]);

  const handleSendPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isAsking) return;

    const userText = prompt.trim();
    setPrompt("");
    setChatLog((prev) => [...prev, { role: "user", text: userText }]);
    setIsAsking(true);

    try {
      const res = await fetch("/api/recovery/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userText }),
      });
      const data = await res.json();
      if (data.success && data.data?.analysis) {
        setChatLog((prev) => [...prev, { role: "agent", text: data.data.analysis }]);
      } else {
        setChatLog((prev) => [
          ...prev,
          { role: "agent", text: "Unable to complete analysis. Please try again." },
        ]);
      }
    } catch {
      setChatLog((prev) => [
        ...prev,
        { role: "agent", text: "Connection error contacting agent engine." },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-[#e0e0ff] text-[#2a21d2]">
              <Sparkles className="h-3 w-3" /> Autonomous Agent Engine
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#e8f5e9] text-[#2e7d32]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2e7d32] animate-ping" /> ACTIVE
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#191c1d] mt-1">
            Agent Activity & Reasoning Feed
          </h1>
          <p className="text-xs text-[#75777a] mt-0.5">
            Transparent, auditable execution stream showing every decision and verified action taken by Lumina.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchActivities}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh Feed
        </Button>
      </div>

      {/* 2-Column: Left Agent Chat / Right Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Agent Investigation Chat (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border border-[#c7c4d8] bg-white shadow-2xs flex flex-col h-[560px]">
            <div className="p-4 border-b border-[#e1e2e5] flex items-center justify-between bg-[#f8f9fe]">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-[#2a21d2]" />
                <h3 className="text-sm font-bold text-[#191c1d]">
                  Direct Agent Consultation
                </h3>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#75777a]">
                Grounded Tools
              </span>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
              {chatLog.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "agent" && (
                    <div className="h-6 w-6 rounded-full bg-[#2a21d2] text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="h-3 w-3" />
                    </div>
                  )}
                  <div
                    className={`p-3 rounded-lg max-w-[85%] whitespace-pre-wrap leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#2a21d2] text-white"
                        : "bg-[#f3f4f5] text-[#191c1d] border border-[#e1e2e5]"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isAsking && (
                <div className="flex items-center gap-2 text-xs text-[#75777a] italic">
                  <RefreshCw className="h-3 w-3 animate-spin text-[#2a21d2]" />
                  <span>Agent querying verified ledger & telemetry...</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendPrompt} className="p-3 border-t border-[#e1e2e5] flex gap-2">
              <Input
                placeholder="Ask about revenue risk, recovery rate, or case analysis..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isAsking}
                className="text-xs"
              />
              <Button
                type="submit"
                disabled={isAsking || !prompt.trim()}
                className="bg-[#2a21d2] hover:bg-[#1b1599] text-white text-xs px-3 shadow-xs"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: Global Agent Activity Timeline (7 cols) */}
        <div className="lg:col-span-7">
          <Card className="border border-[#e1e2e5] bg-white shadow-2xs h-[560px] flex flex-col">
            <div className="p-4 border-b border-[#e1e2e5] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#191c1d]">
                  Real-time Decision Stream
                </h3>
                <p className="text-[11px] text-[#75777a]">
                  Chronological event log across all merchant recovery workflows
                </p>
              </div>
              <span className="text-xs font-mono text-[#75777a]">
                {activities.length} events
              </span>
            </div>

            <div className="flex-1 p-5 overflow-y-auto">
              <div className="relative border-l-2 border-[#e1e2e5] ml-2 space-y-5">
                {isLoading ? (
                  <div className="text-center py-12 text-[#75777a] text-xs">
                    <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1 text-[#2a21d2]" />
                    Loading activity stream...
                  </div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-12 text-[#75777a] text-xs">
                    No recent agent activity recorded. Trigger a batch recovery campaign to generate events.
                  </div>
                ) : (
                  activities.map((act) => {
                    const isRecovered = act.event.includes("completed") || act.event.includes("recovered");
                    const isPolicy = act.actor === "policy_engine";
                    const isAgent = act.actor === "ai_agent";

                    return (
                      <div key={act.id} className="relative pl-5">
                        <div
                          className={`absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-white ${
                            isRecovered
                              ? "bg-[#2e7d32]"
                              : isAgent
                                ? "bg-[#2a21d2]"
                                : isPolicy
                                  ? "bg-[#f57f17]"
                                  : "bg-[#75777a]"
                          }`}
                        />

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[#191c1d] capitalize">
                              {act.event.replace(/_/g, " ")}
                            </span>
                            <Link
                              href={`/dashboard/recovery/${act.recoveryCaseId}`}
                              className="text-[10px] font-mono text-[#2a21d2] hover:underline"
                            >
                              #{act.recoveryCaseId.slice(-6).toUpperCase()}
                            </Link>
                          </div>
                          <span className="text-[10px] text-[#75777a]">
                            {new Date(act.createdAt).toLocaleTimeString("en-IN")}
                          </span>
                        </div>

                        <p className="text-xs text-[#444748] mt-0.5">
                          {act.description}
                        </p>

                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-[#f3f4f5] text-[#75777a] uppercase">
                            {act.actor}
                          </span>
                          {act.riskAmount > 0 && (
                            <span className="text-[10px] text-[#75777a]">
                              At Risk: {formatCurrency(act.riskAmount)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
