import { randomBytes } from "crypto";
import { db } from "@/server/db";
import { storage } from "@/server/storage";
import { detectImageType } from "@/server/storage/validate";
import { ApiError } from "@/server/http/errors";
import { env } from "@/config/env";

export const MAX_PENDING_IMAGES = 20;

/** Store a request image. The record stays unattached until a request claims it. */
export async function uploadRequestImage(uploaderId: string, file: File) {
  if (file.size === 0) throw new ApiError(422, "fileType");
  if (file.size > env.storage.maxFileBytes) throw new ApiError(413, "fileTooLarge");
  const pending = await db.requestImage.count({ where: { uploaderId, requestId: null } });
  if (pending >= MAX_PENDING_IMAGES) throw new ApiError(429, "tooManyFiles");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) throw new ApiError(415, "fileType");

  const key = `requests/${uploaderId}/${randomBytes(12).toString("hex")}.${type.ext}`;
  const { url } = await storage().put(key, bytes, type.mime);
  const image = await db.requestImage.create({
    data: { uploaderId, url, storageKey: key, mimeType: type.mime, size: bytes.length },
  });
  return { id: image.id, url: image.url };
}

export async function deleteRequestImage(uploaderId: string, id: string) {
  const image = await db.requestImage.findFirst({ where: { id, uploaderId } });
  if (!image) throw new ApiError(404, "notFound");
  await storage().delete(image.storageKey).catch(() => undefined);
  await db.requestImage.delete({ where: { id } });
}
