"use client";
import { motion } from "framer-motion";
import { PartyPopper } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";
import { DynamicIcon } from "@/components/shared/icons";
import { ACHIEVEMENTS } from "@/server/domain/gamification";

export function CelebrationDialog({ open, onClose, xp, unlocked }: { open: boolean; onClose: () => void; xp: number; unlocked: string[] }) {
  const { t, td } = useI18n();
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={t("common.close")} className="text-center">
        <motion.div initial={{ scale: 0.6, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 14 }} className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-accent-soft text-accent">
          <PartyPopper className="size-8" aria-hidden />
        </motion.div>
        <DialogTitle className="text-xl">{t("request.confirmed")}</DialogTitle>
        <DialogDescription>{t("request.xpEarned", { xp })}</DialogDescription>
        {unlocked.length > 0 && (
          <div className="grid gap-2">
            <p className="text-sm font-semibold text-primary">{t("request.newAchievement")}</p>
            {unlocked.map((code, i) => {
              const a = ACHIEVEMENTS.find((x) => x.code === code);
              return (
                <motion.div key={code} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.15 }} className="flex items-center gap-3 rounded-xl border bg-primary-soft/50 p-3 text-left">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <DynamicIcon name={a?.icon ?? "Medal"} className="size-5" />
                  </span>
                  <span>
                    <span className="block font-semibold">{td(`achievements.${code}.name`)}</span>
                    <span className="block text-xs text-muted-foreground">{td(`achievements.${code}.description`)}</span>
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
        <Button onClick={onClose} className="w-full">
          {t("common.close")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
