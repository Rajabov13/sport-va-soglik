"use client";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// The event is captured by an inline script in the root layout (it can fire before React mounts).
declare global {
  interface Window {
    __qollabInstall?: BeforeInstallPromptEvent | null;
  }
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
    setEvent(window.__qollabInstall ?? null);
    const update = () => setEvent(window.__qollabInstall ?? null);
    const onInstalled = () => setInstalled(true);
    window.addEventListener("qollab-installable", update);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("qollab-installable", update);
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
      window.__qollabInstall = null;
      setEvent(null);
      return true;
    },
  };
}
