"use client";
import * as React from "react";
import Link from "next/link";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FormField } from "@/components/shared/form-field";
import { DynamicIcon } from "@/components/shared/icons";
import { LocationPicker } from "@/features/map/location-picker";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api-client";
import { categoryName, minutesToTime, timeToMinutes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useApiError } from "@/hooks/use-api-error";
import { useCategories, useLocations } from "@/hooks/use-catalog";
import { useSkillLabel } from "@/hooks/use-skill-label";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { volunteerProfileSchema, type VolunteerProfileInput } from "@/schemas/volunteer";
import { SKILLS } from "@/config/skills";

type FormInput = z.input<typeof volunteerProfileSchema>;

function Chip({ on, onClick, children, testId }: { on: boolean; onClick: () => void; children: React.ReactNode; testId?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      data-testid={testId}
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition", on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40")}
    >
      {children}
    </button>
  );
}

export function VolunteerProfileForm({ userId, initial }: { userId: string; initial: VolunteerProfileInput }) {
  const { t, td, locale } = useI18n();
  const qc = useQueryClient();
  const onError = useApiError();
  const skillLabel = useSkillLabel();
  const { data: categories } = useCategories();
  const { data: locations } = useLocations();
  const [customSkill, setCustomSkill] = React.useState("");
  const form = useForm<FormInput, unknown, VolunteerProfileInput>({ resolver: zodResolver(volunteerProfileSchema), defaultValues: initial });
  const { errors, isSubmitting, isDirty } = form.formState;
  const slots = useFieldArray({ control: form.control, name: "availability" });
  useUnsavedChanges(isDirty && !isSubmitting, t("common.unsavedChanges"));
  const radius = form.watch("radiusKm");
  const skills = form.watch("skills") ?? [];

  const save = form.handleSubmit(async (values) => {
    try {
      await api.put("/api/volunteer/profile", values);
      form.reset(values);
      toast.success(t("volunteer.saved"));
      qc.invalidateQueries({ queryKey: ["matches"] });
    } catch (e) {
      onError(e, form.setError);
    }
  });

  const allSkills = Array.from(new Set([...SKILLS, ...skills]));

  return (
    <form onSubmit={save} className="grid gap-5 pb-24 lg:pb-0" noValidate>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>{t("common.profile")}</CardTitle>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/volunteers/${userId}`}>
              <ExternalLink /> {t("volunteer.publicProfile")}
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4">
          <FormField id="bio" label={t("volunteer.bio")} error={errors.bio?.message} optional>
            <Textarea rows={3} placeholder={t("volunteer.bioPlaceholder")} {...form.register("bio")} />
          </FormField>
          <Controller
            control={form.control}
            name="isAvailableNow"
            render={({ field }) => (
              <label className="flex items-center justify-between gap-4 rounded-xl border p-3">
                <span>
                  <span className="block text-sm font-semibold">{t("volunteer.available")}</span>
                  <span className="block text-xs text-muted-foreground">{t("volunteer.availableHint")}</span>
                </span>
                <Switch checked={field.value} onCheckedChange={field.onChange} aria-label={t("volunteer.available")} />
              </label>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("volunteer.skills")}</CardTitle>
          <CardDescription>{t("volunteer.skillsHint")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Controller
            control={form.control}
            name="skills"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {allSkills.map((s) => {
                  const on = field.value?.includes(s) ?? false;
                  return (
                    <Chip key={s} on={on} testId={`skill-${s}`} onClick={() => field.onChange(on ? field.value!.filter((x) => x !== s) : [...(field.value ?? []), s])}>
                      {skillLabel(s)}
                    </Chip>
                  );
                })}
              </div>
            )}
          />
          <div className="flex gap-2">
            <Input
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              maxLength={40}
              aria-label={t("volunteer.addSkill")}
              placeholder={t("volunteer.addSkill")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  (e.currentTarget.nextElementSibling as HTMLButtonElement | null)?.click();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const v = customSkill.trim().toLowerCase();
                if (v.length >= 2 && !skills.includes(v)) form.setValue("skills", [...skills, v], { shouldDirty: true });
                setCustomSkill("");
              }}
            >
              <Plus /> {t("volunteer.addSkill")}
            </Button>
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">{t("volunteer.categories")}</legend>
            <Controller
              control={form.control}
              name="categoryIds"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {categories?.map((c) => {
                    const on = field.value?.includes(c.id) ?? false;
                    return (
                      <Chip key={c.id} on={on} onClick={() => field.onChange(on ? field.value!.filter((x) => x !== c.id) : [...(field.value ?? []), c.id])}>
                        <DynamicIcon name={c.icon} className="size-3.5" /> {categoryName(c, locale)}
                      </Chip>
                    );
                  })}
                </div>
              )}
            />
            {errors.categoryIds?.message && <p role="alert" className="text-xs font-medium text-destructive">{td(`validation.${errors.categoryIds.message}`)}</p>}
          </fieldset>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("volunteer.homeLocation")}</CardTitle>
          <CardDescription>{t("volunteer.homeLocationHint")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <LocationPicker
            latitude={Number(form.watch("latitude"))}
            longitude={Number(form.watch("longitude"))}
            center={[Number(initial.latitude), Number(initial.longitude)]}
            invalid={!!errors.latitude}
            onChange={(la, ln) => {
              form.setValue("latitude", la, { shouldDirty: true, shouldValidate: true });
              form.setValue("longitude", ln, { shouldDirty: true, shouldValidate: true });
            }}
          />
          <div className="grid gap-2">
            <label htmlFor="radiusKm" className="flex items-center justify-between text-sm font-medium">
              {t("volunteer.radius")} <span className="tabular-nums text-primary">{t("common.km", { value: Number(radius) })}</span>
            </label>
            <input id="radiusKm" type="range" min={1} max={100} step={1} className="w-full accent-[hsl(var(--primary))]" {...form.register("radiusKm")} />
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">{t("volunteer.preferredCities")}</legend>
            <Controller
              control={form.control}
              name="preferredLocationIds"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {locations?.map((l) => {
                    const on = field.value?.includes(l.id) ?? false;
                    return (
                      <Chip key={l.id} on={on} onClick={() => field.onChange(on ? field.value!.filter((x) => x !== l.id) : [...(field.value ?? []), l.id])}>
                        {l.city}
                      </Chip>
                    );
                  })}
                </div>
              )}
            />
          </fieldset>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("volunteer.availability")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {slots.fields.map((slot, i) => (
            <div key={slot.id} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
              <label className="grid gap-1">
                <span className="text-xs text-muted-foreground">{t("volunteer.day")}</span>
                <NativeSelect {...form.register(`availability.${i}.dayOfWeek`)}>
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                    <option key={d} value={d}>
                      {td(`days.${d}`)}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <Controller
                control={form.control}
                name={`availability.${i}.startMinute`}
                render={({ field }) => (
                  <label className="grid gap-1">
                    <span className="text-xs text-muted-foreground">{t("volunteer.from")}</span>
                    <Input type="time" value={minutesToTime(Number(field.value))} onChange={(e) => field.onChange(timeToMinutes(e.target.value))} />
                  </label>
                )}
              />
              <Controller
                control={form.control}
                name={`availability.${i}.endMinute`}
                render={({ field }) => (
                  <label className="grid gap-1">
                    <span className="text-xs text-muted-foreground">{t("volunteer.to")}</span>
                    <Input
                      type="time"
                      value={minutesToTime(Number(field.value) >= 1440 ? 1439 : Number(field.value))}
                      onChange={(e) => field.onChange(timeToMinutes(e.target.value))}
                      aria-invalid={!!errors.availability?.[i]?.endMinute}
                    />
                  </label>
                )}
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => slots.remove(i)} aria-label={t("volunteer.removeSlot")}>
                <Trash2 />
              </Button>
              {errors.availability?.[i]?.endMinute?.message && (
                <p role="alert" className="col-span-4 text-xs font-medium text-destructive">
                  {td(`validation.${errors.availability[i]!.endMinute!.message}`)}
                </p>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" className="w-fit" onClick={() => slots.append({ dayOfWeek: 6, startMinute: 10 * 60, endMinute: 14 * 60 })}>
            <Plus /> {t("volunteer.addSlot")}
          </Button>
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t bg-card/95 p-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0">
        <div className="mx-auto flex max-w-6xl lg:justify-end">
          <Button type="submit" size="lg" className="w-full lg:w-auto" loading={isSubmitting} data-testid="save-volunteer-profile">
            {t("common.save")}
          </Button>
        </div>
      </div>
    </form>
  );
}
