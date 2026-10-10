import {
  Accessibility, Baby, Clock, Crown, GraduationCap, HandHeart, HeartHandshake, Leaf, Medal, Pill, ShieldCheck, Siren, Sparkles, Utensils, Zap,
  type LucideIcon,
} from "lucide-react";

/** Explicit icon registry (keeps the bundle small; names are stored in the DB). */
const ICONS: Record<string, LucideIcon> = {
  Accessibility, Baby, Clock, Crown, GraduationCap, HandHeart, HeartHandshake, Leaf, Medal, Pill, ShieldCheck, Siren, Sparkles, Utensils, Zap,
};

export const ICON_NAMES = Object.keys(ICONS);

export function DynamicIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon className={className} style={style} aria-hidden />;
}
