"use client";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Chrome can fire `beforeinstallprompt` before React mounts, so capture it as soon as this module loads.
let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

/** PWA install support: exposes the browser's native install dialog when one is available. */
export function useInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    setInstalled(isStandalone());
    setEvent(deferred);
    const update = () => setEvent(deferred);
    const onInstalled = () => setInstalled(true);
    listeners.add(update);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      listeners.delete(update);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return {
    canInstall: !!event && !installed,
    installed,
    install: async () => {
      if (!event) return false;
      await event.prompt();
      await event.userChoice;
      deferred = null;
      setEvent(null);
      return true;
    },
  };
}
