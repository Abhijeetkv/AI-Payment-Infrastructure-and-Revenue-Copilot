"use client";

import * as React from "react";
import Link from "next/link";
import {
  RotateCcw,
  Search,
  RefreshCw,
  Plus,
  ArrowUpRight,
  TrendingDown,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Check,
  Filter,
  Layers,
  ShieldCheck,
  ChevronRight,
  FileText,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/dashboard/metric-card";
import { formatCurrency } from "@/lib/utils";
import { RefundDialog } from "@/components/payments/refund-dialog";

interface RefundItem {
  id: string;
  paymentId: string;
  razorpayRefundId: string | null;
  amount: number;
  currency: string;
  status: "CREATED" | "PROCESSING" | "PROCESSED" | "FAILED";
  reason: string | null;
  createdAt: string;
  payment?: {
    id: string;
    razorpayPaymentId: string | null;
    amount: number;
    status: string;
    order?: {
      receipt: string | null;
    };
  };
}

interface RefundMetrics {
  totalRefundVolume: number;
  totalRefunds: number;
  processedRefunds: number;
  pendingRefunds: number;
  avgRefundAmount: number;
  refundRate: number;
  partialRefundsCount: number;
  fullRefundsCount: number;
}

interface EligiblePayment {
  id: string;
  razorpayPaymentId: string | null;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export default function RefundsPage() {
  const [refunds, setRefunds] = React.useState<RefundItem[]>([]);
  const [metrics, setMetrics] = React.useState<RefundMetrics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // New Refund Modal state
  const [isSelectPaymentOpen, setIsSelectPaymentOpen] = React.useState(false);
  const [eligiblePayments, setEligiblePayments] = React.useState<EligiblePayment[]>([]);
  const [loadingPayments, setLoadingPayments] = React.useState(false);
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = React.useState<{
    id: string;
    razorpayPaymentId: string | null;
    maxRefundable: number;
    currency: string;
  } | null>(null);

  // Detail Modal state
  const [inspectRefund, setInspectRefund] = React.useState<RefundItem | null>(null);

  const fetchRefunds = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("metrics", "true");
      params.set("limit", "50");
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/refunds?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setRefunds(json.data || []);
        if (json.metrics) setMetrics(json.metrics);
      }
    } catch (err) {
      console.error("Failed to load refunds:", err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  React.useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  const loadEligiblePayments = async () => {
    try {
      setLoadingPayments(true);
      setIsSelectPaymentOpen(true);
      const res = await fetch("/api/payments?limit=25");
      const json = await res.json();
      if (json.success && json.data) {
        // Filter payments eligible for refunding (SUCCESS or PARTIALLY_REFUNDED)
        const eligible = json.data.filter(
          (p: { status: string }) =>
            p.status === "SUCCESS" || p.status === "PARTIALLY_REFUNDED"
        );
        setEligiblePayments(eligible);
      }
    } catch (err) {
      console.error("Failed to load eligible payments:", err);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleSelectPaymentToRefund = async (p: EligiblePayment) => {
    try {
      // Fetch fresh payment detail to get exact live refundable balance from ledger
      const res = await fetch(`/api/payments/${p.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        const liveBalance =
          json.data.ledgerBalance?.refundableBalance !== undefined
            ? json.data.ledgerBalance.refundableBalance
            : p.amount;

        setSelectedPaymentForRefund({
          id: p.id,
          razorpayPaymentId: p.razorpayPaymentId,
          maxRefundable: liveBalance,
          currency: p.currency,
        });
        setIsSelectPaymentOpen(false);
      }
    } catch (err) {
      console.error("Error inspecting payment balance:", err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PROCESSED":
        return (
          <Badge variant="success" className="gap-1 text-[11px] font-medium">
            <CheckCircle2 className="h-3 w-3" />
            <span>PROCESSED</span>
          </Badge>
        );
      case "PROCESSING":
      case "CREATED":
        return (
          <Badge variant="secondary" className="gap-1 text-[11px] font-medium">
            <Clock className="h-3 w-3" />
            <span>PROCESSING</span>
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="destructive" className="gap-1 text-[11px] font-medium">
            <XCircle className="h-3 w-3" />
            <span>FAILED</span>
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Refunds Operations
            </h1>
            <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
              Phase 5 Live
            </Badge>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Full and partial refund orchestration with strict balance limits computed from immutable transaction ledger.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRefunds}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={loadEligiblePayments}
            className="gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-md shadow-rose-950/30"
          >
            <Plus className="h-4 w-4" />
            <span>Issue Safe Refund</span>
          </Button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Refund Volume"
          value={metrics ? formatCurrency(metrics.totalRefundVolume) : "₹0.00"}
          change={{
            value: metrics?.refundRate || 0,
            trend: "neutral",
            label: "refund rate",
          }}
          icon={TrendingDown}
          variant="danger"
          description="Debited from captured revenue"
        />

        <MetricCard
          title="Total Refunds Count"
          value={metrics ? String(metrics.totalRefunds) : "0"}
          change={{
            value: metrics?.processedRefunds || 0,
            trend: "neutral",
            label: "processed",
          }}
          icon={RotateCcw}
          variant="indigo"
          description="All time refund transactions"
        />

        <MetricCard
          title="Partial vs Full Refunds"
          value={
            metrics
              ? `${metrics.partialRefundsCount} / ${metrics.fullRefundsCount}`
              : "0 / 0"
          }
          icon={Layers}
          variant="warning"
          description="Partial vs full state transitions"
        />

        <MetricCard
          title="Avg. Refund Amount"
          value={metrics ? formatCurrency(metrics.avgRefundAmount) : "₹0.00"}
          icon={ShieldCheck}
          variant="success"
          description="Average per processed refund"
        />
      </div>

      {/* Main Table Card */}
      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardHeader className="p-4 border-b border-zinc-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Search by refund ID, payment ID, or reason..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs bg-zinc-900 border-zinc-800 text-zinc-100"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
              {["ALL", "PROCESSED", "PROCESSING", "FAILED"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    statusFilter === status
                      ? "bg-zinc-800 text-white font-semibold"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading && refunds.length === 0 ? (
            <div className="p-16 text-center text-xs text-zinc-400">Loading refunds...</div>
          ) : refunds.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-zinc-800/60 flex items-center justify-center text-zinc-500 mx-auto">
                <RotateCcw className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-200">No refunds found</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  No refund transactions match your current search or filters. You can issue a safe refund against any successful payment.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadEligiblePayments}
                className="text-xs gap-1.5 text-rose-400 border-rose-500/30 hover:bg-rose-950/20"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Issue Refund</span>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800 font-medium">
                  <tr>
                    <th className="py-3 px-4">Refund ID / Gateway Ref</th>
                    <th className="py-3 px-4">Associated Payment</th>
                    <th className="py-3 px-4">Refund Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Created At</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {refunds.map((refund) => (
                    <tr
                      key={refund.id}
                      className="hover:bg-zinc-800/30 transition-colors group cursor-pointer"
                      onClick={() => setInspectRefund(refund)}
                    >
                      {/* Refund ID */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-mono text-zinc-200 font-semibold">
                            <span>{refund.razorpayRefundId || refund.id.slice(0, 16)}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(refund.razorpayRefundId || refund.id, refund.id);
                              }}
                              className="text-zinc-500 hover:text-zinc-300 transition-colors"
                              title="Copy ID"
                            >
                              {copiedId === refund.id ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {refund.id}
                          </span>
                        </div>
                      </td>

                      {/* Payment ID Link */}
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/dashboard/payments/${refund.paymentId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-mono hover:underline"
                        >
                          <span>
                            {refund.payment?.razorpayPaymentId ||
                              refund.paymentId.slice(0, 14) + "..."}
                          </span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </Link>
                      </td>

                      {/* Refund Amount */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-rose-400 text-sm">
                          -{formatCurrency(refund.amount, refund.currency)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">{getStatusBadge(refund.status)}</td>

                      {/* Reason */}
                      <td className="py-3.5 px-4 text-zinc-300 max-w-xs truncate">
                        {refund.reason || "—"}
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">
                        {new Date(refund.createdAt).toLocaleString("en-IN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectRefund(refund);
                          }}
                          className="h-7 px-2.5 text-xs text-zinc-400 hover:text-white"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Select Eligible Payment Modal */}
      {isSelectPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-lg rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-6 space-y-5 text-zinc-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <RotateCcw className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Select Payment to Refund</h3>
                  <p className="text-xs text-zinc-400">
                    Only captured or partially refunded payments can be refunded.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSelectPaymentOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {loadingPayments ? (
                <div className="p-8 text-center text-xs text-zinc-400">Loading eligible payments...</div>
              ) : eligiblePayments.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-400 space-y-2">
                  <p>No eligible captured payments found.</p>
                  <Link href="/dashboard/orders">
                    <Button size="sm" variant="outline" className="text-xs">
                      Create Test Order & Pay First
                    </Button>
                  </Link>
                </div>
              ) : (
                eligiblePayments.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPaymentToRefund(p)}
                    className="w-full p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-800/60 transition-all flex items-center justify-between text-left group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-xs text-zinc-200">
                          {p.razorpayPaymentId || p.id}
                        </span>
                        <Badge
                          variant={p.status === "SUCCESS" ? "success" : "warning"}
                          className="text-[10px]"
                        >
                          {p.status}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        Created {new Date(p.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold font-mono text-white">
                        {formatCurrency(p.amount, p.currency)}
                      </div>
                      <span className="text-[10px] text-indigo-400 group-hover:underline">
                        Refund →
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Issue Refund Form Dialog */}
      {selectedPaymentForRefund && (
        <RefundDialog
          isOpen={!!selectedPaymentForRefund}
          onClose={() => setSelectedPaymentForRefund(null)}
          paymentId={selectedPaymentForRefund.id}
          razorpayPaymentId={selectedPaymentForRefund.razorpayPaymentId}
          maxRefundableAmount={selectedPaymentForRefund.maxRefundable}
          currency={selectedPaymentForRefund.currency}
          onRefundSuccess={() => {
            fetchRefunds();
          }}
        />
      )}

      {/* Inspect Refund Detail Modal */}
      {inspectRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-6 space-y-5 text-zinc-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <RotateCcw className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Refund Audit Inspector</h3>
                  <p className="text-xs text-zinc-400 font-mono">{inspectRefund.id}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setInspectRefund(null)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-3 text-xs divide-y divide-zinc-800">
              <div className="flex justify-between py-2">
                <span className="text-zinc-400">Refund Amount</span>
                <span className="font-mono font-bold text-rose-400 text-sm">
                  -{formatCurrency(inspectRefund.amount, inspectRefund.currency)}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-zinc-400">Status</span>
                <span>{getStatusBadge(inspectRefund.status)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-zinc-400">Razorpay Refund ID</span>
                <span className="font-mono text-zinc-200">
                  {inspectRefund.razorpayRefundId || "—"}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-zinc-400">Reason</span>
                <span className="text-zinc-200 text-right max-w-xs">
                  {inspectRefund.reason || "None specified"}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-zinc-400">Ledger Entry Type</span>
                <Badge variant="destructive" className="text-[10px]">
                  DEBIT (REFUND)
                </Badge>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-zinc-400">Processed Timestamp</span>
                <span className="font-mono text-zinc-300">
                  {new Date(inspectRefund.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <Link href={`/dashboard/payments/${inspectRefund.paymentId}`}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <span>View Payment Ledger</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setInspectRefund(null)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
