import type { CSSProperties } from "react";

export function Icon({ name, fill, size, className, style }: {
  name: string;
  fill?: boolean;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`ic${fill ? " f" : ""}${className ? ` ${className}` : ""}`}
      style={size ? { fontSize: size, ...style } : style}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

export const RING = "M22 12.7A20 20 0 0 0 20 46H44A20 20 0 0 0 42 12.7";

export function HarborLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path className="logo-ring" d={RING} fill="none" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
      <circle className="logo-dot" cx="32" cy="29" r="5.5" />
    </svg>
  );
}
