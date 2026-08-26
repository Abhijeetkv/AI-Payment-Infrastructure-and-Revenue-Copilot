import { Webhook } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function WebhooksPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Webhook Event Monitor
            </h1>
            <Badge variant="outline">Phase 4</Badge>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            HMAC-SHA256 signature verification, deduplication, retry tracking, and asynchronous event log.
          </p>
        </div>
      </div>

      <Card className="border-dashed">
        <CardContent className="p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Webhook className="h-6 w-6" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Reliable Webhook Ingestion
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Webhook logging, deduplication via unique event ID index, and Inngest background dispatch will activate in Phase 4.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
