import React from "react";

export function RazorpayIcon({
  className = "h-5 w-5",
  fill = "#0C83FE",
  ...props
}: React.SVGProps<SVGSVGElement> & { fill?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Official Razorpay slanted lightning glyph */}
      <path
        d="M74.3 8.5H38.2C34.5 8.5 31.2 10.9 30 14.4L11.5 68.2C9.8 73.1 13.4 78.1 18.6 78.1H40.2L30.8 94.8C29.2 97.7 31.7 101.1 35 100.4L87.2 41.5C90.3 38 87.8 32.4 83.1 32.4H63.6L75.3 15.9C76.8 12.4 74.2 8.5 74.3 8.5Z"
        fill={fill}
      />
    </svg>
  );
}

export function RazorpayLogo({
  className = "h-7 w-auto",
  iconClassName = "h-5 w-5",
  textColor = "text-[#191c1d]",
}: {
  className?: string;
  iconClassName?: string;
  textColor?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div className="h-8 w-8 rounded-lg bg-[#0C2340] flex items-center justify-center text-white shadow-xs">
        <RazorpayIcon className={iconClassName} fill="#0C83FE" />
      </div>
      <div className="flex flex-col">
        <span className={`font-bold text-lg leading-tight tracking-tight ${textColor}`}>
          Lumina
        </span>
        <span className="text-[11px] font-medium text-[#2a21d2] leading-tight">
          AI Revenue Recovery Agent
        </span>
      </div>
    </div>
  );
}
