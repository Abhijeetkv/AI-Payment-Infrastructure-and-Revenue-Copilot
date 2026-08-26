"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  ShieldCheck,
  History,
  FileText,
  Loader2,
  Calendar,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { RefundDialog } from "@/components/payments/refund-dialog";

interface PaymentDetail {
  id: string;
  orderId: string;
  razorpayPaymentId: string | null;
  razorpayOrderId: string | null;
  amount: number;
  currency: string;
  paymentMethod: string | null;
  status: "CREATED" | "PROCESSING" | "AUTHORIZED" | "CAPTURED" | "SUCCESS" | "FAILED" | "PENDING" | "PARTIALLY_REFUNDED" | "REFUNDED";
  failureReason: string | null;
  createdAt: string;
  order?: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    receipt: string | null;
    createdAt: string;
  };
  transactions: Array<{
    id: string;
    type: "PAYMENT" | "REFUND" | "ADJUSTMENT";
    direction: "CREDIT" | "DEBIT";
    amount: number;
    currency: string;
    status: string;
    referenceId: string | null;
    description: string | null;
    createdAt: string;
  }>;
  refunds?: Array<{
    id: string;
    razorpayRefundId: string | null;
    amount: number;
    currency: string;
    status: string;
    reason: string | null;
    createdAt: string;
  }>;
  paymentEvents: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    trigger: string;
    metadata: string | null;
    createdAt: string;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    performedBy: string | null;
    changes: string | null;
    createdAt: string;
  }>;
  ledgerBalance?: {
    totalCaptured: number;
    totalRefunded: number;
    refundableBalance: number;
  };
}

export default function PaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const [payment, setPayment] = React.useState<PaymentDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    let isMounted = true;
    if (!params.id) return;

    fetch(`/api/payments/${params.id}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (json.success && json.data) {
          setPayment(json.data);
        } else {
          setError(json.error?.message || "Payment not found");
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load payment");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [params.id, refreshKey]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCESS":
      case "CAPTURED":
        return (
          <Badge variant="success" className="gap-1 px-3 py-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>SUCCESS / CAPTURED</span>
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="destructive" className="gap-1 px-3 py-1">
            <XCircle className="h-3.5 w-3.5" />
            <span>FAILED</span>
          </Badge>
        );
      case "PARTIALLY_REFUNDED":
        return (
          <Badge variant="warning" className="gap-1 px-3 py-1 bg-amber-500/10 text-amber-400 border-amber-500/30">
            <RotateCcw className="h-3.5 w-3.5" />
            <span>PARTIALLY REFUNDED</span>
          </Badge>
        );
      case "REFUNDED":
        return (
          <Badge variant="warning" className="gap-1 px-3 py-1 bg-rose-500/10 text-rose-400 border-rose-500/30">
            <RotateCcw className="h-3.5 w-3.5" />
            <span>FULLY REFUNDED</span>
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="secondary" className="gap-1 px-3 py-1">
            <Clock className="h-3.5 w-3.5" />
            <span>PENDING</span>
          </Badge>
        );
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <span className="text-sm text-zinc-400">Loading payment audit timeline...</span>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="p-12 text-center space-y-4">
        <div className="text-rose-400 text-sm">{error || "Payment not found"}</div>
        <Link href="/dashboard/payments">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Payments</span>
          </Button>
        </Link>
      </div>
    );
  }

  const isEligibleForRefund =
    (payment.status === "SUCCESS" ||
      payment.status === "CAPTURED" ||
      payment.status === "PARTIALLY_REFUNDED") &&
    payment.ledgerBalance &&
    payment.ledgerBalance.refundableBalance > 0;

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard/payments">
          <Button variant="ghost" size="sm" className="gap-2 text-zinc-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Payments</span>
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          {isEligibleForRefund && (
            <Button
              size="sm"
              onClick={() => setIsRefundDialogOpen(true)}
              className="gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-md shadow-rose-950/40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Issue Safe Refund</span>
            </Button>
          )}

          <Badge variant="outline" className="text-indigo-400 border-indigo-500/30">
            Immutable Double-Entry Ledger
          </Badge>
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-zinc-900 via-indigo-950/40 to-zinc-950 border border-zinc-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white font-mono">
                  {payment.razorpayPaymentId || payment.id}
                </h1>
                <p className="text-xs text-zinc-400 font-mono">Internal ID: {payment.id}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:items-end gap-2">
            <div className="text-2xl md:text-3xl font-extrabold text-white">
              {formatCurrency(payment.amount, payment.currency)}
            </div>
            <div>{getStatusBadge(payment.status)}</div>
          </div>
        </div>
      </div>

      {/* Ledger Balance Summary */}
      {payment.ledgerBalance && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardContent className="p-4 space-y-1">
              <span className="text-xs text-zinc-400 font-medium">Total Captured (Credit)</span>
              <div className="text-xl font-bold text-emerald-400">
                {formatCurrency(payment.ledgerBalance.totalCaptured, payment.currency)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardContent className="p-4 space-y-1">
              <span className="text-xs text-zinc-400 font-medium">Total Refunded (Debit)</span>
              <div className="text-xl font-bold text-rose-400">
                {formatCurrency(payment.ledgerBalance.totalRefunded, payment.currency)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-medium">Available Refund Balance</span>
                {isEligibleForRefund && (
                  <button
                    onClick={() => setIsRefundDialogOpen(true)}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-medium underline"
                  >
                    Refund Now
                  </button>
                )}
              </div>
              <div className="text-xl font-bold text-indigo-400">
                {formatCurrency(payment.ledgerBalance.refundableBalance, payment.currency)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Two Column Grid: Transactions Ledger & State Machine Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Ledger (Immutable Transactions) */}
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardHeader className="pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-400" />
              <CardTitle className="text-base font-semibold">Financial Ledger Entries</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {payment.transactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">No ledger transactions</div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {payment.transactions.map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={tx.direction === "CREDIT" ? "success" : "destructive"}
                          className="text-[10px]"
                        >
                          {tx.direction}
                        </Badge>
                        <span className="text-xs font-semibold text-zinc-200">{tx.type}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-mono">
                        {tx.description || tx.referenceId || tx.id}
                      </p>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-sm font-bold font-mono ${
                          tx.direction === "CREDIT" ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {tx.direction === "CREDIT" ? "+" : "-"}
                        {formatCurrency(tx.amount, tx.currency)}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {new Date(tx.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* State Machine Transition Timeline */}
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardHeader className="pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-400" />
              <CardTitle className="text-base font-semibold">State Machine Events</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {payment.paymentEvents.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500">No state events recorded</div>
            ) : (
              <div className="space-y-3">
                {payment.paymentEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-medium text-zinc-200">
                        <span>{evt.fromStatus || "START"}</span>
                        <span className="text-zinc-500">→</span>
                        <span className="text-emerald-400 font-bold">{evt.toStatus}</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        Trigger: <span className="text-indigo-300">{evt.trigger}</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {new Date(evt.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Audit Log Trail & Order Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Audit Log Entries */}
        <Card className="lg:col-span-2 border-zinc-800 bg-zinc-900/40">
          <CardHeader className="pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <CardTitle className="text-base font-semibold">Audit Log History</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {payment.auditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">No audit logs recorded</div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {payment.auditLogs.map((log) => (
                  <div key={log.id} className="p-3.5 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="font-medium text-zinc-200 font-mono">{log.action}</div>
                      <div className="text-[11px] text-zinc-500">
                        Actor: <span className="text-zinc-400">{log.performedBy || "system"}</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {new Date(log.createdAt).toLocaleString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Details Card */}
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardHeader className="pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-400" />
              <CardTitle className="text-base font-semibold">Associated Order</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            {payment.order ? (
              <>
                <div className="flex justify-between py-1 border-b border-zinc-800/80">
                  <span className="text-zinc-400">Receipt Ref</span>
                  <span className="font-mono text-zinc-200">{payment.order.receipt || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800/80">
                  <span className="text-zinc-400">Order Amount</span>
                  <span className="font-semibold text-zinc-200">
                    {formatCurrency(payment.order.amount, payment.order.currency)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800/80">
                  <span className="text-zinc-400">Order Status</span>
                  <span className="font-medium text-emerald-400">{payment.order.status}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">Created Date</span>
                  <span className="text-zinc-300 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(payment.order.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-zinc-500">No order data linked</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Safe Refund Modal */}
      {isRefundDialogOpen && payment.ledgerBalance && (
        <RefundDialog
          isOpen={isRefundDialogOpen}
          onClose={() => setIsRefundDialogOpen(false)}
          paymentId={payment.id}
          razorpayPaymentId={payment.razorpayPaymentId}
          maxRefundableAmount={payment.ledgerBalance.refundableBalance}
          currency={payment.currency}
          onRefundSuccess={() => {
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
