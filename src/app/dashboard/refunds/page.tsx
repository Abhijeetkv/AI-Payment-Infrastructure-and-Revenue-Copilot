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
  Layers,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  const [refreshKey, setRefreshKey] = React.useState(0);

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

  React.useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams();
    params.set("metrics", "true");
    params.set("limit", "50");
    if (search) params.set("search", search);
    if (statusFilter !== "ALL") params.set("status", statusFilter);

    fetch(`/api/refunds?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (json.success) {
          setRefunds(json.data || []);
          if (json.metrics) setMetrics(json.metrics);
        }
      })
      .catch((err) => {
        console.error("Failed to load refunds:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [search, statusFilter, refreshKey]);

  const handleRefresh = () => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  };

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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e9ecef] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191c1d]">
              Refunds Operations
            </h2>
            <Badge variant="success">Safe Orchestration</Badge>
          </div>
          <p className="text-sm text-[#444748] mt-1 font-normal">
            Full and partial refund execution with strict balance invariants enforced by double-entry ledger.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="h-9 gap-1.5 text-xs text-[#191c1d] bg-white border-[#c4c7c7] hover:bg-[#f3f4f5] shadow-xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#2a21d2]" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={loadEligiblePayments}
            className="h-9 gap-1.5 bg-[#000000] hover:bg-[#1c1b1b] text-white font-semibold text-xs shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Issue Safe Refund</span>
          </Button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Refund Volume */}
        <div className="bg-white border border-[#e9ecef] rounded-lg p-4 hover:border-[#c4c7c7] transition-colors shadow-xs">
          <div className="text-xs font-semibold text-[#444748] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Total Refund Volume</span>
            <TrendingDown className="h-4 w-4 text-[#c92a2a]" />
          </div>
          <div className="text-2xl font-bold text-[#191c1d] tracking-tight">
            {metrics ? formatCurrency(metrics.totalRefundVolume) : "₹0.00"}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[#c92a2a] font-mono text-xs font-semibold bg-[#c92a2a]/10 px-1.5 py-0.5 rounded">
              {metrics?.refundRate || 0}%
            </span>
            <span className="text-[11px] text-[#444748]">refund rate</span>
          </div>
        </div>

        {/* Total Refunds Count */}
        <div className="bg-white border border-[#e9ecef] rounded-lg p-4 hover:border-[#c4c7c7] transition-colors shadow-xs">
          <div className="text-xs font-semibold text-[#444748] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Refunds Count</span>
            <RotateCcw className="h-4 w-4 text-[#2a21d2]" />
          </div>
          <div className="text-2xl font-bold text-[#191c1d] tracking-tight">
            {metrics ? String(metrics.totalRefunds) : "0"}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[#087343] font-mono text-xs font-semibold bg-[#087343]/10 px-1.5 py-0.5 rounded">
              {metrics?.processedRefunds || 0}
            </span>
            <span className="text-[11px] text-[#444748]">processed</span>
          </div>
        </div>

        {/* Partial vs Full */}
        <div className="bg-white border border-[#e9ecef] rounded-lg p-4 hover:border-[#c4c7c7] transition-colors shadow-xs">
          <div className="text-xs font-semibold text-[#444748] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Partial / Full</span>
            <Layers className="h-4 w-4 text-[#444748]" />
          </div>
          <div className="text-2xl font-bold text-[#191c1d] tracking-tight">
            {metrics ? `${metrics.partialRefundsCount} / ${metrics.fullRefundsCount}` : "0 / 0"}
          </div>
          <div className="mt-2 text-[11px] text-[#444748]">
            state transitions
          </div>
        </div>

        {/* Avg Refund */}
        <div className="bg-white border border-[#e9ecef] rounded-lg p-4 hover:border-[#c4c7c7] transition-colors shadow-xs">
          <div className="text-xs font-semibold text-[#444748] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Avg. Refund</span>
            <ShieldCheck className="h-4 w-4 text-[#087343]" />
          </div>
          <div className="text-2xl font-bold text-[#191c1d] tracking-tight">
            {metrics ? formatCurrency(metrics.avgRefundAmount) : "₹0.00"}
          </div>
          <div className="mt-2 text-[11px] text-[#444748]">
            average per refund
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="border border-[#e9ecef] bg-white shadow-xs rounded-lg overflow-hidden space-y-0">
        <div className="p-4 border-b border-[#e9ecef] flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#747878]" />
            <input
              placeholder="Search by refund ID, payment ID, or reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-[#e9ecef] bg-white text-[#191c1d] focus:outline-none focus:border-[#2a21d2] placeholder:text-[#747878]"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            {["ALL", "PROCESSED", "PROCESSING", "FAILED"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === status
                    ? "bg-[#000000] text-white font-semibold"
                    : "text-[#444748] hover:text-[#191c1d] hover:bg-[#f3f4f5]"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {loading && refunds.length === 0 ? (
          <div className="p-16 text-center text-xs text-[#747878] font-mono">Loading refunds...</div>
        ) : refunds.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="h-12 w-12 rounded-lg bg-[#f3f4f5] border border-[#e9ecef] flex items-center justify-center text-[#444748] mx-auto">
              <RotateCcw className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-[#191c1d]">No refunds found</h3>
              <p className="text-xs text-[#444748] max-w-sm mx-auto">
                No refund records match your search. You can issue a refund against any successful payment.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadEligiblePayments}
              className="text-xs gap-1.5 text-[#191c1d] border-[#c4c7c7] hover:bg-[#f3f4f5]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Issue Refund</span>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#f3f4f5] text-[#444748] border-b border-[#e9ecef] font-medium">
                <tr>
                  <th className="py-3.5 px-6">Refund ID / Gateway Ref</th>
                  <th className="py-3.5 px-6">Associated Payment</th>
                  <th className="py-3.5 px-6">Refund Amount</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Reason</th>
                  <th className="py-3.5 px-6">Created At</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9ecef]">
                {refunds.map((refund) => (
                  <tr
                    key={refund.id}
                    className="hover:bg-[#f3f4f5]/60 transition-colors group cursor-pointer"
                    onClick={() => setInspectRefund(refund)}
                  >
                    {/* Refund ID */}
                    <td className="py-4 px-6">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-mono text-[#191c1d] font-semibold">
                          <span>{refund.razorpayRefundId || refund.id.slice(0, 16)}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(refund.razorpayRefundId || refund.id, refund.id);
                            }}
                            className="text-[#747878] hover:text-[#191c1d] transition-colors cursor-pointer"
                            title="Copy ID"
                          >
                            {copiedId === refund.id ? (
                              <Check className="h-3 w-3 text-[#087343]" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                        <span className="text-[10px] text-[#747878] font-mono">
                          {refund.id}
                        </span>
                      </div>
                    </td>

                    {/* Payment ID Link */}
                    <td className="py-4 px-6">
                      <Link
                        href={`/dashboard/payments/${refund.paymentId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[#2a21d2] font-semibold font-mono hover:underline"
                      >
                        <span>
                          {refund.payment?.razorpayPaymentId ||
                            refund.paymentId.slice(0, 14) + "..."}
                        </span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </Link>
                    </td>

                    {/* Refund Amount */}
                    <td className="py-4 px-6">
                      <span className="font-mono font-bold text-[#c92a2a] text-sm">
                        -{formatCurrency(refund.amount, refund.currency)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6">{getStatusBadge(refund.status)}</td>

                    {/* Reason */}
                    <td className="py-4 px-6 text-[#444748] max-w-xs truncate">
                      {refund.reason || "—"}
                    </td>

                    {/* Created Date */}
                    <td className="py-4 px-6 text-[#747878] font-mono text-[11px]">
                      {new Date(refund.createdAt).toLocaleString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    {/* Action */}
                    <td className="py-4 px-6 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectRefund(refund);
                        }}
                        className="h-7 px-2.5 text-xs text-[#2a21d2] hover:bg-[#f0f0ff] font-semibold cursor-pointer"
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
      </div>

      {/* Select Eligible Payment Modal */}
      {isSelectPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div
            className="w-full max-w-lg rounded-xl bg-white border border-[#e9ecef] shadow-xl p-6 space-y-5 text-[#191c1d]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#e9ecef] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded bg-[#f0f0ff] border border-[#2a21d2]/20 flex items-center justify-center text-[#2a21d2]">
                  <RotateCcw className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#191c1d]">Select Payment to Refund</h3>
                  <p className="text-xs text-[#444748]">
                    Only captured or partially refunded payments can be refunded.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSelectPaymentOpen(false)}
                className="text-[#747878] hover:text-[#191c1d] text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {loadingPayments ? (
                <div className="p-8 text-center text-xs text-[#747878] font-mono">Loading eligible payments...</div>
              ) : eligiblePayments.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#444748] space-y-2">
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
                    type="button"
                    onClick={() => handleSelectPaymentToRefund(p)}
                    className="w-full p-3.5 rounded-lg bg-[#f8f9fa] border border-[#e9ecef] hover:border-[#2a21d2] hover:bg-[#f0f0ff]/50 transition-all flex items-center justify-between text-left group cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-xs text-[#191c1d]">
                          {p.razorpayPaymentId || p.id}
                        </span>
                        <Badge
                          variant={p.status === "SUCCESS" ? "success" : "warning"}
                          className="text-[10px]"
                        >
                          {p.status}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-[#747878]">
                        Created {new Date(p.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold font-mono text-[#191c1d]">
                        {formatCurrency(p.amount, p.currency)}
                      </div>
                      <span className="text-[10px] text-[#2a21d2] font-semibold group-hover:underline">
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
            handleRefresh();
          }}
        />
      )}

      {/* Inspect Refund Detail Modal */}
      {inspectRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div
            className="w-full max-w-md rounded-xl bg-white border border-[#e9ecef] shadow-xl p-6 space-y-5 text-[#191c1d]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#e9ecef] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded bg-[#f3f4f5] border border-[#e9ecef] flex items-center justify-center text-[#c92a2a]">
                  <RotateCcw className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#191c1d]">Refund Audit Inspector</h3>
                  <p className="text-xs text-[#747878] font-mono">{inspectRefund.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectRefund(null)}
                className="text-[#747878] hover:text-[#191c1d] text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs divide-y divide-[#e9ecef]">
              <div className="flex justify-between py-2">
                <span className="text-[#444748]">Refund Amount</span>
                <span className="font-mono font-bold text-[#c92a2a] text-sm">
                  -{formatCurrency(inspectRefund.amount, inspectRefund.currency)}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[#444748]">Status</span>
                <span>{getStatusBadge(inspectRefund.status)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[#444748]">Razorpay Refund ID</span>
                <span className="font-mono text-[#191c1d] font-semibold">
                  {inspectRefund.razorpayRefundId || "—"}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[#444748]">Reason</span>
                <span className="text-[#191c1d] text-right max-w-xs">
                  {inspectRefund.reason || "None specified"}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[#444748]">Ledger Entry Type</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#c92a2a]/10 text-[#c92a2a] border border-[#c92a2a]/20">
                  DEBIT (REFUND)
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[#444748]">Processed Timestamp</span>
                <span className="font-mono text-[#191c1d]">
                  {new Date(inspectRefund.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-[#e9ecef]">
              <Link href={`/dashboard/payments/${inspectRefund.paymentId}`}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs text-[#2a21d2] border-[#c4c7c7] hover:bg-[#f3f4f5]">
                  <span>View Payment Ledger</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setInspectRefund(null)}
                className="text-xs text-[#444748] hover:text-[#191c1d]"
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

