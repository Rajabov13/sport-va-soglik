import Link from "next/link";
import { LogoMark } from "./logo";

export function ErrorPage({ code, title, text, homeLabel, action }: { code: string; title: string; text: string; homeLabel: string; action?: React.ReactNode }) {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-16 text-center">
      <LogoMark className="mb-8 size-12" />
      <p className="bg-gradient-to-br from-primary to-accent bg-clip-text text-7xl font-extrabold tracking-tighter text-transparent sm:text-8xl">{code}</p>
      <h1 className="mt-4 text-2xl font-bold sm:text-3xl">{title}</h1>
      <p className="mt-2 max-w-md text-muted-foreground">{text}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {action}
        <Link href="/" className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90">
          {homeLabel}
        </Link>
      </div>
    </main>
  );
}
