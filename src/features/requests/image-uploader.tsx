"use client";
import * as React from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/provider";
import { api, ApiClientError } from "@/lib/api-client";

export interface UploadedImage {
  id: string;
  url: string;
}

const MAX_FILES = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = ["image/jpeg", "image/png", "image/webp"];

export function ImageUploader({ value, onChange }: { value: UploadedImage[]; onChange: (images: UploadedImage[]) => void }) {
  const { t, td } = useI18n();
  const [uploading, setUploading] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const valueRef = React.useRef(value);
  valueRef.current = value;

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files).slice(0, MAX_FILES - valueRef.current.length);
    for (const file of list) {
      // Client-side checks for fast feedback; the server re-validates by magic bytes.
      if (!ACCEPT.includes(file.type)) {
        toast.error(t("errors.fileType"));
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(t("errors.fileTooLarge"));
        continue;
      }
      setUploading((n) => n + 1);
      try {
        const form = new FormData();
        form.append("file", file);
        const img = await api.upload<UploadedImage>("/api/uploads", form);
        onChange([...valueRef.current, img]);
      } catch (e) {
        toast.error(td(`errors.${e instanceof ApiClientError ? e.code : "server"}`));
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = async (id: string) => {
    onChange(value.filter((i) => i.id !== id));
    await api.delete(`/api/uploads/${id}`).catch(() => undefined);
  };

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {value.map((img) => (
        <div key={img.id} className="group relative aspect-square overflow-hidden rounded-xl border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.url} alt="" className="size-full object-cover" loading="lazy" />
          <button
            type="button"
            onClick={() => remove(img.id)}
            className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
            aria-label={t("requests.removeImage")}
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
      {Array.from({ length: uploading }).map((_, i) => (
        <div key={`u${i}`} className="flex aspect-square items-center justify-center rounded-xl border bg-muted" role="status" aria-label={t("requests.uploading")}>
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ))}
      {value.length + uploading < MAX_FILES && (
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed bg-card text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-primary focus-within:ring-2 focus-within:ring-ring">
          <ImagePlus className="size-5" aria-hidden />
          <span className="px-1 text-center">{t("requests.addImage")}</span>
          <input ref={inputRef} type="file" accept={ACCEPT.join(",")} multiple className="sr-only" onChange={(e) => handleFiles(e.target.files)} />
        </label>
      )}
    </div>
  );
}
