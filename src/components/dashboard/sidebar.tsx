"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sparkles,
  LayoutDashboard,
  ShieldCheck,
  Zap,
  Activity,
  CreditCard,
  Receipt,
  RotateCcw,
  Cpu,
  TrendingUp,
  Settings,
  User,
  ArrowLeftRight,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth/client";

const navigationItems = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Recovery Cases", href: "/dashboard/recovery", icon: ShieldCheck },
  { name: "Campaigns", href: "/dashboard/recovery/campaigns", icon: Zap },
  { name: "Agent Activity", href: "/dashboard/agent", icon: Activity },
  { name: "Payments", href: "/dashboard/payments", icon: CreditCard },
  { name: "Transactions", href: "/dashboard/transactions", icon: Receipt },
  { name: "Refunds", href: "/dashboard/refunds", icon: RotateCcw },
  { name: "Analytics", href: "/dashboard/analytics", icon: TrendingUp },
  { name: "Simulator", href: "/dashboard/simulator", icon: Cpu },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="h-full w-64 fixed left-0 top-0 border-r border-[#c7c4d8] bg-[#f8f9fa] flex flex-col py-4 px-2 overflow-y-auto z-50 select-none">
      {/* Brand Header */}
      <div className="px-2 mb-6 flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-[#2a21d2] flex items-center justify-center text-white shadow-xs">
          <Sparkles className="h-4.5 w-4.5" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold text-[#191c1d] leading-tight">
            Lumina
          </span>
          <span className="text-[11px] font-medium text-[#2a21d2] leading-tight">
            AI Revenue Recovery Agent
          </span>
        </div>
      </div>

      {/* Main Navigation Links */}
      <div className="flex-1 flex flex-col gap-1">
        {navigationItems.map((item) => {
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
                "flex items-center gap-4 px-4 py-2 rounded-lg text-sm transition-colors duration-150 cursor-pointer active:opacity-80",
                isActive
                  ? "bg-[#2a21d2] text-white font-semibold border-l-4 border-[#1b1599] shadow-xs"
                  : "text-[#464555] hover:bg-[#f3f4f5] hover:text-[#191c1d] font-normal"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  isActive ? "text-white" : "text-[#464555]"
                )}
              />
              <span className="text-sm">{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Bottom Footer Navigation */}
      <div className="mt-auto flex flex-col gap-1 pt-4 border-t border-[#c7c4d8]">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-4 px-4 py-2 rounded-lg text-[#464555] hover:bg-[#f3f4f5] hover:text-[#191c1d] transition-colors duration-150 cursor-pointer text-sm"
        >
          <Settings className="h-5 w-5 shrink-0" />
          <span>Settings</span>
        </Link>

        <Link
          href="/dashboard/settings"
          className="flex items-center gap-4 px-4 py-2 rounded-lg text-[#464555] hover:bg-[#f3f4f5] hover:text-[#191c1d] transition-colors duration-150 cursor-pointer text-sm"
        >
          <User className="h-5 w-5 shrink-0" />
          <span>Profile</span>
        </Link>

        <button
          type="button"
          onClick={() => {
            router.push("/dashboard");
          }}
          className="flex items-center gap-4 px-4 py-2 rounded-lg text-[#464555] hover:bg-[#f3f4f5] hover:text-[#191c1d] transition-colors duration-150 cursor-pointer border border-[#c7c4d8] mt-2 text-sm text-left"
        >
          <ArrowLeftRight className="h-5 w-5 shrink-0" />
          <span>Switch Account</span>
        </button>

        <button
          type="button"
          onClick={async () => {
            await signOut();
            router.push("/login");
          }}
          className="flex items-center gap-4 px-4 py-2 rounded-lg text-[#ba1a1a] hover:bg-[#ffdad6] transition-colors duration-150 cursor-pointer mt-1 text-sm font-medium text-left"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
}
