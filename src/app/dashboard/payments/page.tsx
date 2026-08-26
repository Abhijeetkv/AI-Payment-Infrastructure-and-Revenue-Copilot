"use client";

import * as React from "react";
import {
  CreditCard,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface PaymentItem {
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
    receipt: string | null;
  };
}

export default function PaymentsPage() {
  const [payments, setPayments] = React.useState<PaymentItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchPayments = React.useCallback(async () => {
    try {
      const res = await fetch("/api/payments?limit=50");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPayments(json.data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    fetch("/api/payments?limit=50")
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success && Array.isArray(json.data)) {
          setPayments(json.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCESS":
      case "CAPTURED":
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>SUCCESS</span>
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            <span>FAILED</span>
          </Badge>
        );
      case "REFUNDED":
        return (
          <Badge variant="warning" className="gap-1">
            <RotateCcw className="h-3 w-3" />
            <span>REFUNDED</span>
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            <span>PENDING</span>
          </Badge>
        );
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Payments & Transactions
            </h1>
            <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
              Double-Entry Ledger
            </Badge>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Verified Razorpay payments, state machine audit records, and method breakdowns.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchPayments}
          disabled={loading}
          className="gap-2 border-zinc-200 dark:border-zinc-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Ledger</span>
        </Button>
      </div>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          {loading && payments.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              <span className="text-xs text-zinc-400">Loading payment ledger...</span>
            </div>
          ) : payments.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <CreditCard className="h-6 w-6" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  No Payments Captured Yet
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Navigate to Orders and complete a test checkout to record your first verified payment.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 font-medium">Payment ID</th>
                    <th className="py-3 px-4 font-medium">Order / Receipt</th>
                    <th className="py-3 px-4 font-medium">Amount</th>
                    <th className="py-3 px-4 font-medium">Method</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium text-right">Captured At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {payments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-semibold text-indigo-400">
                          {payment.razorpayPaymentId || payment.id.slice(0, 14)}
                        </span>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          {payment.id}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                        {payment.order?.receipt || payment.orderId.slice(0, 12)}
                      </td>

                      <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(payment.amount, payment.currency)}
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 uppercase">
                          {payment.paymentMethod || "UPI"}
                        </span>
                      </td>

                      <td className="py-3 px-4">{getStatusBadge(payment.status)}</td>

                      <td className="py-3 px-4 text-xs text-zinc-500 dark:text-zinc-400 text-right">
                        {new Date(payment.createdAt).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
