"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Bell, User } from "lucide-react";
import { useSession } from "@/lib/auth/client";

export function DashboardHeader() {
  const { data: session } = useSession();
  const [mode, setMode] = React.useState<"live" | "test">("test");

  return (
    <header className="h-16 sticky top-0 z-40 w-full bg-[#f8f9fa] border-b border-[#c7c4d8] flex items-center justify-between px-6 select-none">
      {/* Left Brand and Navigation Links */}
      <div className="flex items-center gap-6">
        <Link href="/" className="text-lg font-bold text-[#2a21d2]">
          Lumina
        </Link>
        <div className="hidden sm:flex items-center gap-4 text-xs font-normal text-[#464555]">
          <a
            href="https://razorpay.com/docs"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#2a21d2] transition-colors"
          >
            Docs
          </a>
          <a
            href="https://support.razorpay.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#2a21d2] transition-colors"
          >
            Help
          </a>
          <Link href="/settings" className="hover:text-[#2a21d2] transition-colors">
            API & Keys
          </Link>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <div className="relative w-48 sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#777587]" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#c7c4d8] bg-white text-[#191c1d] focus:border-[#2a21d2] focus:outline-none focus:ring-1 focus:ring-[#2a21d2]/20 transition-all placeholder:text-[#777587]"
          />
        </div>

        {/* Mode Toggles */}
        <button
          type="button"
          onClick={() => setMode("live")}
          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
            mode === "live"
              ? "bg-[#e1e3e4] text-[#191c1d] font-semibold border-b-2 border-[#2a21d2]"
              : "border-[#c7c4d8] text-[#191c1d] hover:bg-[#f3f4f5]"
          }`}
        >
          Live Mode
        </button>

        <button
          type="button"
          onClick={() => setMode("test")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            mode === "test"
              ? "bg-[#e1e3e4] text-[#191c1d] font-semibold border-b-2 border-[#2a21d2]"
              : "border border-[#c7c4d8] text-[#191c1d] hover:bg-[#f3f4f5]"
          }`}
        >
          Test Mode
        </button>

        {/* Action Icons */}
        <div className="flex items-center gap-1 ml-1 text-[#464555]">
          <button
            type="button"
            title="Notifications"
            className="p-1.5 rounded-lg hover:bg-[#f3f4f5] transition-colors relative cursor-pointer"
          >
            <Bell className="h-5 w-5" />
          </button>

          <button
            type="button"
            title={session?.user?.name || "Account Profile"}
            className="p-1.5 rounded-lg hover:bg-[#f3f4f5] transition-colors cursor-pointer flex items-center justify-center"
          >
            <User className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
