import { promises as fs } from "fs";
import path from "path";
import { env } from "@/config/env";
import { isSafeKey } from "./validate";

export interface StorageDriver {
  put(key: string, data: Uint8Array, contentType: string): Promise<{ url: string }>;
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
}

/** Local filesystem driver (development / single server). Files are served by /api/files/[...key]. */
class LocalDriver implements StorageDriver {
  private root = path.resolve(env.storage.localDir);

  private resolve(key: string) {
    if (!isSafeKey(key)) throw new Error("Unsafe storage key");
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error("Unsafe storage key");
    return full;
  }

  async put(key: string, data: Uint8Array) {
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
    return { url: `/api/files/${key}` };
  }

  async get(key: string) {
    try {
      return new Uint8Array(await fs.readFile(this.resolve(key)));
    } catch {
      return null;
    }
  }

  async delete(key: string) {
    await fs.rm(this.resolve(key), { force: true });
  }
}

/** Supabase Storage driver (production / serverless). Uses the service-role key server-side only. */
class SupabaseDriver implements StorageDriver {
  constructor(
    private baseUrl: string,
    private key: string,
    private bucket: string,
  ) {}

  private objectUrl(key: string) {
    return `${this.baseUrl}/storage/v1/object/${this.bucket}/${key}`;
  }

  async put(key: string, data: Uint8Array, contentType: string) {
    if (!isSafeKey(key)) throw new Error("Unsafe storage key");
    const res = await fetch(this.objectUrl(key), {
      method: "POST",
      headers: { Authorization: `Bearer ${this.key}`, "Content-Type": contentType, "x-upsert": "false" },
      body: Buffer.from(data),
    });
    if (!res.ok) throw new Error(`Supabase upload failed: ${res.status}`);
    // Files are proxied through /api/files so private attachments stay access-controlled.
    return { url: `/api/files/${key}` };
  }

  async get(key: string) {
    if (!isSafeKey(key)) return null;
    const res = await fetch(this.objectUrl(key), { headers: { Authorization: `Bearer ${this.key}` } });
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  }

  async delete(key: string) {
    await fetch(`${this.baseUrl}/storage/v1/object/${this.bucket}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: [key] }),
    });
  }
}

let driver: StorageDriver | null = null;

export function storage(): StorageDriver {
  if (driver) return driver;
  const s = env.storage;
  driver =
    s.driver === "supabase" && s.supabaseUrl && s.supabaseServiceKey
      ? new SupabaseDriver(s.supabaseUrl.replace(/\/$/, ""), s.supabaseServiceKey, s.supabaseBucket)
      : new LocalDriver();
  return driver;
}
