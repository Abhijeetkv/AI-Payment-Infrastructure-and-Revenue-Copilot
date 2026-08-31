"use client";

import * as React from "react";
import Link from "next/link";
import {
  CreditCard,
  RefreshCw,
  Loader2,
  Building2,
  Zap,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
    setLoading(true);
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
      .catch(() => { })
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#087343]/10 text-[#087343] border border-[#087343]/20 uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-[#087343]" />
            SUCCESS
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#c92a2a]/10 text-[#c92a2a] border border-[#c92a2a]/20 uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-[#c92a2a]" />
            FAILED
          </span>
        );
      case "REFUNDED":
      case "PARTIALLY_REFUNDED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#f59e0b]/10 text-[#b45309] border border-[#f59e0b]/20 uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
            REFUNDED
          </span>
        );
      case "PENDING":
      case "PROCESSING":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#f3f4f5] text-[#444748] border border-[#c4c7c7] uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-[#747878]" />
            PROCESSING
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e9ecef] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191c1d]">
              Payments Ledger
            </h2>
            <span className="text-xs font-semibold text-[#087343] bg-[#087343]/10 px-2 py-0.5 rounded border border-[#087343]/20">
              Double-Entry Invariance
            </span>
          </div>
          <p className="text-sm text-[#444748] mt-1 font-normal">
            Verified payment transactions, state machine transitions, and ledger credit records.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchPayments}
          disabled={loading}
          className="h-9 gap-1.5 text-xs text-[#191c1d] bg-white border-[#c4c7c7] hover:bg-[#f3f4f5] shadow-xs cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#2a21d2]" : ""}`} />
          <span>Refresh Ledger</span>
        </Button>
      </div>

      {/* Payments Table Card */}
      <div className="border border-[#e9ecef] bg-white shadow-xs rounded-lg overflow-hidden">
        {loading && payments.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-6 w-6 animate-spin text-[#2a21d2]" />
            <span className="text-xs text-[#444748] font-mono">Loading payment ledger...</span>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="h-12 w-12 rounded-lg bg-[#f3f4f5] border border-[#e9ecef] flex items-center justify-center text-[#444748]">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#191c1d]">
                No Payments Ingested Yet
              </h3>
              <p className="text-xs text-[#444748] mt-1">
                Run failure simulations or seed 90-day transactions in Settings.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/simulator">
                <Button size="sm" className="h-8 text-xs bg-[#2a21d2] hover:bg-[#2a21d2]/90 text-white font-semibold">
                  Launch Simulator
                </Button>
              </Link>
              <Link href="/settings">
                <Button size="sm" variant="outline" className="h-8 text-xs">
                  Generate Seed Data
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#f3f4f5] text-[#444748] border-b border-[#e9ecef] font-medium">
                <tr>
                  <th className="py-3.5 px-6">Payment ID</th>
                  <th className="py-3.5 px-6">Order / Receipt</th>
                  <th className="py-3.5 px-6">Amount</th>
                  <th className="py-3.5 px-6">Method</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Timestamp</th>
                  <th className="py-3.5 px-6 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9ecef]">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-[#f3f4f5]/60 transition-colors">
                    <td className="py-4 px-6 font-mono font-medium text-[#191c1d]">
                      {p.razorpayPaymentId || p.id.slice(0, 16)}
                    </td>
                    <td className="py-4 px-6 font-mono text-[#444748]">
                      {p.order?.receipt || p.orderId.slice(0, 12)}
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-[#191c1d]">
                      {formatCurrency(p.amount, p.currency)}
                    </td>
                    <td className="py-4 px-6 text-[#191c1d]">
                      <div className="flex items-center gap-1.5">
                        {p.paymentMethod?.toLowerCase().includes("upi") ? (
                          <Zap className="h-3.5 w-3.5 text-[#747878]" />
                        ) : p.paymentMethod?.toLowerCase().includes("bank") ? (
                          <Building2 className="h-3.5 w-3.5 text-[#747878]" />
                        ) : (
                          <CreditCard className="h-3.5 w-3.5 text-[#747878]" />
                        )}
                        <span className="capitalize">{p.paymentMethod || "card"}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {getStatusBadge(p.status)}
                    </td>
                    <td className="py-4 px-6 text-[#747878] font-mono text-[11px]">
                      {new Date(p.createdAt).toLocaleString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        href={`/payments/${p.id}`}
                        className="text-[#2a21d2] hover:underline font-semibold inline-flex items-center gap-1"
                      >
                        <span>Inspect</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

