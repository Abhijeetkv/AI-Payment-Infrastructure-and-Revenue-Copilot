"use client";

import * as React from "react";
import {
  ShoppingCart,
  Plus,
  RefreshCw,
  Loader2,
  Receipt,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckoutButton } from "@/components/payments/checkout-button";
import { formatCurrency } from "@/lib/utils";

interface OrderItem {
  id: string;
  amount: number;
  currency: string;
  status: "CREATED" | "ATTEMPTED" | "PAID" | "FAILED" | "EXPIRED";
  razorpayOrderId: string | null;
  receipt: string | null;
  createdAt: string;
  payments: Array<{
    id: string;
    status: string;
    razorpayPaymentId: string | null;
  }>;
}

export default function OrdersPage() {
  const [orders, setOrders] = React.useState<OrderItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [showCreateModal, setShowCreateModal] = React.useState(false);

  // Form State
  const [amountRupees, setAmountRupees] = React.useState("499");
  const [receiptNumber, setReceiptNumber] = React.useState("");
  const [customerNote, setCustomerNote] = React.useState("Pro Subscription Test");
  const [formError, setFormError] = React.useState<string | null>(null);

  const fetchOrders = React.useCallback(async () => {
    try {
      const res = await fetch("/api/orders?limit=50");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setOrders(json.data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    fetch("/api/orders?limit=50")
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success && Array.isArray(json.data)) {
          setOrders(json.data);
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

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const amountInPaise = Math.round(parseFloat(amountRupees) * 100);

    if (isNaN(amountInPaise) || amountInPaise <= 0) {
      setFormError("Please enter a valid amount in ₹ (INR)");
      return;
    }

    try {
      setCreating(true);
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: "INR",
          receipt: receiptNumber || `rcpt_${Date.now()}`,
          notes: {
            purpose: customerNote || "Standard Checkout",
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to create order");
      }

      setShowCreateModal(false);
      setAmountRupees("499");
      setReceiptNumber("");
      fetchOrders();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge variant="success">PAID</Badge>;
      case "CREATED":
        return <Badge variant="default">CREATED</Badge>;
      case "ATTEMPTED":
        return <Badge variant="warning">ATTEMPTED</Badge>;
      case "FAILED":
        return <Badge variant="destructive">FAILED</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Orders Management
            </h1>
            <Badge variant="outline" className="text-indigo-400 border-indigo-500/30">
              Razorpay API Active
            </Badge>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Create, launch test checkout modals, and trace order life-cycles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            disabled={loading}
            className="gap-2 border-zinc-200 dark:border-zinc-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={() => setShowCreateModal(true)}
            size="sm"
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Create Order</span>
          </Button>
        </div>
      </div>

      {/* Quick Order Creation Modal / Collapsible Form */}
      {showCreateModal && (
        <Card className="border-indigo-500/30 bg-gradient-to-b from-indigo-950/20 to-zinc-950/80 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-indigo-400" />
                <CardTitle className="text-base font-semibold">New Order Parameters</CardTitle>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
            </div>
            <CardDescription className="text-xs">
              Orders are generated via Razorpay Test API and stored for payment verification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateOrder} className="space-y-4">
              {formError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="amount" className="text-xs text-zinc-300">
                    Amount (₹ INR)
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={amountRupees}
                    onChange={(e) => setAmountRupees(e.target.value)}
                    className="h-9 text-sm bg-zinc-900 border-zinc-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="receipt" className="text-xs text-zinc-300">
                    Receipt Ref (Optional)
                  </Label>
                  <Input
                    id="receipt"
                    placeholder="rcpt_custom_101"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    className="h-9 text-sm bg-zinc-900 border-zinc-800 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="note" className="text-xs text-zinc-300">
                    Customer Note / Purpose
                  </Label>
                  <Input
                    id="note"
                    placeholder="E-commerce demo purchase"
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    className="h-9 text-sm bg-zinc-900 border-zinc-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={creating}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                >
                  {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Generate Razorpay Order</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {loading && orders.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              <span className="text-xs text-zinc-400">Loading orders...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  No Orders Created Yet
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Click below to generate a ₹499 test order and verify Razorpay Checkout.
                </p>
              </div>
              <Button
                onClick={() => setShowCreateModal(true)}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create Test Order</span>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 font-medium">Order / Receipt</th>
                    <th className="py-3 px-4 font-medium">Razorpay Order ID</th>
                    <th className="py-3 px-4 font-medium">Amount</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium">Date</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {order.receipt || order.id.slice(0, 12)}
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                          {order.id}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-xs text-indigo-400">
                          {order.razorpayOrderId || "—"}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(order.amount, order.currency)}
                      </td>

                      <td className="py-3 px-4">{getStatusBadge(order.status)}</td>

                      <td className="py-3 px-4 text-xs text-zinc-500 dark:text-zinc-400">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {order.status === "CREATED" && order.razorpayOrderId ? (
                          <CheckoutButton
                            orderId={order.id}
                            razorpayOrderId={order.razorpayOrderId}
                            amount={order.amount}
                            currency={order.currency}
                            onSuccess={() => fetchOrders()}
                          />
                        ) : order.status === "PAID" ? (
                          <span className="text-xs text-emerald-500 font-medium inline-flex items-center gap-1">
                            Captured <ExternalLink className="h-3 w-3" />
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-500">—</span>
                        )}
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
