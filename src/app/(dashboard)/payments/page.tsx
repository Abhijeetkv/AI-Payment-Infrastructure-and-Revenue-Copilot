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

  // Razorpay Test Checkout Modal State
  const [showCheckoutModal, setShowCheckoutModal] = React.useState(false);
  const [checkoutAmount, setCheckoutAmount] = React.useState<number>(499);
  const [customerName, setCustomerName] = React.useState<string>("Aditi Sen");
  const [customerEmail, setCustomerEmail] = React.useState<string>("aditi.sen@example.com");
  const [isProcessing, setIsProcessing] = React.useState(false);

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

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && window.Razorpay) {
        return resolve(true);
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleLaunchCheckout = async () => {
    try {
      setIsProcessing(true);

      // 1. Ensure Razorpay Checkout script is loaded
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert("Failed to load Razorpay Checkout SDK. Please check your network.");
        return;
      }

      // 2. Create order on backend via Razorpay Test API
      const amountPaise = Math.round(Number(checkoutAmount) * 100);
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt: `rcpt_chk_${Date.now()}`,
          notes: {
            customer_name: customerName,
            customer_email: customerEmail,
          },
        }),
      });

      const orderJson = await orderRes.json();
      if (!orderJson.success || !orderJson.data) {
        throw new Error(orderJson.error?.message || "Failed to create Razorpay test order");
      }

      const order = orderJson.data;

      // 3. Open Razorpay Test Mode Checkout Modal
      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_TYQzggcAL1BBy5";

      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Lumina AI Payment Hub",
        description: "Test Mode Transaction Verification",
        order_id: order.razorpayOrderId,
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: "9876543210",
        },
        theme: {
          color: "#2a21d2",
        },
        handler: async function (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) {
          try {
            // 4. Verify signature on backend and record in PostgreSQL + Immutable Ledger
            const verifyRes = await fetch("/api/payments", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: order.id,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                amount: order.amount,
                currency: order.currency || "INR",
                paymentMethod: "card",
              }),
            });

            const verifyJson = await verifyRes.json();
            if (verifyJson.success) {
              setShowCheckoutModal(false);
              fetchPayments();
            } else {
              alert("Payment verification issue: " + verifyJson.error?.message);
            }
          } catch (err: unknown) {
            console.error("Verification error:", err);
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
          },
        },
      };

      if (!window.Razorpay) {
        throw new Error("Razorpay SDK not available");
      }

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.on("payment.failed", function (failResponse: { error?: { description?: string } }) {
        console.warn("Razorpay payment failed as requested in test mode:", failResponse.error);
        setShowCheckoutModal(false);
        fetchPayments();
      });

      rzpInstance.open();
    } catch (error: unknown) {
      console.error("Checkout initiation error:", error);
      const msg = error instanceof Error ? error.message : "Failed to open Razorpay Checkout";
      alert(msg);
    } finally {
      setIsProcessing(false);
    }
  };

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

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowCheckoutModal(true)}
            className="h-9 gap-1.5 text-xs text-white bg-[#2a21d2] hover:bg-[#1b1599] shadow-xs cursor-pointer font-semibold"
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>Pay with Razorpay Test Modal</span>
          </Button>

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
      </div>

      {/* Interactive Razorpay Test Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#e9ecef] rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#e9ecef] pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#e0e0ff] text-[#2a21d2] flex items-center justify-center">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#191c1d]">Razorpay Test Checkout</h3>
                  <p className="text-[11px] text-[#444748]">Creates a live order and opens Razorpay Test Modal</p>
                </div>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="text-[#747878] hover:text-[#191c1d] text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#191c1d] block mb-1">Amount (INR)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-[#747878] font-bold">₹</span>
                  <input
                    type="number"
                    value={checkoutAmount}
                    onChange={(e) => setCheckoutAmount(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-1.5 border border-[#c4c7c7] rounded-md text-xs font-mono"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#191c1d] block mb-1">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#c4c7c7] rounded-md text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-[#191c1d] block mb-1">Customer Email</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#c4c7c7] rounded-md text-xs"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-[#f8f9fa] border border-[#e9ecef] space-y-1 text-[11px] text-[#444748]">
                <div className="font-semibold text-[#191c1d]">Razorpay Test Mode Helper:</div>
                <div>• Use Test Card: <code className="bg-white px-1 py-0.5 rounded border border-[#e9ecef] font-mono">4111 1111 1111 1111</code></div>
                <div>• Expiry: Any future date (e.g. <code className="font-mono">12/30</code>), CVV: <code className="font-mono">123</code></div>
                <div>• In the simulated bank page, select <strong>Success</strong> or <strong>Failure</strong> to test!</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e9ecef]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCheckoutModal(false)}
                disabled={isProcessing}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleLaunchCheckout}
                disabled={isProcessing}
                className="bg-[#2a21d2] hover:bg-[#1b1599] text-white text-xs font-semibold gap-1.5"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Opening Checkout...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5" />
                    <span>Launch Razorpay Checkout</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

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

