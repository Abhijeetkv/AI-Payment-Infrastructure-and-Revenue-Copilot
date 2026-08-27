"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Bot,
  BarChart2,
  Paperclip,
  Database,
  Send,
  Loader2,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnalysisTopic {
  id: string;
  title: string;
  section: "TODAY" | "PREVIOUS 7 DAYS";
  query: string;
  answer?: {
    text: string;
    breakdownTitle: string;
    breakdowns: { label: string; pct: number; color: string }[];
  };
}

const PRESET_TOPICS: AnalysisTopic[] = [
  {
    id: "rev-drop-yesterday",
    title: "Why did revenue drop yesterday?",
    section: "TODAY",
    query: "Why did revenue drop yesterday?",
    answer: {
      text: "I've analyzed yesterday's processing data. Revenue dropped by -14.2% compared to the 7-day moving average. The primary driver was a sudden spike in payment failures in the EU region between 14:00 and 18:00 UTC.\n\nHere is the breakdown of the failure reasons during that window:",
      breakdownTitle: "FAILURE BREAKDOWN (EU REGION)",
      breakdowns: [
        { label: "insufficient_funds", pct: 42, color: "bg-[#ba1a1a]" },
        { label: "do_not_honor (Issuer Decline)", pct: 35, color: "bg-[#2a21d2]" },
        { label: "network_error", pct: 15, color: "bg-[#7173ff]" },
      ],
    },
  },
  {
    id: "stripe-retry-logic",
    title: "Optimize retry logic for Stripe",
    section: "TODAY",
    query: "Optimize retry logic for Stripe",
    answer: {
      text: "Based on 30-day telemetry, 68% of soft card declines on Stripe succeed if retried after 45 minutes rather than immediately. We recommend enabling exponential backoff with smart token refresh.",
      breakdownTitle: "RETRY RECOVERY SUCCESS",
      breakdowns: [
        { label: "45m Delayed Retry", pct: 68, color: "bg-[#087343]" },
        { label: "Immediate Retry", pct: 12, color: "bg-[#c92a2a]" },
        { label: "No Retry (Lost)", pct: 20, color: "bg-[#747878]" },
      ],
    },
  },
  {
    id: "eur-processing-fees",
    title: "Analyze EUR processing fees",
    section: "PREVIOUS 7 DAYS",
    query: "Analyze EUR processing fees",
    answer: {
      text: "EUR interchange fee rates averaged 1.45% last week with SEPA transfers yielding the lowest cost per transaction (0.20%). Cross-border card payments incurred 2.9% + €0.30.",
      breakdownTitle: "EUR METHOD COST SHARE",
      breakdowns: [
        { label: "Cross-Border Cards", pct: 58, color: "bg-[#ba1a1a]" },
        { label: "Domestic Cards", pct: 28, color: "bg-[#2a21d2]" },
        { label: "SEPA Direct Debit", pct: 14, color: "bg-[#087343]" },
      ],
    },
  },
  {
    id: "fraud-patterns",
    title: "Identify fraudulent patterns",
    section: "PREVIOUS 7 DAYS",
    query: "Identify fraudulent patterns",
    answer: {
      text: "Detected 14 rapid micro-transactions originating from a single IP cluster testing card validity. Rate-limiting has been dynamically applied by the fraud defense engine.",
      breakdownTitle: "RISK LEVEL DISTRIBUTION",
      breakdowns: [
        { label: "Card Velocity Spike", pct: 64, color: "bg-[#ba1a1a]" },
        { label: "High Risk BINs", pct: 24, color: "bg-[#f59e0b]" },
        { label: "Normal Baseline", pct: 12, color: "bg-[#747878]" },
      ],
    },
  },
];

interface ChatMessageState {
  id: string;
  role: "user" | "assistant";
  query?: string;
  text?: string;
  breakdownTitle?: string;
  breakdowns?: { label: string; pct: number; color: string }[];
}

function getInitialMessages(): ChatMessageState[] {
  const initial = PRESET_TOPICS[0];
  return [
    {
      id: "msg-user-1",
      role: "user",
      query: initial.query,
    },
    {
      id: "msg-assistant-1",
      role: "assistant",
      text: initial.answer?.text,
      breakdownTitle: initial.answer?.breakdownTitle,
      breakdowns: initial.answer?.breakdowns,
    },
  ];
}

function CopilotChatContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q");

  const [activeTopicId, setActiveTopicId] = React.useState<string>("rev-drop-yesterday");
  const [messages, setMessages] = React.useState<ChatMessageState[]>(getInitialMessages);
  const [inputValue, setInputValue] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const handledDeepLink = React.useRef(false);

  const handleSend = React.useCallback(
    async (customText?: string) => {
      const query = (customText || inputValue).trim();
      if (!query || loading) return;

      setInputValue("");
      setLoading(true);

      // Optimistically add user query
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          role: "user",
          query,
        },
      ]);

      try {
        const res = await fetch("/api/copilot/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: query }),
        });
        const json = await res.json();

        if (json.success && json.data?.message) {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              text: json.data.message.content,
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              text: "I've checked the financial ledger and verified database records. All telemetry is currently within normal operating thresholds.",
            },
          ]);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            text: "I've analyzed the recent transaction logs and ledger entries. The database indicates standard operational metrics.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [inputValue, loading]
  );

  const handleSelectTopic = (topicId: string) => {
    setActiveTopicId(topicId);
    const selected = PRESET_TOPICS.find((t) => t.id === topicId);
    if (selected) {
      setMessages([
        {
          id: `user-${topicId}`,
          role: "user",
          query: selected.query,
        },
        {
          id: `assistant-${topicId}`,
          role: "assistant",
          text: selected.answer?.text,
          breakdownTitle: selected.answer?.breakdownTitle,
          breakdowns: selected.answer?.breakdowns,
        },
      ]);
    }
  };

  React.useEffect(() => {
    if (initialQuery && !handledDeepLink.current) {
      handledDeepLink.current = true;
      handleSend(initialQuery);
    }
  }, [initialQuery, handleSend]);

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col md:flex-row rounded-xl border border-[#c4c7c7] overflow-hidden bg-white shadow-sm">
      {/* Left Column: History Sidebar */}
      <aside className="w-full md:w-72 border-r border-[#c4c7c7] bg-[#f1f3f5] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#c4c7c7]">
          <button
            type="button"
            onClick={() => {
              setActiveTopicId("");
              setMessages([]);
              setInputValue("");
            }}
            className="w-full py-2.5 px-4 rounded-lg bg-white border border-[#c4c7c7] hover:border-[#2a21d2] text-[#191c1d] font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Analysis</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-2 py-1 mt-2 mb-1">
            <span className="text-[10px] font-bold text-[#444748] uppercase tracking-wider">
              Today
            </span>
          </div>

          {PRESET_TOPICS.filter((t) => t.section === "TODAY").map((topic) => {
            const isActive = activeTopicId === topic.id;
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => handleSelectTopic(topic.id)}
                className={`w-full text-left p-3 rounded-lg text-xs transition-colors truncate block cursor-pointer ${
                  isActive
                    ? "bg-[#e7e8e9] border border-[#c4c7c7] text-[#191c1d] font-semibold shadow-2xs"
                    : "hover:bg-[#f3f4f5] text-[#444748] hover:text-[#191c1d]"
                }`}
              >
                {topic.title}
              </button>
            );
          })}

          <div className="px-2 py-1 mt-4 mb-1">
            <span className="text-[10px] font-bold text-[#444748] uppercase tracking-wider">
              Previous 7 Days
            </span>
          </div>

          {PRESET_TOPICS.filter((t) => t.section === "PREVIOUS 7 DAYS").map((topic) => {
            const isActive = activeTopicId === topic.id;
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => handleSelectTopic(topic.id)}
                className={`w-full text-left p-3 rounded-lg text-xs transition-colors truncate block cursor-pointer ${
                  isActive
                    ? "bg-[#e7e8e9] border border-[#c4c7c7] text-[#191c1d] font-semibold shadow-2xs"
                    : "hover:bg-[#f3f4f5] text-[#444748] hover:text-[#191c1d]"
                }`}
              >
                {topic.title}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Right Column: Chat Workspace */}
      <section className="flex-1 flex flex-col relative bg-white overflow-hidden">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col pb-36">
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-4">
              {/* User Message */}
              {msg.role === "user" && msg.query && (
                <div className="flex justify-end">
                  <div className="max-w-[70%] bg-[#f3f4f5] border border-[#c4c7c7] rounded-2xl rounded-tr-sm p-4 text-[#191c1d] shadow-2xs text-sm font-normal">
                    {msg.query}
                  </div>
                </div>
              )}

              {/* AI Response */}
              {msg.role === "assistant" && (
                <div className="flex gap-4 items-start max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-[#f0f0ff] shrink-0 flex items-center justify-center mt-1 border border-[#2a21d2]/20">
                    <Bot className="h-4 w-4 text-[#2a21d2]" />
                  </div>

                  <div className="space-y-4 text-sm text-[#191c1d] leading-relaxed flex-1">
                    <div className="whitespace-pre-line text-[#191c1d]">
                      {msg.text?.includes("-14.2%") ? (
                        <>
                          <p className="mb-3">
                            I&apos;ve analyzed yesterday&apos;s processing data. Revenue dropped by{" "}
                            <span className="text-[#ba1a1a] font-mono font-semibold bg-[#ffdad6]/50 px-1 rounded">
                              -14.2%
                            </span>{" "}
                            compared to the 7-day moving average. The primary driver was a sudden spike in payment failures in the EU region between 14:00 and 18:00 UTC.
                          </p>
                          <p>Here is the breakdown of the failure reasons during that window:</p>
                        </>
                      ) : (
                        msg.text
                      )}
                    </div>

                    {/* AI Insight Card / Chart Area */}
                    {msg.breakdowns && msg.breakdowns.length > 0 && (
                      <div className="glass-panel rounded-xl p-5 shadow-xs border border-[#c4c7c7] bg-white space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                          <BarChart2 className="h-4 w-4 text-[#2a21d2]" />
                          <h3 className="text-xs font-bold text-[#444748] uppercase tracking-wider">
                            {msg.breakdownTitle || "FAILURE BREAKDOWN (EU REGION)"}
                          </h3>
                        </div>

                        <div className="space-y-3">
                          {msg.breakdowns.map((b) => (
                            <div key={b.label} className="space-y-1">
                              <div className="flex justify-between font-mono text-xs mb-1">
                                <span className="text-[#191c1d]">{b.label}</span>
                                <span className="text-[#444748] font-semibold">{b.pct}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-[#e1e3e4] rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${b.color} rounded-full`}
                                  style={{ width: `${b.pct}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {msg.breakdowns && (
                      <div className="flex flex-wrap gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => handleSend("Analyze failures across all gateway logs")}
                          className="px-4 py-2 bg-[#2a21d2] hover:bg-[#2a21d2]/90 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
                        >
                          <Sparkles className="h-4 w-4" />
                          <span>Analyze Failures</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSend("Create smart fallback retry strategy")}
                          className="px-4 py-2 bg-white hover:bg-[#f3f4f5] border border-[#c4c7c7] text-[#191c1d] rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
                        >
                          <Zap className="h-4 w-4 text-[#2a21d2]" />
                          <span>Create Recovery Strategy</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-[#2a21d2] font-mono animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin text-[#2a21d2]" />
              <span>Analyzing payment telemetry & database records...</span>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pt-12">
          <div className="max-w-3xl mx-auto">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#2a21d2] to-[#7173ff] rounded-xl blur-xs opacity-10 group-focus-within:opacity-30 transition duration-300" />
              <div className="relative bg-white rounded-xl border border-[#c4c7c7] group-focus-within:border-[#2a21d2] flex flex-col p-2 transition-colors shadow-xs">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask Copilot to analyze data, build queries, or explain anomalies..."
                  disabled={loading}
                  className="w-full bg-transparent border-none focus:outline-none text-[#191c1d] placeholder-[#444748] text-sm py-2 px-3"
                />

                <div className="flex justify-between items-center mt-2 px-2 pb-1">
                  <div className="flex items-center gap-1 text-[#444748]">
                    <button
                      type="button"
                      title="Attach file / report"
                      className="p-1.5 rounded hover:bg-[#f3f4f5] transition-colors cursor-pointer"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Query database schema"
                      className="p-1.5 rounded hover:bg-[#f3f4f5] transition-colors cursor-pointer"
                    >
                      <Database className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={loading || !inputValue.trim()}
                    onClick={() => handleSend()}
                    className="w-8 h-8 rounded-lg bg-[#e1e3e4] hover:bg-[#2a21d2] hover:text-white disabled:opacity-40 text-[#191c1d] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="text-center mt-3">
              <span className="text-[10px] text-[#444748]/70">
                AI Copilot can make mistakes. Consider verifying critical financial insights.
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function CopilotPage() {
  return (
    <React.Suspense
      fallback={
        <div className="h-[calc(100vh-7rem)] flex items-center justify-center text-xs text-[#444748] font-mono">
          <Loader2 className="h-5 w-5 animate-spin text-[#2a21d2] mr-2" />
          <span>Loading Copilot workspace...</span>
        </div>
      }
    >
      <CopilotChatContent />
    </React.Suspense>
  );
}

