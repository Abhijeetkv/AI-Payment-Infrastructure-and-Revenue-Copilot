"use client";

import * as React from "react";
import { CreditCard, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CheckoutButtonProps {
  orderId: string;
  razorpayOrderId: string;
  amount: number; // in paise
  currency?: string;
  orderName?: string;
  description?: string;
  onSuccess?: (payment: Record<string, unknown>) => void;
  onFailure?: (error: Error) => void;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: Record<string, unknown>) => void) => void;
    };
  }
}

export function CheckoutButton({
  orderId,
  razorpayOrderId,
  amount,
  currency = "INR",
  orderName = "Revenue Copilot Test Payment",
  description = "Safe Test Mode Transaction",
  onSuccess,
  onFailure,
  className,
  size = "sm",
}: CheckoutButtonProps) {
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState<"idle" | "verifying" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async () => {
    try {
      setLoading(true);
      setStatus("idle");
      setErrorMessage(null);

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error("Failed to load Razorpay Checkout SDK. Please check your connection.");
      }

      const keyId =
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_placeholder_key";

      const options = {
        key: keyId,
        amount,
        currency,
        name: orderName,
        description,
        order_id: razorpayOrderId,
        theme: {
          color: "#4f46e5",
        },
        handler: async function (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          setStatus("verifying");
          try {
            const verifyRes = await fetch("/api/payments", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                amount,
                currency,
                paymentMethod: "upi",
              }),
            });

            const data = await verifyRes.json();
            if (!verifyRes.ok || !data.success) {
              throw new Error(data.error?.message || "Payment verification failed");
            }

            setStatus("success");
            onSuccess?.(data.data);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Verification error";
            setStatus("error");
            setErrorMessage(msg);
            onFailure?.(err instanceof Error ? err : new Error(msg));
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.open();
    } catch (err: unknown) {
      setLoading(false);
      setStatus("error");
      const msg = err instanceof Error ? err.message : "Checkout initialization failed";
      setErrorMessage(msg);
      onFailure?.(err instanceof Error ? err : new Error(msg));
    }
  };

  if (status === "success") {
    return (
      <Button
        disabled
        size={size}
        className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 gap-1.5 cursor-default font-medium"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>Paid & Verified</span>
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        onClick={handleCheckout}
        disabled={loading}
        size={size}
        className={className || "bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-medium shadow-sm"}
      >
        {loading || status === "verifying" ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{status === "verifying" ? "Verifying..." : "Opening..."}</span>
          </>
        ) : (
          <>
            <CreditCard className="h-3.5 w-3.5" />
            <span>Pay Test Checkout</span>
          </>
        )}
      </Button>
      {errorMessage && (
        <span className="text-[10px] text-rose-400 flex items-center gap-1 mt-0.5">
          <AlertCircle className="h-3 w-3" />
          {errorMessage}
        </span>
      )}
    </div>
  );
}
