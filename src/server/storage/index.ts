import { promises as fs } from "fs";
import path from "path";
import { env } from "@/config/env";
import { isSafeKey } from "./validate";

export interface StorageDriver {
  put(key: string, data: Uint8Array, contentType: string): Promise<{ url: string }>;
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
}

/**
 * Local filesystem driver. Files are served (with access control) by /api/files/[...key].
 * On read-only serverless hosts (Vercel) files go to /tmp.
 */
class LocalDriver implements StorageDriver {
  private root = path.resolve(process.env.VERCEL && !process.env.UPLOAD_DIR ? "/tmp/qollab-uploads" : env.storage.localDir);

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

let driver: StorageDriver | null = null;

/** Uploads are stored on the server's disk (no external storage service). */
export function storage(): StorageDriver {
  driver ??= new LocalDriver();
  return driver;
}
