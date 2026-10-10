"use client";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function AdminToolbar({ q, onQ, placeholder, children }: { q: string; onQ: (v: string) => void; placeholder: string; children?: React.ReactNode }) {
  return (
    <div className="grid gap-2 rounded-2xl border bg-card p-3 shadow-soft sm:grid-cols-[1fr_auto_auto] sm:items-center">
      <label className="relative">
        <span className="sr-only">{placeholder}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={q} onChange={(e) => onQ(e.target.value)} placeholder={placeholder} type="search" className="pl-9" />
      </label>
      {children}
    </div>
  );
}
