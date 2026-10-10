"use client";
import * as React from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import { useRequestAction } from "./use-request-action";

export function ReviewDialog({ requestId }: { requestId: string }) {
  const { t } = useI18n();
  const [open, setOpen] = React.useState(false);
  const [rating, setRating] = React.useState(5);
  const [hover, setHover] = React.useState<number | null>(null);
  const [comment, setComment] = React.useState("");
  const action = useRequestAction(requestId, "review", () => {
    toast.success(t("request.reviewSent"));
    setOpen(false);
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="accent" className="w-full" data-testid="review-open">
          <Star /> {t("request.review")}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={t("common.close")}>
        <DialogHeader>
          <DialogTitle>{t("request.reviewTitle")}</DialogTitle>
        </DialogHeader>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t("request.reviewRating")}</legend>
          <div className="flex gap-1" role="radiogroup" onMouseLeave={() => setHover(null)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} ★`}
                onMouseEnter={() => setHover(n)}
                onClick={() => setRating(n)}
                className="rounded-lg p-1 transition hover:scale-110"
              >
                <Star className={cn("size-9", (hover ?? rating) >= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-1.5">
          <Label htmlFor="review-comment">{t("request.reviewComment")}</Label>
          <Textarea id="review-comment" rows={4} maxLength={1000} placeholder={t("request.reviewPlaceholder")} value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button loading={action.isPending} onClick={() => action.mutate({ rating, comment })} data-testid="review-submit">
            {t("common.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
