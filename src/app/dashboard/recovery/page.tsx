"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  RefreshCw,
  Zap,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

interface RecoveryCase {
  id: string;
  riskAmount: number;
  failureType: string;
  failureReason: string | null;
  paymentMethod: string | null;
  recoveryProbability: number;
  recommendedAction: string | null;
  selectedAction: string | null;
  status: string;
  attemptCount: number;
  recoveredAmount: number;
  createdAt: string;
  payment?: {
    razorpayPaymentId: string | null;
    paymentMethod: string | null;
  };
}

export default function RecoveryCasesPage() {
  const [cases, setCases] = React.useState<RecoveryCase[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [failureTypeFilter, setFailureTypeFilter] = React.useState<string>("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [reloadKey, setReloadKey] = React.useState(0);

  const fetchCases = React.useCallback(() => {
    setIsLoading(true);
    setReloadKey((prev) => prev + 1);
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const params = new URLSearchParams();
        if (statusFilter) params.append("status", statusFilter);
        if (failureTypeFilter) params.append("failureType", failureTypeFilter);
        if (searchTerm) params.append("search", searchTerm);
        params.append("limit", "50");

        const res = await fetch(`/api/recovery?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.success && Array.isArray(json.data)) {
            setCases(json.data);
          }
        }
      } catch (err) {
        console.error("Failed to load recovery cases:", err);
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
  }, [statusFilter, failureTypeFilter, searchTerm, reloadKey]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-[#e0e0ff] text-[#2a21d2]">
              <Sparkles className="h-3 w-3" /> Lumina Pipeline
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#191c1d] mt-1">
            Recovery Cases
          </h1>
          <p className="text-xs text-[#75777a] mt-0.5">
            Monitor, inspect, and execute AI-recommended interventions across at-risk payments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCases}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Link href="/dashboard/recovery/campaigns">
            <Button
              size="sm"
              className="bg-[#2a21d2] hover:bg-[#1b1599] text-white flex items-center gap-1.5 text-xs font-medium shadow-xs"
            >
              <Zap className="h-3.5 w-3.5" />
              Batch Campaign
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border border-[#e1e2e5] bg-white shadow-2xs">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#75777a]" />
            <Input
              placeholder="Search by Case ID, payment ID, or failure reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-md border border-[#c7c4d8] bg-white text-xs text-[#191c1d]"
            >
              <option value="">All Statuses</option>
              <option value="DETECTED">Detected</option>
              <option value="ANALYZING">Analyzing</option>
              <option value="ACTION_PENDING">Action Pending</option>
              <option value="EXECUTING">Executing</option>
              <option value="RECOVERED">Recovered</option>
              <option value="FAILED">Failed</option>
              <option value="ESCALATED">Escalated</option>
              <option value="STOPPED">Stopped</option>
            </select>

            <select
              value={failureTypeFilter}
              onChange={(e) => setFailureTypeFilter(e.target.value)}
              className="h-9 px-3 rounded-md border border-[#c7c4d8] bg-white text-xs text-[#191c1d]"
            >
              <option value="">All Failure Types</option>
              <option value="payment_failure">Payment Failure</option>
              <option value="checkout_abandonment">Checkout Abandonment</option>
              <option value="subscription_failure">Subscription Failure</option>
              <option value="method_degradation">Method Degradation</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Cases Table */}
      <Card className="border border-[#e1e2e5] bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8f9fa] border-b border-[#e1e2e5] text-[#75777a] uppercase font-semibold">
              <tr>
                <th className="px-5 py-3">Case ID</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Failure Type</th>
                <th className="px-5 py-3">Method</th>
                <th className="px-5 py-3">Probability</th>
                <th className="px-5 py-3">Recommended Action</th>
                <th className="px-5 py-3">Attempts</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e1e2e5]">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-[#75777a]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin text-[#2a21d2]" />
                      <span>Loading recovery cases...</span>
                    </div>
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-[#75777a]">
                    No recovery cases match your query.
                  </td>
                </tr>
              ) : (
                cases.map((c) => {
                  const probPct = Math.round(c.recoveryProbability * 100);
                  const isRecovered = c.status === "RECOVERED";
                  const isExecuting = c.status === "EXECUTING";

                  return (
                    <tr key={c.id} className="hover:bg-[#fbfcfd] transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-[#191c1d]">
                        <Link
                          href={`/dashboard/recovery/${c.id}`}
                          className="text-[#2a21d2] hover:underline font-mono"
                        >
                          #{c.id.slice(-8).toUpperCase()}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-[#191c1d]">
                        {formatCurrency(c.riskAmount)}
                      </td>
                      <td className="px-5 py-3.5 text-[#444748] capitalize">
                        {c.failureType.replace(/_/g, " ")}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#f3f4f5] text-[#191c1d] uppercase">
                          {c.paymentMethod || "UPI"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-[#e1e2e5] rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                probPct > 70
                                  ? "bg-[#2e7d32]"
                                  : probPct > 40
                                    ? "bg-[#f57f17]"
                                    : "bg-[#ba1a1a]"
                              }`}
                              style={{ width: `${probPct}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-[#191c1d]">
                            {probPct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[#444748]">
                        {c.recommendedAction
                          ? c.recommendedAction.replace(/_/g, " ")
                          : "Analyzing..."}
                      </td>
                      <td className="px-5 py-3.5 text-[#75777a] font-medium">
                        {c.attemptCount} / 3
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            isRecovered
                              ? "bg-[#e8f5e9] text-[#2e7d32]"
                              : isExecuting
                                ? "bg-[#e0e0ff] text-[#2a21d2]"
                                : c.status === "FAILED"
                                  ? "bg-[#ffebee] text-[#ba1a1a]"
                                  : c.status === "ESCALATED"
                                    ? "bg-[#f3e5f5] text-[#7b1fa2]"
                                    : "bg-[#fff8e1] text-[#f57f17]"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/dashboard/recovery/${c.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 px-2.5 border-[#2a21d2] text-[#2a21d2] hover:bg-[#e0e0ff]"
                          >
                            Inspect
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
