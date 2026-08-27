"use client";

import * as React from "react";
import {
  Plus,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Loader2,
  Copy,
  Check,
  Receipt,
} from "lucide-react";
import { CheckoutButton } from "@/components/payments/checkout-button";
import { Button } from "@/components/ui/button";

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
  const [selectedFilter, setSelectedFilter] = React.useState<"ALL" | "PAID" | "CREATED" | "FAILED">("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Form State
  const [amountRupees, setAmountRupees] = React.useState("4500");
  const [receiptNumber, setReceiptNumber] = React.useState("");
  const [customerNote, setCustomerNote] = React.useState("Standard Order Test");
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
          receipt: receiptNumber || `ord_${Date.now().toString().slice(-8)}`,
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
      setAmountRupees("4500");
      setReceiptNumber("");
      fetchOrders();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredOrders = React.useMemo(() => {
    return orders.filter((order) => {
      // Status filter
      if (selectedFilter === "PAID" && order.status !== "PAID") return false;
      if (selectedFilter === "CREATED" && order.status !== "CREATED" && order.status !== "ATTEMPTED") return false;
      if (selectedFilter === "FAILED" && order.status !== "FAILED" && order.status !== "EXPIRED") return false;

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesId = order.id.toLowerCase().includes(query);
        const matchesRazorpay = (order.razorpayOrderId || "").toLowerCase().includes(query);
        const matchesReceipt = (order.receipt || "").toLowerCase().includes(query);
        const matchesPayment = order.payments.some((p) => (p.razorpayPaymentId || "").toLowerCase().includes(query));
        return matchesId || matchesRazorpay || matchesReceipt || matchesPayment;
      }

      return true;
    });
  }, [orders, selectedFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#191c1d] tracking-tight">Orders</h2>
          <p className="text-xs text-[#464555] mt-1">Manage and track your customer orders.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchOrders}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f8f9fa] border border-[#c7c4d8] rounded-lg text-xs font-medium text-[#191c1d] hover:bg-[#f3f4f5] transition-colors cursor-pointer"
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filter</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2a21d2] text-white rounded-lg text-xs font-semibold hover:bg-[#2a21d2]/90 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Order</span>
          </button>
        </div>
      </div>

      {/* Quick Order Creation Modal */}
      {showCreateModal && (
        <div className="border border-[#c7c4d8] bg-white rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#e9ecef] pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded bg-[#dbeafe] flex items-center justify-center text-[#2a21d2]">
                <Receipt className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-[#191c1d]">Create New Order</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="text-xs text-[#747878] hover:text-[#191c1d] cursor-pointer"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleCreateOrder} className="space-y-4">
            {formError && (
              <div className="p-2.5 rounded bg-[#ffdad6] border border-[#ba1a1a]/20 text-[#93000a] text-xs font-semibold">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="order-amount" className="text-xs font-semibold text-[#464555]">
                  Amount (₹ INR)
                </label>
                <input
                  id="order-amount"
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={amountRupees}
                  onChange={(e) => setAmountRupees(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-[#c7c4d8] bg-white text-[#191c1d] focus:outline-none focus:border-[#2a21d2]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="order-receipt" className="text-xs font-semibold text-[#464555]">
                  Receipt ID (Optional)
                </label>
                <input
                  id="order-receipt"
                  placeholder="ord_Lx8w9Q2p"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-[#c7c4d8] bg-white text-[#191c1d] focus:outline-none focus:border-[#2a21d2] font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="order-note" className="text-xs font-semibold text-[#464555]">
                  Customer Note / Description
                </label>
                <input
                  id="order-note"
                  placeholder="Order for standard items"
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-[#c7c4d8] bg-white text-[#191c1d] focus:outline-none focus:border-[#2a21d2]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateModal(false)}
                className="text-xs text-[#464555] hover:text-[#191c1d]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={creating}
                className="bg-[#2a21d2] hover:bg-[#2a21d2]/90 text-white gap-2 text-xs font-semibold"
              >
                {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Generate Razorpay Order</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Filters & Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-2 border border-[#c7c4d8] rounded-t-lg border-b-0 gap-3">
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setSelectedFilter("ALL")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              selectedFilter === "ALL"
                ? "bg-[#dbeafe] text-[#1e40af] border border-transparent font-semibold"
                : "bg-white text-[#464555] border border-[#c7c4d8] hover:bg-[#f3f4f5]"
            }`}
          >
            All Orders
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter("PAID")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              selectedFilter === "PAID"
                ? "bg-[#dbeafe] text-[#1e40af] border border-transparent font-semibold"
                : "bg-white text-[#464555] border border-[#c7c4d8] hover:bg-[#f3f4f5]"
            }`}
          >
            Captured
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter("CREATED")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              selectedFilter === "CREATED"
                ? "bg-[#dbeafe] text-[#1e40af] border border-transparent font-semibold"
                : "bg-white text-[#464555] border border-[#c7c4d8] hover:bg-[#f3f4f5]"
            }`}
          >
            Created
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter("FAILED")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              selectedFilter === "FAILED"
                ? "bg-[#dbeafe] text-[#1e40af] border border-transparent font-semibold"
                : "bg-white text-[#464555] border border-[#c7c4d8] hover:bg-[#f3f4f5]"
            }`}
          >
            Failed
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#777587] h-3.5 w-3.5" />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#c7c4d8] rounded-lg text-xs text-[#191c1d] focus:border-[#2a21d2] focus:outline-none focus:ring-1 focus:ring-[#2a21d2]/20 transition-all placeholder:text-[#777587]"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-[#c7c4d8] rounded-b-lg overflow-x-auto shadow-xs">
        {loading && orders.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-6 w-6 animate-spin text-[#2a21d2]" />
            <span className="text-xs text-[#777587] font-mono">Loading orders...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#777587] font-mono">
            No orders found matching the filter or search criteria.
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-[#f3f4f5] border-b border-[#c7c4d8]">
                <th className="px-4 py-2.5 text-[11px] font-semibold text-[#464555] uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-[#464555] uppercase tracking-wider text-right">
                  Amount
                </th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-[#464555] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-[#464555] uppercase tracking-wider">
                  Payment Link / ID
                </th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-[#464555] uppercase tracking-wider">
                  Created Date
                </th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-[#464555] uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c7c4d8]/50">
              {filteredOrders.map((order) => {
                const formattedAmount = (order.amount / 100).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
                const displayOrderId = order.razorpayOrderId || order.receipt || `ord_${order.id.slice(0, 8)}`;
                const paymentId = order.payments[0]?.razorpayPaymentId || (order.status === "CREATED" ? `plink_${order.id.slice(0, 6)}` : `pay_${order.id.slice(0, 8)}`);

                return (
                  <tr key={order.id} className="hover:bg-[#f3f4f5]/50 transition-colors group">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-[#2a21d2] font-medium cursor-pointer hover:underline">
                        {displayOrderId}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-xs text-[#191c1d] tabular-nums font-semibold">
                        ₹ {formattedAmount}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {order.status === "PAID" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                          Captured
                        </span>
                      ) : order.status === "CREATED" || order.status === "ATTEMPTED" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                          Created
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#ffdad6] text-[#93000a]">
                          Failed
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {order.status === "CREATED" ? (
                          <span
                            onClick={() => copyToClipboard(paymentId, order.id)}
                            className="font-mono text-xs text-[#2a21d2] cursor-pointer hover:underline flex items-center gap-1"
                            title="Click to copy payment link"
                          >
                            {paymentId}
                            {copiedId === order.id ? (
                              <Check className="h-3 w-3 text-[#087343]" />
                            ) : (
                              <Copy className="h-2.5 w-2.5 text-[#777587]" />
                            )}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-[#464555]">
                            {paymentId}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-xs text-[#464555]">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      ·{" "}
                      {new Date(order.createdAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {order.status === "CREATED" && order.razorpayOrderId ? (
                        <CheckoutButton
                          orderId={order.id}
                          razorpayOrderId={order.razorpayOrderId}
                          amount={order.amount}
                          currency={order.currency}
                          onSuccess={() => fetchOrders()}
                        />
                      ) : (
                        <button
                          type="button"
                          className="text-[#464555] hover:text-[#2a21d2] opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-1 text-xs text-[#464555]">
        <div>
          Showing <span className="font-medium text-[#191c1d]">1</span> to{" "}
          <span className="font-medium text-[#191c1d]">{Math.min(filteredOrders.length, 50)}</span> of{" "}
          <span className="font-medium text-[#191c1d]">{filteredOrders.length}</span> results
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled
            className="px-3 py-1 border border-[#c7c4d8] rounded-md text-[#464555] opacity-50 cursor-not-allowed flex items-center gap-1"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Previous</span>
          </button>

          <button
            type="button"
            className="px-3 py-1 border border-[#c7c4d8] rounded-md text-[#191c1d] bg-white hover:bg-[#f3f4f5] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
