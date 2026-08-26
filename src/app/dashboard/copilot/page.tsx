"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  Bot,
  MessageSquare,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChatMessage, MessageItem } from "@/components/copilot/chat-message";
import { SuggestionPills } from "@/components/copilot/suggestion-pills";

interface ConversationItem {
  id: string;
  title: string;
  updatedAt: string;
  _count?: {
    messages: number;
  };
}

function CopilotChatContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q");

  const [conversations, setConversations] = React.useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<MessageItem[]>([]);
  const [inputMessage, setInputMessage] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [provider, setProvider] = React.useState<string>("grounded_engine");
  const [refreshKey, setRefreshKey] = React.useState(0);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const hasInitializedQuery = React.useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations list on mount and on refreshKey changes
  React.useEffect(() => {
    let isMounted = true;

    async function fetchConversations() {
      try {
        const res = await fetch("/api/copilot/conversations");
        const json = await res.json();
        if (isMounted && json.success && json.data) {
          setConversations(json.data);
          if (!activeConversationId && json.data.length > 0) {
            setActiveConversationId(json.data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load conversations:", err);
      } finally {
        if (isMounted) {
          setInitialLoading(false);
        }
      }
    }

    fetchConversations();

    return () => {
      isMounted = false;
    };
  }, [refreshKey, activeConversationId]);

  // Load messages when active conversation changes
  React.useEffect(() => {
    let isMounted = true;

    if (!activeConversationId) {
      return;
    }

    fetch(`/api/copilot/conversations/${activeConversationId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (json.success && json.data?.messages) {
          setMessages(json.data.messages);
        }
      })
      .catch((err) => {
        console.error("Failed to load conversation messages:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [activeConversationId]);

  // Handle send message
  const handleSendMessage = React.useCallback(
    async (textToSend?: string) => {
      const text = (textToSend || inputMessage).trim();
      if (!text || loading) return;

      setInputMessage("");
      setLoading(true);

      // Optimistically append user message
      const tempUserMsg: MessageItem = {
        id: `temp_${Date.now()}`,
        role: "USER",
        content: text,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);

      try {
        const res = await fetch("/api/copilot/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: activeConversationId || undefined,
            message: text,
          }),
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Failed to generate response");
        }

        if (json.data) {
          if (json.data.provider) setProvider(json.data.provider);
          if (!activeConversationId && json.data.conversationId) {
            setActiveConversationId(json.data.conversationId);
            setRefreshKey((k) => k + 1);
          }

          // Fetch refreshed conversation history
          const refreshedRes = await fetch(
            `/api/copilot/conversations/${json.data.conversationId}`
          );
          const refreshedJson = await refreshedRes.json();
          if (refreshedJson.success && refreshedJson.data?.messages) {
            setMessages(refreshedJson.data.messages);
          }
        }
      } catch (err: unknown) {
        const errorMsg: MessageItem = {
          id: `err_${Date.now()}`,
          role: "ASSISTANT",
          content: `⚠️ Error: ${err instanceof Error ? err.message : "Failed to process question"}`,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setLoading(false);
      }
    },
    [activeConversationId, inputMessage, loading]
  );

  // Handle deep-linked query on initial mount
  React.useEffect(() => {
    if (initialQuery && !hasInitializedQuery.current && !initialLoading) {
      hasInitializedQuery.current = true;
      handleSendMessage(initialQuery);
    }
  }, [initialQuery, initialLoading, handleSendMessage]);

  const handleStartNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setInputMessage("");
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await fetch(`/api/copilot/conversations/${id}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        handleStartNewChat();
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col md:flex-row gap-4">
      {/* Left Sidebar: Conversations List */}
      <div className="w-full md:w-64 shrink-0 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex flex-col overflow-hidden">
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
              Conversations
            </span>
          </div>
          <Button
            size="sm"
            onClick={handleStartNewChat}
            className="h-7 text-xs px-2 gap-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Chat</span>
          </Button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500">
              No previous threads
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setActiveConversationId(conv.id)}
                className={`p-2.5 rounded-xl cursor-pointer text-xs transition-all flex items-center justify-between group ${
                  activeConversationId === conv.id
                    ? "bg-zinc-800/80 border border-zinc-700/80 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                }`}
              >
                <div className="truncate pr-2 space-y-0.5">
                  <div className="font-medium truncate">{conv.title}</div>
                  <div className="text-[10px] text-zinc-500">
                    {new Date(conv.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleDeleteConversation(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400 transition-opacity p-1"
                  title="Delete conversation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Window */}
      <div className="flex-1 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex flex-col overflow-hidden">
        {/* Chat Window Header */}
        <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-white">AI Revenue Copilot</h2>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono text-emerald-400 border-emerald-500/30"
                >
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Grounded Tool-Calling
                </Badge>
              </div>
              <p className="text-[10px] text-zinc-400">
                Engine: <span className="font-mono text-indigo-300">{provider}</span>
              </p>
            </div>
          </div>

          <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-800">
            Phase 8 Active
          </Badge>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center max-w-xl mx-auto space-y-6 py-8 text-center">
              <div className="space-y-2">
                <div className="h-12 w-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-white">
                  How can Revenue Copilot assist you today?
                </h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  Ask natural-language questions about financial metrics, payment states, refund balances, or system anomalies.
                </p>
              </div>

              <SuggestionPills onSelectPrompt={(p) => handleSendMessage(p)} />
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {loading && (
                <div className="py-2 flex items-center gap-2 text-xs text-zinc-400 font-mono animate-pulse">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                  <span>Analyzing ledger telemetry & executing verified queries...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Sticky Input Bar */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-900/60">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about revenue trends, payment states, refund limits, or anomalies..."
                disabled={loading}
                className="text-xs bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 pr-10 focus-visible:ring-indigo-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono hidden sm:inline">
                Enter ↵
              </span>
            </div>

            <Button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="h-9 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium gap-1.5"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span className="text-xs">Ask</span>
                  <Send className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function CopilotPage() {
  return (
    <React.Suspense
      fallback={
        <div className="h-[calc(100vh-8.5rem)] flex items-center justify-center text-xs text-zinc-500 font-mono">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-400 mr-2" />
          <span>Loading Copilot workspace...</span>
        </div>
      }
    >
      <CopilotChatContent />
    </React.Suspense>
  );
}
