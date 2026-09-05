"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  User,
  Settings,
  LogOut,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth/client";

export function DashboardHeader() {
  const router = useRouter();
  const { data: session } = useSession();
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);

  const notificationsRef = React.useRef<HTMLDivElement>(null);
  const profileRef = React.useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-16 sticky top-0 z-40 w-full bg-[#f8f9fa] border-b border-[#c7c4d8] flex items-center justify-between px-6 select-none">
      {/* 1. Left: Brand Identity */}
      <div className="flex items-center gap-3">
        <Link href="/" className="text-lg font-bold text-[#2a21d2]">
          Lumina
        </Link>
      </div>

      {/* 2. Right: Environment Indicator, Notifications & Profile Menu */}
      <div className="flex items-center gap-3">
        {/* Environment Status Badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold tracking-wide"
          title="Operating in Razorpay Test Environment"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
          <span>TEST MODE</span>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 rounded-lg transition-colors relative cursor-pointer ${showNotifications ? "bg-[#e5e7eb] text-[#191c1d]" : "text-[#464555] hover:bg-[#f3f4f5]"
              }`}
            aria-label="Recovery Notifications"
            title="Recovery Notifications"
          >
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#2a21d2]" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white border border-[#c7c4d8] shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-4 py-2 border-b border-[#e5e7eb] flex items-center justify-between">
                <span className="text-xs font-bold text-[#191c1d]">Recovery Notifications</span>
                <span className="text-[10px] text-[#2a21d2] font-medium">Live Feed</span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-[#f3f4f5]">
                <div className="p-3 hover:bg-[#f8f9fa] transition-colors flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-[#191c1d]">Payment Recovered</span>
                    <span className="text-[11px] text-[#777587]">₹2,499 captured via Smart Nudge</span>
                  </div>
                </div>
                <div className="p-3 hover:bg-[#f8f9fa] transition-colors flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-[#2a21d2] shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-[#191c1d]">Policy Gatekeeper</span>
                    <span className="text-[11px] text-[#777587]">High-value case escalated for approval</span>
                  </div>
                </div>
                <div className="p-3 hover:bg-[#f8f9fa] transition-colors flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-[#191c1d]">Anomaly Detected</span>
                    <span className="text-[11px] text-[#777587]">HDFC UPI failure spike identified</span>
                  </div>
                </div>
              </div>
              <div className="px-4 pt-2 border-t border-[#e5e7eb]">
                <Link
                  href="/recovery"
                  onClick={() => setShowNotifications(false)}
                  className="text-center text-[11px] font-semibold text-[#2a21d2] hover:underline block"
                >
                  View All Recovery Cases →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile / Account Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${showProfileMenu ? "bg-[#e5e7eb] text-[#191c1d]" : "text-[#464555] hover:bg-[#f3f4f5]"
              }`}
            aria-label="Merchant Account Menu"
            title={session?.user?.name || "Account Profile"}
          >
            <div className="h-7 w-7 rounded-full bg-[#2a21d2] text-white flex items-center justify-center font-bold text-xs">
              {session?.user?.name?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-60 rounded-xl bg-white border border-[#c7c4d8] shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3.5 py-2.5 border-b border-[#e5e7eb]">
                <span className="text-xs font-bold text-[#191c1d] block truncate">
                  {session?.user?.name || "Merchant Workspace"}
                </span>
                <span className="text-[11px] text-[#777587] block truncate">
                  {session?.user?.email || "merchant@example.com"}
                </span>
              </div>

              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-[#464555] hover:bg-[#f3f4f5] hover:text-[#191c1d] transition-colors"
                >
                  <Settings className="h-3.5 w-3.5 text-[#777587]" />
                  <span>Recovery Policies</span>
                </Link>
              </div>

              <div className="pt-1 border-t border-[#e5e7eb]">
                <button
                  type="button"
                  onClick={async () => {
                    setShowProfileMenu(false);
                    await signOut();
                    router.push("/login");
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-[#ba1a1a] hover:bg-[#ffdad6] transition-colors text-left font-medium cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
