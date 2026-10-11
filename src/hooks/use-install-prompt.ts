"use client";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallPlatform = "native" | "ios" | "manual";

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

function isIos() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

/**
 * PWA install support. Uses the native prompt where the browser offers one (Chrome, Edge, Samsung);
 * on iOS and other browsers without it, reports a platform so the UI can show manual steps instead.
 */
export function useInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIos());
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
  const platform: InstallPlatform = event ? "native" : ios ? "ios" : "manual";
  return {
    canInstall: !!event && !installed,
    platform,
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
