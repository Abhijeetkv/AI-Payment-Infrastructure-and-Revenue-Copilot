"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  CreditCard,
  RotateCcw,
  Webhook,
  BarChart3,
  AlertTriangle,
  Bot,
  FlaskConical,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Orders", href: "/dashboard/orders", icon: ShoppingCart },
  { name: "Payments", href: "/dashboard/payments", icon: CreditCard },
  { name: "Refunds", href: "/dashboard/refunds", icon: RotateCcw },
  { name: "Webhooks", href: "/dashboard/webhooks", icon: Webhook },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Anomalies", href: "/dashboard/anomalies", icon: AlertTriangle },
  { name: "AI Copilot", href: "/dashboard/copilot", icon: Bot, badge: "AI" },
  { name: "Simulator", href: "/dashboard/simulator", icon: FlaskConical },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 border-r border-zinc-200/80 bg-zinc-950 text-white flex flex-col justify-between h-screen sticky top-0">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-zinc-800">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-white block">
              Revenue Copilot
            </span>
            <span className="text-[11px] font-mono text-zinc-400 block tracking-wider uppercase">
              Razorpay Test Mode
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {navigation.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                  isActive
                    ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-colors",
                      isActive
                        ? "text-indigo-400"
                        : "text-zinc-500 group-hover:text-zinc-300"
                    )}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Environment Badge & Footer */}
      <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/50">
        <div className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-zinc-300">
              Test Mode Active
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Zero real money processed. Safe test environment.
          </p>
        </div>
      </div>
    </aside>
  );
}
