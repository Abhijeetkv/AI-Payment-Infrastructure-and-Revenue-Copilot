"use client";

import * as React from "react";
import {
  Download,
  Calendar,
  CreditCard,
  Building2,
  Zap,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TransactionRow {
  id: string;
  customer: {
    name: string;
    email: string;
    initials: string;
  };
  amount: string;
  method: {
    type: "card" | "netbanking" | "upi";
    label: string;
  };
  status: "FAILED" | "SUCCEEDED" | "PROCESSING";
  risk: "High" | "Low";
  createdAt: string;
}

const mockTransactions: TransactionRow[] = [
  {
    id: "tx_89Fa2bX91m",
    customer: {
      name: "John Doe",
      email: "john@example.com",
      initials: "JD",
    },
    amount: "₹45,000.00",
    method: {
      type: "card",
      label: "•••• 4242",
    },
    status: "FAILED",
    risk: "High",
    createdAt: "Oct 24, 14:32:01",
  },
  {
    id: "tx_72Bd4cX11p",
    customer: {
      name: "Acme Software",
      email: "billing@acme.inc",
      initials: "AS",
    },
    amount: "₹1,25,500.00",
    method: {
      type: "netbanking",
      label: "NEFT Transfer",
    },
    status: "SUCCEEDED",
    risk: "Low",
    createdAt: "Oct 24, 11:15:44",
  },
  {
    id: "tx_99Kl1qZ88x",
    customer: {
      name: "Rohan Joshi",
      email: "rohan.j@gmail.com",
      initials: "RJ",
    },
    amount: "₹3,400.50",
    method: {
      type: "upi",
      label: "UPI (Google Pay)",
    },
    status: "PROCESSING",
    risk: "Low",
    createdAt: "Oct 24, 09:05:12",
  },
];

export default function TransactionsPage() {
  const [searchId, setSearchId] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [methodFilter, setMethodFilter] = React.useState("ALL");
  const [minAmount, setMinAmount] = React.useState("");
  const [maxAmount, setMaxAmount] = React.useState("");

  const clearFilters = () => {
    setSearchId("");
    setStatusFilter("ALL");
    setStatusFilter("ALL");
    setMethodFilter("ALL");
    setMinAmount("");
    setMaxAmount("");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191c1d]">
            Transactions
          </h2>
        </div>
        <Button
          size="sm"
          className="h-9 gap-2 text-xs font-semibold bg-[#000000] hover:bg-[#1c1b1b] text-white shadow-xs cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>Export CSV</span>
        </Button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Transaction ID Input */}
        <div className="relative w-64">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#747878] text-xs font-mono">
            #
          </div>
          <input
            type="text"
            placeholder="Transaction ID"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 text-xs rounded-md border border-[#e9ecef] bg-white text-[#191c1d] focus:outline-none focus:border-[#2a21d2] placeholder:text-[#747878]"
          />
        </div>

        {/* Date Preset Pill */}
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#e9ecef] bg-white text-xs text-[#191c1d] hover:bg-[#f3f4f5] shadow-2xs cursor-pointer"
        >
          <Calendar className="h-3.5 w-3.5 text-[#747878]" />
          <span>Last 7 Days</span>
        </button>

        {/* Status Dropdown */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 text-xs rounded-md border border-[#e9ecef] bg-white text-[#191c1d] focus:outline-none focus:border-[#2a21d2] cursor-pointer shadow-2xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCEEDED">Succeeded</option>
            <option value="FAILED">Failed</option>
            <option value="PROCESSING">Processing</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#747878] pointer-events-none" />
        </div>

        {/* Methods Dropdown */}
        <div className="relative">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 text-xs rounded-md border border-[#e9ecef] bg-white text-[#191c1d] focus:outline-none focus:border-[#2a21d2] cursor-pointer shadow-2xs"
          >
            <option value="ALL">All Methods</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Cards</option>
            <option value="NETBANKING">Net Banking</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#747878] pointer-events-none" />
        </div>

        {/* Amount Range */}
        <div className="flex items-center gap-1">
          <div className="relative w-24">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[#747878]">
              Min ₹
            </span>
            <input
              type="number"
              placeholder=""
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-full pl-12 pr-2 py-1.5 text-xs rounded-md border border-[#e9ecef] bg-white text-[#191c1d] focus:outline-none focus:border-[#2a21d2]"
            />
          </div>
          <span className="text-[#747878] text-xs">-</span>
          <div className="relative w-24">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[#747878]">
              Max ₹
            </span>
            <input
              type="number"
              placeholder=""
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="w-full pl-12 pr-2 py-1.5 text-xs rounded-md border border-[#e9ecef] bg-white text-[#191c1d] focus:outline-none focus:border-[#2a21d2]"
            />
          </div>
        </div>

        {/* Clear Filters Button */}
        <button
          type="button"
          onClick={clearFilters}
          className="px-3 py-1.5 text-xs font-medium text-[#444748] bg-[#f3f4f5] hover:bg-[#e7e8e9] rounded-md transition-colors cursor-pointer"
        >
          Clear Filters
        </button>
      </div>

      {/* Transactions Data Table Card */}
      <div className="border border-[#e9ecef] bg-white shadow-xs rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#f3f4f5] text-[#444748] font-semibold border-b border-[#e9ecef]">
              <tr>
                <th className="py-3.5 px-6 font-medium">ID</th>
                <th className="py-3.5 px-6 font-medium">Customer</th>
                <th className="py-3.5 px-6 font-medium">Amount</th>
                <th className="py-3.5 px-6 font-medium">Method</th>
                <th className="py-3.5 px-6 font-medium">Status</th>
                <th className="py-3.5 px-6 font-medium">Risk</th>
                <th className="py-3.5 px-6 font-medium">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e9ecef]">
              {mockTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-[#f3f4f5]/60 transition-colors">
                  {/* ID */}
                  <td className="py-4 px-6 font-mono font-medium text-[#191c1d]">
                    {tx.id}
                  </td>

                  {/* Customer Details */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded bg-[#f3f4f5] border border-[#c4c7c7] flex items-center justify-center font-bold text-[10px] text-[#444748]">
                        {tx.customer.initials}
                      </div>
                      <div>
                        <div className="font-medium text-[#191c1d] leading-snug">
                          {tx.customer.name}
                        </div>
                        <div className="text-[11px] text-[#444748]">
                          {tx.customer.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Amount */}
                  <td className="py-4 px-6 font-semibold font-mono text-[#191c1d] text-sm">
                    {tx.amount}
                  </td>

                  {/* Method */}
                  <td className="py-4 px-6 text-[#191c1d]">
                    <div className="flex items-center gap-2">
                      {tx.method.type === "card" && (
                        <CreditCard className="h-3.5 w-3.5 text-[#747878]" />
                      )}
                      {tx.method.type === "netbanking" && (
                        <Building2 className="h-3.5 w-3.5 text-[#747878]" />
                      )}
                      {tx.method.type === "upi" && (
                        <Zap className="h-3.5 w-3.5 text-[#747878]" />
                      )}
                      <span className="font-medium">{tx.method.label}</span>
                    </div>
                  </td>

                  {/* Status Pill */}
                  <td className="py-4 px-6">
                    {tx.status === "SUCCEEDED" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#087343]/10 text-[#087343] border border-[#087343]/20 uppercase">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#087343]" />
                        SUCCEEDED
                      </span>
                    )}
                    {tx.status === "FAILED" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#c92a2a]/10 text-[#c92a2a] border border-[#c92a2a]/20 uppercase">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#c92a2a]" />
                        FAILED
                      </span>
                    )}
                    {tx.status === "PROCESSING" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#f59e0b]/10 text-[#b45309] border border-[#f59e0b]/20 uppercase">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
                        PROCESSING
                      </span>
                    )}
                  </td>

                  {/* Risk Badge */}
                  <td className="py-4 px-6">
                    {tx.risk === "High" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold text-red-700 border border-red-300 bg-red-50">
                        High
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold text-[#444748] border border-[#c4c7c7] bg-[#f8f9fa]">
                        Low
                      </span>
                    )}
                  </td>

                  {/* Created At */}
                  <td className="py-4 px-6 text-[#747878] text-[11px] font-mono">
                    {tx.createdAt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-[#e9ecef] flex items-center justify-between text-xs text-[#444748]">
          <div>
            Showing <strong className="text-[#191c1d]">1 to 3</strong> of{" "}
            <strong className="text-[#191c1d]">12,045</strong> entries
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="px-2.5 py-1 rounded text-[#444748] hover:text-[#191c1d] hover:bg-[#f3f4f5] text-xs font-medium cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              className="h-7 w-7 rounded bg-[#000000] text-white font-semibold text-xs flex items-center justify-center cursor-pointer"
            >
              1
            </button>
            <button
              type="button"
              className="h-7 w-7 rounded text-[#191c1d] hover:bg-[#f3f4f5] font-medium text-xs flex items-center justify-center cursor-pointer"
            >
              2
            </button>
            <button
              type="button"
              className="h-7 w-7 rounded text-[#191c1d] hover:bg-[#f3f4f5] font-medium text-xs flex items-center justify-center cursor-pointer"
            >
              3
            </button>
            <button
              type="button"
              className="px-2.5 py-1 rounded text-[#191c1d] hover:bg-[#f3f4f5] text-xs font-medium cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

