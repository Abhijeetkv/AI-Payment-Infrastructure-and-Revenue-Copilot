import { BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Revenue & Payment Analytics
            </h1>
            <Badge variant="outline">Phase 6</Badge>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Server-side PostgreSQL aggregations, daily metric cron rollups, and payment method performance metrics.
          </p>
        </div>
      </div>

      <Card className="border-dashed">
        <CardContent className="p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Analytics Engine
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Custom date ranges, method breakdowns, failure analysis charts, and DailyMetric rollups will activate in Phase 6.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
