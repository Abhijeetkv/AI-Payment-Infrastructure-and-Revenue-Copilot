import { RazorpayIcon } from "@/components/ui/razorpay-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-4 relative font-sans text-zinc-900">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-8 z-10 select-none">
        <div className="h-10 w-10 rounded-xl bg-[#0C2340] flex items-center justify-center text-white shadow-sm">
          <RazorpayIcon className="h-6 w-6" fill="#0C83FE" />
        </div>
        <div>
          <span className="font-bold text-xl tracking-tight text-[#191c1d] block leading-tight">
            Lumina
          </span>
          <span className="text-xs font-medium text-[#2a21d2] block">
            AI Revenue Recovery Agent
          </span>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="w-full max-w-md z-10">{children}</div>
    </div>
  );
}
