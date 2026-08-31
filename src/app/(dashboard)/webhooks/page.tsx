"use client";

import * as React from "react";
import {
  Webhook,
  RefreshCw,
  Loader2,
  Code2,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
      .catch(() => { })
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#087343]/10 text-[#087343] border border-[#087343]/20 uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-[#087343]" />
            DELIVERED
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#f59e0b]/10 text-[#b45309] border border-[#f59e0b]/20 uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
            PROCESSING
          </span>
        );
      case "DUPLICATE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#f3f4f5] text-[#444748] border border-[#c4c7c7] uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-[#747878]" />
            DUPLICATE
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#c92a2a]/10 text-[#c92a2a] border border-[#c92a2a]/20 uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-[#c92a2a]" />
            FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold text-[#444748] border border-[#c4c7c7] bg-[#f8f9fa]">
            {status}
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
              Webhook Ingestion Stream
            </h2>
            <Badge variant="success">HMAC-SHA256 Barrier</Badge>
          </div>
          <p className="text-sm text-[#444748] mt-1 font-normal">
            Real-time webhook stream with multi-tiered idempotency deduplication and durable Inngest dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchWebhooks}
            disabled={loading}
            className="h-9 gap-1.5 text-xs text-[#191c1d] bg-white border-[#c4c7c7] hover:bg-[#f3f4f5] shadow-xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#2a21d2]" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={handleSimulateWebhook}
            disabled={simulating}
            size="sm"
            className="h-9 gap-2 bg-[#000000] hover:bg-[#1c1b1b] text-white font-semibold text-xs shadow-xs cursor-pointer"
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
      <div className="border border-[#e9ecef] bg-white shadow-xs rounded-lg overflow-hidden">
        {loading && webhooks.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-6 w-6 animate-spin text-[#2a21d2]" />
            <span className="text-xs text-[#747878] font-mono">Loading webhook events...</span>
          </div>
        ) : webhooks.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="h-12 w-12 rounded-lg bg-[#f3f4f5] border border-[#e9ecef] flex items-center justify-center text-[#444748]">
              <Webhook className="h-6 w-6" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-sm font-semibold text-[#191c1d]">
                No Webhook Events Ingested Yet
              </h3>
              <p className="text-xs text-[#444748]">
                Click &ldquo;Simulate Inbound Event&rdquo; to test HMAC signature verification and deduplication.
              </p>
            </div>
            <Button
              onClick={handleSimulateWebhook}
              disabled={simulating}
              size="sm"
              className="bg-[#2a21d2] hover:bg-[#2a21d2]/90 text-white gap-2 text-xs font-semibold"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Simulate First Webhook</span>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#f3f4f5] text-[#444748] border-b border-[#e9ecef] font-medium">
                <tr>
                  <th className="py-3.5 px-6">Event ID</th>
                  <th className="py-3.5 px-6">Event Type</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Attempts</th>
                  <th className="py-3.5 px-6">Received At</th>
                  <th className="py-3.5 px-6 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9ecef]">
                {webhooks.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[#f3f4f5]/60 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <span className="font-mono text-xs font-semibold text-[#191c1d]">
                        {item.eventId}
                      </span>
                      <div className="text-[10px] text-[#747878] font-mono">
                        ID: {item.id.slice(0, 10)}
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span className="font-mono text-xs text-[#2a21d2] font-semibold">
                        {item.eventType}
                      </span>
                    </td>

                    <td className="py-4 px-6">{getStatusBadge(item.status)}</td>

                    <td className="py-4 px-6 text-xs font-mono text-[#444748]">
                      {item.attemptCount}x
                    </td>

                    <td className="py-4 px-6 text-xs text-[#747878] font-mono">
                      {new Date(item.createdAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPayload(item)}
                        className="h-8 px-2.5 text-xs text-[#2a21d2] hover:bg-[#f0f0ff] gap-1.5 font-mono font-semibold cursor-pointer"
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
      </div>

      {/* JSON Payload Inspector Dialog */}
      {selectedPayload && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#e9ecef] rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-xl">
            <div className="p-4 border-b border-[#e9ecef] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-[#2a21d2]" />
                <span className="font-mono text-xs font-semibold text-[#191c1d]">
                  Payload for {selectedPayload.eventId}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPayload(null)}
                className="text-xs text-[#747878] hover:text-[#191c1d] cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <div className="p-4 overflow-y-auto font-mono text-xs text-[#191c1d] bg-[#f8f9fa] flex-1">
              <pre className="whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(selectedPayload.payload, null, 2)}
              </pre>
            </div>
            <div className="p-3 border-t border-[#e9ecef] flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPayload(null)}
                className="text-xs border-[#c4c7c7] text-[#191c1d]"
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

