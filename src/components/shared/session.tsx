"use client";
import * as React from "react";
import type { Role } from "@prisma/client";

export interface ClientUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
  isDemo: boolean;
}

const SessionContext = React.createContext<{ user: ClientUser | null; demoMode: boolean }>({ user: null, demoMode: false });

export function SessionProvider({ user, demoMode, children }: { user: ClientUser | null; demoMode: boolean; children: React.ReactNode }) {
  const value = React.useMemo(() => ({ user, demoMode }), [user, demoMode]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return React.useContext(SessionContext);
}
