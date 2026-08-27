import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default:
          "border border-[#2a21d2]/20 bg-[#2a21d2]/10 text-[#2a21d2]",
        secondary:
          "border border-[#c4c7c7] bg-[#e7e8e9] text-[#444748]",
        destructive:
          "border border-[#c92a2a]/20 bg-[#c92a2a]/10 text-[#c92a2a]",
        success:
          "border border-[#087343]/20 bg-[#087343]/10 text-[#087343]",
        warning:
          "border border-[#f59e0b]/20 bg-[#f59e0b]/10 text-[#b45309]",
        purple:
          "border border-[#2a21d2]/20 bg-[#f0f0ff] text-[#2a21d2]",
        info:
          "border border-[#0284c7]/20 bg-[#f0f9ff] text-[#0284c7]",
        outline:
          "border border-[#c4c7c7] text-[#191c1d] bg-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 shrink-0" />}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };

