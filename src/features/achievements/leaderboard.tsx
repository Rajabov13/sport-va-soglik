import Link from "next/link";
import { Medal, Star } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import type { Translator } from "@/i18n/translate";
import { cn } from "@/lib/utils";

export interface LeaderRow {
  rank: number;
  userId: string;
  name: string;
  avatarUrl: string | null;
  xp: number;
  completedCount: number;
  hoursTotal: number;
  ratingAvg: number;
}

const MEDAL = ["text-amber-500", "text-slate-400", "text-orange-700"];

export function Leaderboard({ rows, t, highlightId }: { rows: LeaderRow[]; t: Translator; highlightId?: string }) {
  return (
    <ol className="grid gap-1.5">
      {rows.map((r) => (
        <li key={r.userId}>
          <Link href={`/volunteers/${r.userId}`} className={cn("flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-secondary", r.userId === highlightId && "bg-primary-soft")}>
            <span className="flex w-6 justify-center text-sm font-bold text-muted-foreground">
              {r.rank <= 3 ? <Medal className={cn("size-5", MEDAL[r.rank - 1])} aria-label={String(r.rank)} /> : r.rank}
            </span>
            <Avatar name={r.name} src={r.avatarUrl} className="size-9" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {r.name}
                {r.userId === highlightId && <span className="ml-1 text-xs font-normal text-primary">({t("common.you")})</span>}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {t("achievements.helps", { count: r.completedCount })} · <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden /> {r.ratingAvg ? r.ratingAvg.toFixed(1) : "—"}
              </span>
            </span>
            <span className="text-sm font-bold tabular-nums text-primary">{r.xp} XP</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
