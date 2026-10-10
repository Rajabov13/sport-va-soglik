import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/** Progressive-enhancement GET search form (works without JavaScript, SSR-friendly). */
export function SearchForm({ action, q, placeholder, label, extra }: { action: string; q?: string; placeholder: string; label: string; extra?: React.ReactNode }) {
  return (
    <form action={action} method="get" role="search" className="flex flex-col gap-2 rounded-2xl border bg-card p-3 shadow-soft sm:flex-row">
      <label className="relative flex-1">
        <span className="sr-only">{label}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input name="q" defaultValue={q} placeholder={placeholder} type="search" className="pl-9" maxLength={100} />
      </label>
      {extra}
      <Button type="submit">{label}</Button>
    </form>
  );
}
