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
    <Card className={cn("overflow-hidden", className)} {...props}>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription className="mt-1">{description}</CardDescription>}
        </div>
        {action && <div>{action}</div>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
