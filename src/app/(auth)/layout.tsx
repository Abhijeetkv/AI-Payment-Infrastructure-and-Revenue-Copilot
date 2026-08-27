import { LayoutGrid } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-4 relative font-sans text-zinc-900">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-8 z-10 select-none">
        <div className="h-9 w-9 rounded-lg bg-zinc-900 flex items-center justify-center text-white shadow-sm">
          <LayoutGrid className="h-5 w-5" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight text-zinc-900 block leading-tight">
            Payment Copilot
          </span>
          <span className="text-[11px] font-medium text-zinc-500 block">
            Enterprise Workspace
          </span>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="w-full max-w-md z-10">{children}</div>
    </div>
  );
}
