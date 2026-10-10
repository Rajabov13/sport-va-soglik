"use client";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import type { z } from "zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, NativeSelect } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FormField } from "@/components/shared/form-field";
import { DynamicIcon, ICON_NAMES } from "@/components/shared/icons";
import { CardListSkeleton, ErrorState } from "@/components/shared/states";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api-client";
import { categoryName } from "@/lib/format";
import { useApiError } from "@/hooks/use-api-error";
import { categorySchema, type CategoryInput } from "@/schemas/misc";
import type { CategoryDTO } from "@/types/api";

type Row = CategoryDTO & { _count: { requests: number } };
type FormValues = Omit<z.input<typeof categorySchema>, "relatedSkills"> & { relatedSkills: string };

const EMPTY: FormValues = { slug: "", icon: "Sparkles", color: "#4f5bd5", nameUz: "", nameRu: "", nameEn: "", relatedSkills: "", isActive: true, sortOrder: 0 };

export function CategoriesManager() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const onError = useApiError();
  const [editing, setEditing] = React.useState<Row | "new" | null>(null);
  const query = useQuery({ queryKey: ["admin", "categories"], queryFn: () => api.get<Row[]>("/api/admin/categories") });
  // Skills are edited as a comma-separated string, so the form is validated with the Zod schema after normalising it.
  const form = useForm<FormValues>({ defaultValues: EMPTY });
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
  };
  const save = useMutation({
    mutationFn: (v: CategoryInput) => (editing && editing !== "new" ? api.put(`/api/admin/categories/${editing.id}`, v) : api.post("/api/admin/categories", v)),
    onSuccess: () => {
      toast.success(t("admin.categorySaved"));
      setEditing(null);
      invalidate();
    },
    onError: (e) => onError(e, form.setError),
  });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/api/admin/categories/${id}`), onSuccess: invalidate, onError: (e) => onError(e) });

  const open = (row: Row | "new") => {
    setEditing(row);
    form.reset(row === "new" ? EMPTY : { slug: row.slug, icon: row.icon, color: row.color, nameUz: row.nameUz, nameRu: row.nameRu, nameEn: row.nameEn, relatedSkills: row.relatedSkills.join(", "), isActive: row.isActive, sortOrder: row.sortOrder });
  };

  const submit = form.handleSubmit((v) => {
    form.clearErrors();
    const parsed = categorySchema.safeParse({ ...v, relatedSkills: v.relatedSkills.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) });
    if (!parsed.success) {
      for (const [k, msgs] of Object.entries(parsed.error.flatten().fieldErrors)) form.setError(k as keyof FormValues, { message: msgs?.[0] });
      return;
    }
    save.mutate(parsed.data);
  });

  if (query.isPending) return <CardListSkeleton count={4} />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  const { errors } = form.formState;

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button onClick={() => open("new")}>
          <Plus /> {t("admin.newCategory")}
        </Button>
      </div>
      <ul className="grid gap-2 md:grid-cols-2">
        {query.data.map((c) => (
          <li key={c.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-soft">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${c.color}1a`, color: c.color }}>
              <DynamicIcon name={c.icon} className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{categoryName(c, locale)}</p>
              <p className="truncate text-xs text-muted-foreground">
                {c.slug} · {t("campaigns.requests", { count: c._count.requests })}
              </p>
            </div>
            {!c.isActive && <Badge variant="muted">—</Badge>}
            <Button variant="ghost" size="icon" onClick={() => open(c)} aria-label={t("common.edit")}>
              <Pencil />
            </Button>
            <ConfirmDialog
              title={t("admin.confirmDelete")}
              confirmLabel={t("admin.remove")}
              cancelLabel={t("common.cancel")}
              destructive
              onConfirm={() => remove.mutateAsync(c.id).catch(() => undefined)}
              trigger={
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label={t("admin.remove")}>
                  <Trash2 />
                </Button>
              }
            />
          </li>
        ))}
      </ul>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent closeLabel={t("common.close")} className="sm:max-w-xl">
          <form onSubmit={submit} className="grid gap-4" noValidate>
            <DialogHeader>
              <DialogTitle>{editing === "new" ? t("admin.newCategory") : t("common.edit")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="cat-slug" label={t("admin.slug")} error={errors.slug?.message}>
                <Input {...form.register("slug")} />
              </FormField>
              <FormField id="cat-icon" label={t("admin.icon")} error={errors.icon?.message}>
                <NativeSelect {...form.register("icon")}>
                  {ICON_NAMES.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField id="cat-nameUz" label={t("admin.nameUz")} error={errors.nameUz?.message}>
                <Input {...form.register("nameUz")} />
              </FormField>
              <FormField id="cat-nameRu" label={t("admin.nameRu")} error={errors.nameRu?.message}>
                <Input {...form.register("nameRu")} />
              </FormField>
              <FormField id="cat-nameEn" label={t("admin.nameEn")} error={errors.nameEn?.message}>
                <Input {...form.register("nameEn")} />
              </FormField>
              <FormField id="cat-color" label={t("admin.color")} error={errors.color?.message}>
                <Input type="color" className="h-11 p-1" {...form.register("color")} />
              </FormField>
              <FormField id="cat-sort" label={t("admin.sortOrder")} error={errors.sortOrder?.message}>
                <Input type="number" min={0} {...form.register("sortOrder")} />
              </FormField>
              <Controller
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <label className="flex items-center gap-3 self-end rounded-xl border p-2.5 text-sm">
                    <Switch checked={field.value} onCheckedChange={field.onChange} /> {t("admin.isActive")}
                  </label>
                )}
              />
            </div>
            <FormField id="cat-skills" label={t("admin.relatedSkills")} error={errors.relatedSkills?.message} optional>
              <Input {...form.register("relatedSkills")} />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>{t("common.cancel")}</Button>
              <Button type="submit" loading={save.isPending}>{t("common.save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
