"use client";
import { useEffect } from "react";
// Loaded app-wide so the install prompt is captured on whichever page the browser fires it.
import "@/hooks/use-install-prompt";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }, []);
  return null;
}
