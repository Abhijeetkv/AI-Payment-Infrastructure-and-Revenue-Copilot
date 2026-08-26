"use client";

import * as React from "react";
import {
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface RefundDialogProps {
  isOpen: boolean;
  onClose: () => void;
  paymentId: string;
  razorpayPaymentId?: string | null;
  maxRefundableAmount: number; // in paise
  currency?: string;
  onRefundSuccess?: (result: {
    refundId: string;
    amount: number;
    remainingBalance: number;
    newPaymentStatus: string;
  }) => void;
}

const REASON_PRESETS = [
  "Customer requested refund",
  "Product returned / defective",
  "Accidental duplicate charge",
  "Service dissatisfaction",
  "Fraudulent / suspicious activity",
  "Other",
];

export function RefundDialog({
  isOpen,
  onClose,
  paymentId,
  razorpayPaymentId,
  maxRefundableAmount,
  currency = "INR",
  onRefundSuccess,
}: RefundDialogProps) {
  const [amountInput, setAmountInput] = React.useState<string>(
    (maxRefundableAmount / 100).toFixed(2)
  );
  const [reason, setReason] = React.useState<string>(REASON_PRESETS[0]);
  const [customReason, setCustomReason] = React.useState<string>("");
  const [speed, setSpeed] = React.useState<"normal" | "optimum">("normal");
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (isOpen) {
      setAmountInput((maxRefundableAmount / 100).toFixed(2));
      setReason(REASON_PRESETS[0]);
      setCustomReason("");
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, maxRefundableAmount]);

  if (!isOpen) return null;

  const parsedAmountPaise = Math.round((parseFloat(amountInput) || 0) * 100);
  const isOverLimit = parsedAmountPaise > maxRefundableAmount;
  const isZeroOrNegative = parsedAmountPaise <= 0;
  const isFullRefund = parsedAmountPaise === maxRefundableAmount;
  const remainingBalancePaise = Math.max(0, maxRefundableAmount - parsedAmountPaise);

  const handleFullAmountClick = () => {
    setAmountInput((maxRefundableAmount / 100).toFixed(2));
    setError(null);
  };

  const handleHalfAmountClick = () => {
    const half = Math.floor(maxRefundableAmount / 2);
    setAmountInput((half / 100).toFixed(2));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOverLimit || isZeroOrNegative) return;

    setLoading(true);
    setError(null);

    const finalReason = reason === "Other" ? (customReason.trim() || "Other reason") : reason;

    try {
      const response = await fetch(`/api/payments/${paymentId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedAmountPaise,
          reason: finalReason,
          speed,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to process refund");
      }

      setSuccess(true);

      if (onRefundSuccess) {
        onRefundSuccess({
          refundId: json.data.refund.id,
          amount: parsedAmountPaise,
          remainingBalance: json.data.remainingBalance,
          newPaymentStatus: json.data.paymentStatus,
        });
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Refund failed to execute");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-6 space-y-6 text-zinc-100 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Issue Safe Refund</h2>
              <p className="text-xs text-zinc-400 font-mono">
                {razorpayPaymentId || `Payment: ${paymentId.slice(0, 12)}...`}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-indigo-400 border-indigo-500/30 text-[10px]">
            Double-Entry Safe
          </Badge>
        </div>

        {success ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-3 text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-white">Refund Successfully Recorded</h3>
            <p className="text-xs text-zinc-400 max-w-xs">
              Ledger DEBIT has been posted and payment status has been synchronized.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800/80 flex items-start gap-2.5 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Live Ledger Balance Notice */}
            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[11px] text-zinc-400">Available Refundable Balance</span>
                <div className="text-sm font-bold text-emerald-400 font-mono">
                  {formatCurrency(maxRefundableAmount, currency)}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleHalfAmountClick}
                  className="h-7 text-[11px] px-2 text-zinc-300 hover:text-white"
                >
                  50%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFullAmountClick}
                  className="h-7 text-[11px] px-2.5 text-indigo-400 border-indigo-500/40 hover:bg-indigo-950/40"
                >
                  Full Amount
                </Button>
              </div>
            </div>

            {/* Refund Amount Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">
                Refund Amount ({currency})
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-mono">
                  ₹
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amountInput}
                  onChange={(e) => {
                    setAmountInput(e.target.value);
                    setError(null);
                  }}
                  className={`pl-8 font-mono bg-zinc-900 border-zinc-800 ${
                    isOverLimit ? "border-rose-500 focus-visible:ring-rose-500" : ""
                  }`}
                  placeholder="0.00"
                  required
                />
              </div>
              {isOverLimit ? (
                <p className="text-[11px] text-rose-400">
                  Amount exceeds maximum refundable balance of{" "}
                  {formatCurrency(maxRefundableAmount, currency)}
                </p>
              ) : isZeroOrNegative ? (
                <p className="text-[11px] text-rose-400">Amount must be greater than 0</p>
              ) : null}
            </div>

            {/* Reason Dropdown & Custom Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Reason for Refund</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-9 rounded-md bg-zinc-900 border border-zinc-800 px-3 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {REASON_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
              </select>

              {reason === "Other" && (
                <Input
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Specify refund reason..."
                  className="text-xs bg-zinc-900 border-zinc-800 mt-2"
                  required
                />
              )}
            </div>

            {/* Speed Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Processing Speed</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSpeed("normal")}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                    speed === "normal"
                      ? "bg-indigo-950/40 border-indigo-500/60 text-white"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <div className="font-semibold">Normal Speed</div>
                  <div className="text-[10px] text-zinc-400">5-7 Business Days</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSpeed("optimum")}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                    speed === "optimum"
                      ? "bg-indigo-950/40 border-indigo-500/60 text-white"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <div className="font-semibold">Optimum / Instant</div>
                  <div className="text-[10px] text-zinc-400">Instant via UPI/IMPS</div>
                </button>
              </div>
            </div>

            {/* Projected Ledger Outcome Preview */}
            <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Refund Type</span>
                <span className="font-semibold text-zinc-200">
                  {isFullRefund ? "Full Refund (100%)" : "Partial Refund"}
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Remaining Balance</span>
                <span className="font-mono text-zinc-200">
                  {formatCurrency(remainingBalancePaise, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>New Payment State</span>
                <Badge
                  variant={isFullRefund ? "warning" : "default"}
                  className="text-[10px] px-2 py-0.5"
                >
                  {isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED"}
                </Badge>
              </div>
            </div>

            {/* Warning Note */}
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>This will create an immutable DEBIT entry in the transaction ledger.</span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={loading}
                className="text-zinc-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading || isOverLimit || isZeroOrNegative}
                className="gap-2 bg-rose-600 hover:bg-rose-500 text-white font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing Refund...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Refund</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
