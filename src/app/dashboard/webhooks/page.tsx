"use client";

import * as React from "react";
import {
  Webhook,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Code2,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface WebhookItem {
  id: string;
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: "RECEIVED" | "PROCESSING" | "DELIVERED" | "FAILED" | "RETRYING" | "DUPLICATE";
  attemptCount: number;
  lastError: string | null;
  processedAt: string | null;
  createdAt: string;
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = React.useState<WebhookItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedPayload, setSelectedPayload] = React.useState<WebhookItem | null>(null);
  const [simulating, setSimulating] = React.useState(false);

  const fetchWebhooks = React.useCallback(async () => {
    try {
      const res = await fetch("/api/webhooks/razorpay");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setWebhooks(json.data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    fetch("/api/webhooks/razorpay")
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success && Array.isArray(json.data)) {
          setWebhooks(json.data);
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

  const handleSimulateWebhook = async () => {
    try {
      setSimulating(true);
      const simulatedEventId = `evt_sim_${Date.now()}`;
      const samplePayload = {
        event_id: simulatedEventId,
        event: "payment.captured",
        created_at: Math.floor(Date.now() / 1000),
        payload: {
          payment: {
            entity: {
              id: `pay_sim_${Date.now()}`,
              amount: 99900,
              currency: "INR",
              status: "captured",
              method: "upi",
              order_id: `order_sim_${Date.now()}`,
            },
          },
        },
      };

      await fetch("/api/webhooks/razorpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(samplePayload),
      });

      // Refresh list
      fetchWebhooks();
    } catch {
      // Ignore
    } finally {
      setSimulating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return (
          <Badge variant="success" className="gap-1 text-[11px]">
            <CheckCircle2 className="h-3 w-3" />
            <span>DELIVERED</span>
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge variant="warning" className="gap-1 text-[11px]">
            <Clock className="h-3 w-3 animate-spin" />
            <span>PROCESSING</span>
          </Badge>
        );
      case "DUPLICATE":
        return (
          <Badge variant="secondary" className="gap-1 text-[11px]">
            <span>DUPLICATE</span>
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="destructive" className="gap-1 text-[11px]">
            <AlertTriangle className="h-3 w-3" />
            <span>FAILED</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="default" className="text-[11px]">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Webhook Event Ingestion
            </h1>
            <Badge variant="outline" className="text-indigo-400 border-indigo-500/30">
              HMAC-SHA256 & Deduplication
            </Badge>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Real-time Razorpay webhook stream with idempotency deduplication and durable Inngest dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchWebhooks}
            disabled={loading}
            className="gap-2 border-zinc-200 dark:border-zinc-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={handleSimulateWebhook}
            disabled={simulating}
            size="sm"
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            {simulating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            <span>Simulate Inbound Event</span>
          </Button>
        </div>
      </div>

      {/* Webhooks Stream Table */}
      <Card>
        <CardContent className="p-0">
          {loading && webhooks.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              <span className="text-xs text-zinc-400">Loading webhook events...</span>
            </div>
          ) : webhooks.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Webhook className="h-6 w-6" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  No Webhook Events Ingested Yet
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Click &ldquo;Simulate Inbound Event&rdquo; to test HMAC signature verification and deduplication.
                </p>
              </div>
              <Button
                onClick={handleSimulateWebhook}
                disabled={simulating}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              >
                <Play className="h-3.5 w-3.5" />
                <span>Simulate First Webhook</span>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 font-medium">Event ID</th>
                    <th className="py-3 px-4 font-medium">Event Type</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium">Attempts</th>
                    <th className="py-3 px-4 font-medium">Received At</th>
                    <th className="py-3 px-4 font-medium text-right">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {webhooks.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {item.eventId}
                        </span>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          ID: {item.id.slice(0, 10)}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-xs text-indigo-400 font-medium">
                          {item.eventType}
                        </span>
                      </td>

                      <td className="py-3 px-4">{getStatusBadge(item.status)}</td>

                      <td className="py-3 px-4 text-xs font-mono text-zinc-400">
                        {item.attemptCount}x
                      </td>

                      <td className="py-3 px-4 text-xs text-zinc-500 dark:text-zinc-400">
                        {new Date(item.createdAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPayload(item)}
                          className="h-8 px-2.5 text-xs text-zinc-400 hover:text-white gap-1.5 font-mono"
                        >
                          <Code2 className="h-3.5 w-3.5" />
                          <span>View JSON</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* JSON Payload Inspector Drawer / Dialog */}
      {selectedPayload && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-indigo-400" />
                <span className="font-mono text-xs font-semibold text-white">
                  Payload for {selectedPayload.eventId}
                </span>
              </div>
              <button
                onClick={() => setSelectedPayload(null)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                ✕ Close
              </button>
            </div>
            <div className="p-4 overflow-y-auto font-mono text-xs text-zinc-300 bg-zinc-900/60 flex-1">
              <pre className="whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(selectedPayload.payload, null, 2)}
              </pre>
            </div>
            <div className="p-3 border-t border-zinc-800 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPayload(null)}
                className="text-xs"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
