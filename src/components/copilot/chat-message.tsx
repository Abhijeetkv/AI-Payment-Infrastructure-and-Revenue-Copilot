"use client";

import * as React from "react";
import { Sparkles, User, Copy, Check, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface MessageItem {
  id: string;
  role: "USER" | "ASSISTANT" | "TOOL" | "SYSTEM";
  content: string | null;
  toolName?: string | null;
  createdAt: string;
}

interface ChatMessageProps {
  message: MessageItem;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = React.useState(false);
  const isUser = message.role === "USER";
  const isTool = message.role === "TOOL";

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isTool) {
    return (
      <div className="py-1 px-4 my-1 rounded-lg bg-zinc-900/60 border border-zinc-800 text-[11px] font-mono text-zinc-400 flex items-center justify-between max-w-xl">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
          <span>Tool Executed: <strong className="text-zinc-200">{message.toolName}</strong></span>
        </div>
        <Badge variant="outline" className="text-[10px] text-indigo-300 border-indigo-500/30">
          Database Sourced
        </Badge>
      </div>
    );
  }

  return (
    <div
      className={`py-3 flex gap-3 text-xs leading-relaxed group ${isUser ? "flex-row-reverse" : "flex-row"
        }`}
    >
      {/* Avatar */}
      <div
        className={`h-8 w-8 rounded-xl shrink-0 flex items-center justify-center shadow-sm ${isUser
            ? "bg-zinc-800 text-zinc-200"
            : "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white"
          }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>

      {/* Message Content Bubble */}
      <div
        className={`max-w-2xl rounded-2xl p-4 space-y-2 relative transition-all shadow-sm ${isUser
            ? "bg-indigo-600 text-white rounded-tr-sm"
            : "bg-zinc-900/90 border border-zinc-800 text-zinc-100 rounded-tl-sm"
          }`}
      >
        <div className="flex items-center justify-between gap-4 pb-1 border-b border-white/10">
          <span className="font-semibold text-[11px] opacity-80">
            {isUser ? "You" : "Revenue Copilot"}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] opacity-60 font-mono">
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {!isUser && (
              <button
                type="button"
                onClick={handleCopy}
                className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-white transition-opacity"
                title="Copy response"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Content Body with Markdown formatting support */}
        <div className="prose prose-invert max-w-none text-xs leading-relaxed whitespace-pre-wrap font-sans">
          {message.content}
        </div>
      </div>
    </div>
  );
}
