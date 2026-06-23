import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function ClassicIcon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
      <rect x="4" y="3" width="15" height="20" rx="2" />
      <circle cx="10.5" cy="9.5" r="3.5" />
      <path d="m14 13 2 2" />
    </svg>
  );
}
