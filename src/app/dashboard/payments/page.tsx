import { CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Payments & Ledger
            </h1>
            <Badge variant="outline">Phase 2 & 3</Badge>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Real-time payment verification, state machine transitions, and immutable transaction ledger.
          </p>
        </div>
      </div>

      <Card className="border-dashed">
        <CardContent className="p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <CreditCard className="h-6 w-6" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Payment State Machine & Ledger
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Razorpay Checkout verification, deterministic status transitions, and double-entry transaction records will activate in Phase 2 & 3.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
