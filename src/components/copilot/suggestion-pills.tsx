"use client";

import * as React from "react";
import { TrendingUp, AlertTriangle, CreditCard, RotateCcw, Sparkles } from "lucide-react";

export interface SuggestionPillsProps {
  onSelectPrompt: (prompt: string) => void;
}

const PROMPT_SUGGESTIONS = [
  {
    icon: TrendingUp,
    label: "What is our net revenue this week?",
    prompt: "What is our net revenue and gross volume for the past 7 days?",
  },
  {
    icon: AlertTriangle,
    label: "Analyze recent payment failure spikes",
    prompt: "Why did payment failure rates spike recently and what is our system health score?",
  },
  {
    icon: CreditCard,
    label: "Show payment method market share",
    prompt: "Show the breakdown of volume and conversion rate across UPI, Cards, and Netbanking.",
  },
  {
    icon: RotateCcw,
    label: "Inspect recent refund history",
    prompt: "What is our total refund volume and recent refund transactions?",
  },
];

export function SuggestionPills({ onSelectPrompt }: SuggestionPillsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
        <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
        <span>Suggested questions to get started:</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {PROMPT_SUGGESTIONS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-800/60 transition-all text-left group flex items-start gap-2.5"
            >
              <div className="h-7 w-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors">
                  {item.label}
                </div>
                <div className="text-[11px] text-zinc-400 line-clamp-1">
                  {item.prompt}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
