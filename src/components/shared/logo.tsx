import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden>
      <rect width="40" height="40" rx="12" fill="hsl(238 62% 38%)" />
      <path d="M12 21.5c0-4.4 3.6-8 8-8s8 3.6 8 8" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M14.5 25.5 20 30l5.5-4.5" fill="none" stroke="hsl(152 62% 56%)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="13.5" r="2.4" fill="hsl(152 62% 56%)" />
    </svg>
  );
}

export function Logo({ href = "/", className, label }: { href?: string; className?: string; label: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-extrabold tracking-tight", className)} aria-label={label}>
      <LogoMark />
      <span className="text-lg text-primary">QO‘LLAB</span>
    </Link>
  );
}
