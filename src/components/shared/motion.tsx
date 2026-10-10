import { cn } from "@/lib/utils";

/**
 * Subtle CSS entrance animation. Content is never hidden from crawlers or no-JS users,
 * and the effect is disabled for people who prefer reduced motion.
 */
export function FadeIn({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <div className={cn("motion-safe:animate-fade-up", className)} style={{ animationDelay: `${delay}s` }}>
      {children}
    </div>
  );
}
