import { ShieldCheck } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Branding */}
      <div className="flex items-center gap-3 mb-8 z-10">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25">
          <ShieldCheck className="h-6 w-6 text-white" />
        </div>
        <div>
          <span className="font-bold text-lg tracking-tight text-white block">
            Revenue Copilot
          </span>
          <span className="text-[11px] font-mono text-zinc-400 block tracking-wider uppercase">
            Payment Infrastructure Platform
          </span>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="w-full max-w-md z-10">{children}</div>
    </div>
  );
}
