import * as React from "react";
import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  change?: {
    value: number;
    trend: "up" | "down" | "neutral";
    label?: string;
  };
  variant?: "default" | "success" | "warning" | "danger" | "indigo";
}

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  change,
  variant = "default",
}: MetricCardProps) {
  const iconVariantClasses = {
    default: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    success:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50",
    warning:
      "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/50",
    danger:
      "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/50",
    indigo:
      "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50",
  };

  return (
    <Card className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              {title}
            </p>
            <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {value}
            </div>
          </div>
          <div className={cn("p-2.5 rounded-xl", iconVariantClasses[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>

        {(change || description) && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            {change && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-semibold px-1.5 py-0.5 rounded",
                  change.trend === "up"
                    ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50"
                    : change.trend === "down"
                    ? "text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/50"
                    : "text-zinc-600 bg-zinc-100 dark:text-zinc-400 dark:bg-zinc-800"
                )}
              >
                {change.trend === "up" && <TrendingUp className="h-3 w-3" />}
                {change.trend === "down" && <TrendingDown className="h-3 w-3" />}
                {change.value > 0 ? `+${change.value}%` : `${change.value}%`}
              </span>
            )}
            {change?.label && (
              <span className="text-zinc-500 dark:text-zinc-400">{change.label}</span>
            )}
            {!change && description && (
              <span className="text-zinc-500 dark:text-zinc-400">{description}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
