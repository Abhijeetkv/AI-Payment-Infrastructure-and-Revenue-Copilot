import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function ChartContainer({
  title,
  description,
  action,
  children,
  className,
  ...props
}: ChartContainerProps) {
  return (
    <Card className={cn("overflow-hidden border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 shadow-sm", className)} {...props}>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
        <div>
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</CardTitle>
          {description && <CardDescription className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</CardDescription>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </CardHeader>
      <CardContent className="pt-2">{children}</CardContent>
    </Card>
  );
}

