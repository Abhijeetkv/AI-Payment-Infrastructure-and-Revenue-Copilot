import Link from "next/link";
import { ShieldCheck, ArrowRight, Bot, Zap, Lock, RefreshCw, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-indigo-600/15 via-purple-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Navigation Header */}
      <header className="h-20 border-b border-zinc-800/80 px-6 md:px-12 flex items-center justify-between max-w-7xl w-full mx-auto z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white block">
              Revenue Copilot
            </span>
            <span className="text-[10px] font-mono text-indigo-400 block tracking-wider uppercase">
              Razorpay Test Mode
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" className="text-zinc-300 hover:text-white hover:bg-zinc-900">
              Sign In
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium">
              Launch Dashboard
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16 md:py-24 max-w-5xl mx-auto z-10 space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium">
          <Zap className="h-3.5 w-3.5 text-indigo-400" />
          <span>High Reliability Payment Infrastructure & AI Intelligence</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.1]">
          Orchestrate payments with{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
            AI-powered
          </span>{" "}
          precision.
        </h1>

        <p className="text-base sm:text-xl text-zinc-400 max-w-2xl leading-relaxed">
          Deterministic payment state machines, double-entry ledger invariance, zero duplicate transactions, and an AI copilot that investigates failure spikes in real-time.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
          <Link href="/dashboard">
            <Button size="lg" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-600/25 gap-2 font-semibold h-12 px-8">
              <span>Explore Merchant Console</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/dashboard/copilot">
            <Button size="lg" variant="outline" className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-200 gap-2 h-12 px-8">
              <Bot className="h-4 w-4 text-indigo-400" />
              <span>AI Revenue Copilot</span>
            </Button>
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 text-left w-full">
          <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-sm space-y-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Idempotent Execution</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Multi-tiered idempotency with Redis distributed locks and DB unique constraints guarantees exactly-once processing.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-sm space-y-3">
            <div className="h-10 w-10 rounded-xl bg-purple-950/60 border border-purple-800/50 flex items-center justify-center text-purple-400">
              <RefreshCw className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Webhook Deduplication</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              HMAC signature verification and durable Inngest background event processing eliminate payment drop-offs.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-sm space-y-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-950/60 border border-cyan-800/50 flex items-center justify-center text-cyan-400">
              <BarChart2 className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Verified AI Analytics</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Natural-language revenue copilot with tool-calling capabilities that inspects live metrics directly from PostgreSQL.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-6 px-6 text-center text-xs text-zinc-500 z-10">
        Built with Next.js, Prisma, Razorpay Test SDK, Inngest & Better Auth. All rights reserved.
      </footer>
    </div>
  );
}
