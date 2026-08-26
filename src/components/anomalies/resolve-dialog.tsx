"use client";

import * as React from "react";
import { CheckCircle2, AlertTriangle, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ResolveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  anomalyId: string;
  anomalyType: string;
  severity: string;
  onResolveSuccess?: () => void;
}

const COMMON_RESOLUTIONS = [
  "Upstream bank outage restored",
  "Gateway degradation resolved",
  "Configuration fix applied",
  "Customer traffic burst / expected surge",
  "False positive deviation",
  "Other root cause resolved",
];

export function ResolveDialog({
  isOpen,
  onClose,
  anomalyId,
  anomalyType,
  severity,
  onResolveSuccess,
}: ResolveDialogProps) {
  const [notes, setNotes] = React.useState<string>(COMMON_RESOLUTIONS[0]);
  const [customNotes, setCustomNotes] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const finalNotes = notes === "Other root cause resolved" ? customNotes.trim() || notes : notes;

    try {
      const res = await fetch(`/api/anomalies/${anomalyId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: finalNotes }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to resolve anomaly");
      }

      if (onResolveSuccess) {
        onResolveSuccess();
      }

      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resolve anomaly");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-6 space-y-5 text-zinc-100 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Resolve Anomaly Alert</h3>
              <p className="text-xs text-zinc-400 font-mono">ID: {anomalyId.slice(0, 14)}...</p>
            </div>
          </div>
          <Badge
            variant={severity === "CRITICAL" ? "destructive" : severity === "HIGH" ? "warning" : "default"}
            className="text-[10px]"
          >
            {severity}
          </Badge>
        </div>

        <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1 text-xs">
          <div className="text-zinc-400">Alert Type</div>
          <div className="font-semibold text-zinc-200 uppercase tracking-wide">
            {anomalyType.replace("_", " ")}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 flex items-center gap-2 text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="font-medium text-zinc-300">Resolution Cause / Action Taken</label>
            <select
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-9 rounded-md bg-zinc-900 border border-zinc-800 px-3 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {COMMON_RESOLUTIONS.map((res) => (
                <option key={res} value={res}>
                  {res}
                </option>
              ))}
            </select>

            {notes === "Other root cause resolved" && (
              <Input
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Specify root cause..."
                className="text-xs bg-zinc-900 border-zinc-800 mt-2"
                required
              />
            )}
          </div>

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
              disabled={loading}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Resolving...</span>
                </>
              ) : (
                <>
                  <span>Mark Resolved</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
