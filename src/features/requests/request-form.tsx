"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { DynamicIcon } from "@/components/shared/icons";
import { useSession } from "@/components/shared/session";
import { LocationPicker } from "@/features/map/location-picker";
import { useI18n } from "@/i18n/provider";
import { api } from "@/lib/api-client";
import { categoryName } from "@/lib/format";
import { DEFAULT_CENTER } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { useApiError } from "@/hooks/use-api-error";
import { useCategories, useLocations } from "@/hooks/use-catalog";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { CONTACT_METHODS, createRequestSchema, URGENCIES, type CreateRequestInput } from "@/schemas/request";
import { ImageUploader, type UploadedImage } from "./image-uploader";

type FormInput = z.input<typeof createRequestSchema>;

export interface RequestFormInitial {
  id: string;
  status: string;
  title: string;
  description: string;
  categoryId: string;
  urgency: (typeof URGENCIES)[number];
  address: string;
  locationId: string | null;
  latitude: number;
  longitude: number;
  preferredDate: string | null;
  contactPreferences: (typeof CONTACT_METHODS)[number][];
  contactPhone: string | null;
  additionalInfo: string | null;
  peopleCount: number;
  estimatedHours: number;
  images: UploadedImage[];
  campaignId: string | null;
}

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const URGENCY_TONE = {
  LOW: "border-slate-200 data-[on=true]:border-slate-500 data-[on=true]:bg-slate-50",
  MEDIUM: "border-indigo-100 data-[on=true]:border-primary data-[on=true]:bg-primary-soft",
  HIGH: "border-amber-100 data-[on=true]:border-amber-500 data-[on=true]:bg-amber-50",
  CRITICAL: "border-red-100 data-[on=true]:border-red-500 data-[on=true]:bg-red-50",
} as const;

export function RequestForm({ initial }: { initial?: RequestFormInitial }) {
  const { t, td, locale } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const onError = useApiError();
  const { user } = useSession();
  const { data: categories } = useCategories();
  const { data: locations } = useLocations();
  const { data: org } = useQuery({
    queryKey: ["organization"],
    queryFn: () => api.get<{ campaigns: { id: string; title: string; status: string }[] }>("/api/organization"),
    enabled: user?.role === "ORGANIZATION",
  });
  const [images, setImages] = React.useState<UploadedImage[]>(initial?.images ?? []);
  const [suggesting, setSuggesting] = React.useState(false);
  const [suggestion, setSuggestion] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<"draft" | "publish">("publish");

  const form = useForm<FormInput, unknown, CreateRequestInput>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: {
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      categoryId: initial?.categoryId ?? "",
      urgency: initial?.urgency ?? "MEDIUM",
      address: initial?.address ?? "",
      locationId: initial?.locationId ?? "",
      latitude: initial?.latitude ?? (undefined as unknown as number),
      longitude: initial?.longitude ?? (undefined as unknown as number),
      preferredDate: toLocalInput(initial?.preferredDate ?? null),
      contactPreferences: initial?.contactPreferences ?? ["CHAT"],
      contactPhone: initial?.contactPhone ?? "",
      additionalInfo: initial?.additionalInfo ?? "",
      peopleCount: initial?.peopleCount ?? 1,
      estimatedHours: initial?.estimatedHours ?? 2,
      imageIds: initial?.images.map((i) => i.id) ?? [],
      campaignId: initial?.campaignId ?? "",
      asDraft: false,
    },
  });
  const { errors, isSubmitting, isDirty } = form.formState;
  useUnsavedChanges(isDirty && !isSubmitting, t("common.unsavedChanges"));

  const contact = form.watch("contactPreferences") ?? [];
  const locationId = form.watch("locationId");
  const lat = form.watch("latitude");
  const lng = form.watch("longitude");
  const description = form.watch("description") ?? "";
  const city = locations?.find((l) => l.id === locationId);
  const mapCenter: [number, number] = city ? [city.latitude, city.longitude] : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];

  React.useEffect(() => {
    form.setValue("imageIds", images.map((i) => i.id), { shouldDirty: images.length !== (initial?.images.length ?? 0) });
  }, [images, form, initial?.images.length]);

  const suggest = async () => {
    const text = `${form.getValues("title")}\n${form.getValues("description")}`.trim();
    if (text.length < 10) {
      form.setError("description", { message: "tooShort" });
      return;
    }
    setSuggesting(true);
    try {
      const res = await api.post<{ categoryId: string | null; urgency: (typeof URGENCIES)[number]; source: "ai" | "keywords" }>("/api/ai/classify", { text });
      if (res.categoryId) form.setValue("categoryId", res.categoryId, { shouldDirty: true, shouldValidate: true });
      form.setValue("urgency", res.urgency, { shouldDirty: true });
      const cat = categories?.find((c) => c.id === res.categoryId);
      const vars = { category: cat ? categoryName(cat, locale) : "—", urgency: t(`urgency.${res.urgency}`) };
      setSuggestion(res.source === "ai" ? t("requests.suggestedAi", vars) : t("requests.suggestedKeywords", vars));
    } catch (e) {
      onError(e);
    } finally {
      setSuggesting(false);
    }
  };

  const submit: SubmitHandler<CreateRequestInput> = async (values) => {
    const payload = {
      ...values,
      asDraft: mode === "draft",
      preferredDate: values.preferredDate ? new Date(values.preferredDate).toISOString() : null,
      locationId: values.locationId || null,
      campaignId: values.campaignId || null,
      contactPhone: values.contactPhone || "",
    };
    try {
      if (initial) {
        await api.patch(`/api/requests/${initial.id}`, payload);
        if (initial.status === "DRAFT" && mode === "publish") {
          await api.post(`/api/requests/${initial.id}/submit`);
          toast.success(t("requests.created"));
        } else {
          toast.success(mode === "draft" ? t("requests.draftSaved") : t("requests.updated"));
        }
        form.reset(form.getValues());
        await qc.invalidateQueries({ queryKey: ["request", initial.id] });
        router.push(`/dashboard/requests/${initial.id}`);
      } else {
        const res = await api.post<{ id: string; status: string }>("/api/requests", payload);
        toast.success(mode === "draft" ? t("requests.draftSaved") : res.status === "PENDING" ? t("requests.createdPending") : t("requests.created"));
        form.reset(form.getValues());
        await qc.invalidateQueries({ queryKey: ["requests"] });
        router.push(`/dashboard/requests/${res.id}`);
      }
      router.refresh();
    } catch (e) {
      onError(e, form.setError);
    }
  };

  const onInvalid = () => {
    toast.error(t("errors.validation"));
    const first = document.querySelector<HTMLElement>("[aria-invalid=true]");
    first?.focus();
    first?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <form onSubmit={form.handleSubmit(submit, onInvalid)} noValidate className="grid gap-5 pb-24 lg:pb-0">
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="mr-2 inline-flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">1</span>
            {t("requests.stepDetails")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <FormField id="title" label={t("requests.fieldTitle")} error={errors.title?.message}>
            <Input placeholder={t("requests.fieldTitlePlaceholder")} maxLength={120} {...form.register("title")} />
          </FormField>
          <FormField id="description" label={t("requests.fieldDescription")} error={errors.description?.message} hint={`${description.length} / 2000`}>
            <Textarea rows={5} placeholder={t("requests.fieldDescriptionPlaceholder")} maxLength={2000} {...form.register("description")} />
          </FormField>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="soft" size="sm" onClick={suggest} loading={suggesting}>
              {!suggesting && <Sparkles />} {suggesting ? t("requests.suggesting") : t("requests.suggest")}
            </Button>
            {suggestion && (
              <p className="text-xs text-muted-foreground" role="status">
                {suggestion}
              </p>
            )}
          </div>

          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">{t("requests.fieldCategory")}</legend>
            <Controller
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <div role="radiogroup" aria-invalid={!!errors.categoryId} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {categories?.map((c) => {
                    const on = field.value === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => field.onChange(c.id)}
                        data-testid={`category-${c.slug}`}
                        className={cn("flex min-w-0 items-center gap-2 rounded-xl border bg-card p-2.5 text-left text-sm transition", on ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/40")}
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${c.color}1a`, color: c.color }}>
                          <DynamicIcon name={c.icon} className="size-4" />
                        </span>
                        <span className="truncate font-medium">{categoryName(c, locale)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            />
            {errors.categoryId?.message && <p role="alert" className="text-xs font-medium text-destructive">{td(`validation.${errors.categoryId.message}`)}</p>}
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">{t("requests.fieldUrgency")}</legend>
            <Controller
              control={form.control}
              name="urgency"
              render={({ field }) => (
                <div role="radiogroup" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  {URGENCIES.map((u) => (
                    <button
                      key={u}
                      type="button"
                      role="radio"
                      aria-checked={field.value === u}
                      data-on={field.value === u}
                      data-testid={`urgency-${u}`}
                      onClick={() => field.onChange(u)}
                      className={cn("rounded-xl border-2 bg-card p-3 text-left transition", URGENCY_TONE[u])}
                    >
                      <span className="block text-sm font-semibold">{t(`urgency.${u}`)}</span>
                      <span className="block text-xs text-muted-foreground">{td(`requests.urgencyHint${u}`)}</span>
                    </button>
                  ))}
                </div>
              )}
            />
          </fieldset>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <span className="mr-2 inline-flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">2</span>
            {t("requests.stepLocation")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="locationId" label={t("requests.fieldCity")} error={errors.locationId?.message}>
              <NativeSelect
                {...form.register("locationId", {
                  onChange: (e) => {
                    const l = locations?.find((x) => x.id === e.target.value);
                    if (l && (form.getValues("latitude") === undefined || Number.isNaN(Number(form.getValues("latitude"))))) {
                      form.setValue("latitude", l.latitude, { shouldDirty: true, shouldValidate: true });
                      form.setValue("longitude", l.longitude, { shouldDirty: true, shouldValidate: true });
                    }
                  },
                })}
              >
                <option value="">—</option>
                {locations?.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.city}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField id="address" label={t("requests.fieldAddress")} error={errors.address?.message}>
              <Input placeholder={t("requests.fieldAddressPlaceholder")} autoComplete="street-address" {...form.register("address")} />
            </FormField>
          </div>
          <div className="grid gap-1.5">
            <span className="text-sm font-medium">{t("requests.fieldMap")}</span>
            <LocationPicker
              latitude={lat === undefined ? undefined : Number(lat)}
              longitude={lng === undefined ? undefined : Number(lng)}
              center={mapCenter}
              invalid={!!errors.latitude || !!errors.longitude}
              onChange={(la, ln) => {
                form.setValue("latitude", la, { shouldDirty: true, shouldValidate: true });
                form.setValue("longitude", ln, { shouldDirty: true, shouldValidate: true });
                if (!form.getValues("locationId") && locations?.length) {
                  // Snap the city to the nearest known location for statistics.
                  const nearest = [...locations].sort((a, b) => Math.hypot(a.latitude - la, a.longitude - ln) - Math.hypot(b.latitude - la, b.longitude - ln))[0];
                  form.setValue("locationId", nearest.id, { shouldDirty: true });
                }
              }}
            />
            {errors.latitude?.message || errors.longitude?.message ? (
              <p role="alert" className="text-xs font-medium text-destructive">{t("validation.coordinates")}</p>
            ) : (
              <p className="text-xs text-muted-foreground">{t("requests.fieldMapHint")}</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="preferredDate" label={t("requests.fieldPreferredDate")} error={errors.preferredDate?.message} optional>
              <Input type="datetime-local" {...form.register("preferredDate")} />
            </FormField>
            <FormField id="peopleCount" label={t("requests.fieldPeople")} error={errors.peopleCount?.message}>
              <Input type="number" inputMode="numeric" min={1} max={500} {...form.register("peopleCount")} />
            </FormField>
            <FormField id="estimatedHours" label={t("requests.fieldHours")} error={errors.estimatedHours?.message}>
              <Input type="number" inputMode="decimal" min={0.5} max={48} step={0.5} {...form.register("estimatedHours")} />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <span className="mr-2 inline-flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">3</span>
            {t("requests.stepExtra")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">{t("requests.fieldContact")}</legend>
            <Controller
              control={form.control}
              name="contactPreferences"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {CONTACT_METHODS.map((m) => {
                    const checked = field.value?.includes(m) ?? false;
                    return (
                      <label key={m} className={cn("flex cursor-pointer items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm", checked && "border-primary bg-primary-soft/40")}>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => field.onChange(v ? [...(field.value ?? []), m] : (field.value ?? []).filter((x) => x !== m))}
                        />
                        {t(`contact.${m}`)}
                      </label>
                    );
                  })}
                </div>
              )}
            />
            {errors.contactPreferences?.message && <p role="alert" className="text-xs font-medium text-destructive">{td(`validation.${errors.contactPreferences.message}`)}</p>}
          </fieldset>
          {contact.includes("PHONE") && (
            <FormField id="contactPhone" label={t("requests.fieldPhone")} error={errors.contactPhone?.message}>
              <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="+998 90 123 45 67" {...form.register("contactPhone")} />
            </FormField>
          )}
          <FormField id="additionalInfo" label={t("requests.fieldAdditional")} error={errors.additionalInfo?.message} optional>
            <Textarea rows={3} placeholder={t("requests.fieldAdditionalPlaceholder")} {...form.register("additionalInfo")} />
          </FormField>
          {user?.role === "ORGANIZATION" && !!org?.campaigns.length && (
            <FormField id="campaignId" label={t("requests.fieldCampaign")} optional>
              <NativeSelect {...form.register("campaignId")}>
                <option value="">{t("requests.noCampaign")}</option>
                {org.campaigns
                  .filter((c) => c.status === "ACTIVE")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
              </NativeSelect>
            </FormField>
          )}
          <div className="grid gap-1.5">
            <span className="text-sm font-medium">{t("requests.fieldImages")}</span>
            <ImageUploader value={images} onChange={setImages} />
            <p className="text-xs text-muted-foreground">{t("requests.fieldImagesHint")}</p>
          </div>
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 p-3 backdrop-blur pb-safe lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:p-0">
        <div className="mx-auto flex max-w-6xl gap-2 lg:justify-end">
          {(!initial || initial.status === "DRAFT") && (
            <Button type="submit" variant="outline" size="lg" className="min-w-0 flex-1 lg:flex-none" loading={isSubmitting && mode === "draft"} disabled={isSubmitting} onClick={() => setMode("draft")}>
              <span className="truncate sm:hidden">{t("requests.saveDraftShort")}</span>
              <span className="hidden sm:inline">{t("requests.saveDraft")}</span>
            </Button>
          )}
          <Button type="submit" className="min-w-0 flex-[2] lg:flex-none" size="lg" loading={isSubmitting && mode === "publish"} disabled={isSubmitting} onClick={() => setMode("publish")} data-testid="publish-request">
            {initial && initial.status !== "DRAFT" ? t("common.save") : isSubmitting ? t("requests.publishing") : t("requests.publish")}
          </Button>
        </div>
      </div>
    </form>
  );
}
